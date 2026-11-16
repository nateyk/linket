<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\ChapaPayoutService;
use App\Storefront\DigitalProductFinance;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontPayoutIntent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Chapa v1: admin approval -> durable transfer reference -> provider queue
 * -> verification -> exactly-once ledger settlement. Never retry uncertain requests.
 */
final class StorefrontPayoutProcessingService
{
    public function __construct(
        private readonly ?LinketChapaManager $chapaManager = null,
        private readonly ?StorefrontPaymentReferenceGenerator $referenceGenerator = null,
        private readonly ?CreatorLedgerService $creatorLedger = null,
        private readonly ?ChapaPayoutService $chapaPayoutService = null,
    ) {}

    public function prepareIntent(PayoutRequest $payout, string $withdrawalCode = 'bank_transfer'): StorefrontPayoutIntent
    {
        return DB::transaction(function () use ($payout, $withdrawalCode): StorefrontPayoutIntent {
            $locked = PayoutRequest::query()->lockForUpdate()->findOrFail($payout->id);
            if ($locked->status !== 'processing') {
                throw new RuntimeException('Withdrawal requires administrator approval.');
            }
            // No replacement reference after failure or timeout; investigate with Chapa first.
            $existing = StorefrontPayoutIntent::query()->where('payout_request_id', $locked->id)->first();
            if ($existing) {
                return $existing;
            }

            return StorefrontPayoutIntent::query()->create([
                'payout_request_id' => $locked->id,
                'merchant_reference' => $this->refGenerator()->generate('po'),
                'idempotency_key' => (string) Str::uuid(),
                'amount_cents' => (int) $locked->amount_cents,
                'currency' => strtoupper((string) ($locked->currency ?: 'ETB')),
                'provider' => 'chapa',
                'withdrawal_code' => $withdrawalCode,
                'destination_snapshot' => (string) $locked->payout_destination,
                'status' => StorefrontPayoutIntent::STATUS_PREPARED,
            ]);
        });
    }

    public function submitPayout(StorefrontPayoutIntent $intent): StorefrontPayoutIntent
    {
        $shouldSend = DB::transaction(function () use ($intent): bool {
            $locked = StorefrontPayoutIntent::query()->lockForUpdate()->findOrFail($intent->id);
            if ($locked->status !== StorefrontPayoutIntent::STATUS_PREPARED) {
                return false;
            }
            if ($locked->payoutRequest()->value('status') !== 'processing') {
                throw new RuntimeException('Withdrawal is not approved for transfer.');
            }
            // Committed before the HTTP call. A timeout is an uncertain submission,
            // NOT a reason to generate a new reference and send a second payment.
            $locked->update([
                'status' => StorefrontPayoutIntent::STATUS_SUBMITTED,
                'attempts' => ((int) $locked->attempts) + 1,
            ]);

            return true;
        });

        if (!$shouldSend) {
            return $intent->fresh();
        }

        try {
            $result = $this->provider()->createTransfer($intent->fresh());
            $intent->update([
                'status' => StorefrontPayoutIntent::STATUS_PROVIDER_PENDING,
                'chapa_reference' => is_string($result['data'] ?? null) ? $result['data'] : $intent->merchant_reference,
                'last_error' => null,
            ]);
            $intent->payoutRequest()->update(['transfer_reference' => $intent->merchant_reference]);

            return $intent->fresh();
        } catch (\Throwable $e) {
            Log::warning('store.payout.chapa_v1_submission_uncertain', [
                'intent_id' => $intent->id,
                'reference' => $intent->merchant_reference,
                'exception_type' => get_class($e),
            ]);
            $intent->update([
                // Keep submitted. The provider might have queued it before an HTTP failure.
                'last_error' => 'Submission not confirmed. Verify this reference with Chapa before further action.',
            ]);

            return $intent->fresh();
        }
    }

    public function verifyPayout(StorefrontPayoutIntent $intent): StorefrontPayoutIntent
    {
        if ($intent->status === StorefrontPayoutIntent::STATUS_PREPARED) {
            throw new RuntimeException('Transfer has not been submitted.');
        }

        $raw = $this->provider()->verifyTransfer((string) $intent->merchant_reference);
        $data = $raw['data'] ?? null;
        if (!is_array($data)) {
            throw new RuntimeException('Chapa did not return verifiable transfer details.');
        }

        $reference = (string) ($data['reference'] ?? $data['tx_ref'] ?? $data['merchant_reference'] ?? '');
        $amount = (string) ($data['amount'] ?? '');
        $currency = strtoupper((string) ($data['currency'] ?? ''));
        if (!hash_equals((string) $intent->merchant_reference, $reference)
            || $currency !== strtoupper((string) $intent->currency)
            || !preg_match('/^\d+(?:\.\d{1,2})?$/', $amount)
            || (int) round(((float) $amount) * 100) !== (int) $intent->amount_cents) {
            throw new RuntimeException('Transfer verification details do not match the approved withdrawal.');
        }

        $status = strtolower((string) ($data['status'] ?? ''));
        if (in_array($status, ['success', 'successful', 'completed', 'paid'], true)) {
            return $this->settle($intent, $raw);
        }
        if (in_array($status, ['failed', 'reversed', 'rejected'], true)) {
            return $this->releaseFailed($intent, $raw);
        }

        return $intent->fresh();
    }

    private function settle(StorefrontPayoutIntent $intent, array $raw): StorefrontPayoutIntent
    {
        return DB::transaction(function () use ($intent, $raw): StorefrontPayoutIntent {
            $intent = StorefrontPayoutIntent::query()->lockForUpdate()->findOrFail($intent->id);
            $payout = $intent->payoutRequest()->lockForUpdate()->firstOrFail();

            if ($payout->status === 'paid' && $intent->status === StorefrontPayoutIntent::STATUS_SUCCESSFUL) {
                return $intent;
            }
            if ($payout->status !== 'processing' || $intent->status === StorefrontPayoutIntent::STATUS_FAILED) {
                throw new RuntimeException('Settlement conflicts with the existing withdrawal state.');
            }

            $intent->update([
                'status' => StorefrontPayoutIntent::STATUS_SUCCESSFUL,
                'verified_at' => now(),
                'verification_data' => $raw,
            ]);
            $payout->update([
                'status' => 'paid',
                'paid_at' => now(),
                'transfer_reference' => $intent->merchant_reference,
            ]);
            $this->ledger()->disbursePayout($payout);

            return $intent->fresh();
        });
    }

    private function releaseFailed(StorefrontPayoutIntent $intent, array $raw): StorefrontPayoutIntent
    {
        return DB::transaction(function () use ($intent, $raw): StorefrontPayoutIntent {
            $intent = StorefrontPayoutIntent::query()->lockForUpdate()->findOrFail($intent->id);
            $payout = $intent->payoutRequest()->lockForUpdate()->firstOrFail();
            if ($payout->status === 'paid' || $intent->status === StorefrontPayoutIntent::STATUS_SUCCESSFUL) {
                throw new RuntimeException('A settled payout requires manual reconciliation before its balance can change.');
            }
            if ($intent->status === StorefrontPayoutIntent::STATUS_FAILED) {
                return $intent;
            }
            if ($payout->status !== 'processing') {
                throw new RuntimeException('Withdrawal has an unexpected state.');
            }

            $intent->update([
                'status' => StorefrontPayoutIntent::STATUS_FAILED,
                'verified_at' => now(),
                'verification_data' => $raw,
            ]);
            $payout->update([
                'status' => 'rejected',
                'rejected_at' => now(),
                'rejection_reason' => 'Chapa verified the transfer was unsuccessful.',
            ]);
            app(DigitalProductFinance::class)->record(
                $payout->workspace_id,
                $payout->creator_id,
                "payout-release:{$payout->id}",
                'payout_released',
                $payout->amount_cents,
                $payout->currency,
                ['payout_request_id' => $payout->id, 'description' => 'Chapa transfer failed'],
            );
            $this->ledger()->releasePayoutReservation($payout);

            return $intent->fresh();
        });
    }

    private function provider(): ChapaPayoutService
    {
        return $this->chapaPayoutService ?? app(ChapaPayoutService::class);
    }

    private function refGenerator(): StorefrontPaymentReferenceGenerator
    {
        return $this->referenceGenerator ?? app(StorefrontPaymentReferenceGenerator::class);
    }

    private function ledger(): CreatorLedgerService
    {
        return $this->creatorLedger ?? app(CreatorLedgerService::class);
    }
}
