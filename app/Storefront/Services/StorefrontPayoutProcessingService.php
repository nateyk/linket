<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Payments\Chapa\Exceptions\ChapaTransferRejectedException;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\ChapaPayoutService;
use App\Storefront\DigitalProductFinance;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Notifications\ChapaPayoutStatusNotification;
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
                'merchant_reference' => $this->generatePayoutReference(),
                'idempotency_key' => (string) Str::uuid(),
                'amount_cents' => (int) $locked->amount_cents,
                'currency' => strtoupper((string) ($locked->currency ?: 'ETB')),
                'provider' => 'chapa',
                'withdrawal_code' => $withdrawalCode,
                'destination_snapshot' => (string) $locked->payout_destination,
                'status' => StorefrontPayoutIntent::STATUS_PREPARED,
                'attempts' => 0,
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
            $providerReference = $this->queuedProviderReference($result);
            $this->assertValidSubmissionResponse($intent, $result, $providerReference);

            $intent->update([
                'status' => StorefrontPayoutIntent::STATUS_PROVIDER_PENDING,
                'chapa_reference' => $providerReference,
                'last_error' => null,
            ]);
            $intent->payoutRequest()->update(['transfer_reference' => $intent->merchant_reference]);

            return $intent->fresh();
        } catch (ChapaTransferRejectedException $e) {
            Log::notice('store.payout.chapa_v1_submission_rejected', [
                'intent_id' => $intent->id,
                'reference' => $intent->merchant_reference,
                'http_status' => $e->httpStatus,
                'provider_message' => $e->providerMessage,
            ]);

            return $this->releaseRejectedSubmission($intent, $e);
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

        $reference = (string) ($intent->merchant_reference ?: $intent->chapa_reference);
        $raw = $this->provider()->verifyTransfer($reference);
        $status = app(ChapaV1TransferVerificationGuard::class)->status($intent, $raw);
        if (in_array($status, ['success', 'successful', 'completed', 'paid'], true)) {
            return $this->settle($intent, $raw);
        }
        if (in_array($status, ['failed', 'failed/cancelled', 'reversed', 'rejected'], true)) {
            return $this->releaseFailed($intent, $raw);
        }
        if (in_array($status, ['pending', 'queued', 'processing'], true)) {
            return $this->recordPendingVerification($intent, $raw);
        }

        return $intent->fresh();
    }

    private function recordPendingVerification(StorefrontPayoutIntent $intent, array $raw): StorefrontPayoutIntent
    {
        return DB::transaction(function () use ($intent, $raw): StorefrontPayoutIntent {
            $intent = StorefrontPayoutIntent::query()->lockForUpdate()->findOrFail($intent->id);
            $payout = $intent->payoutRequest()->lockForUpdate()->firstOrFail();
            if ($payout->status !== 'processing' || !$intent->isPending()) {
                return $intent;
            }

            $chapaRef = $this->resolveChapaReference($intent, $raw);

            // Chapa verified the reference but has not confirmed settlement.
            // Clear uncertainty without releasing or disbursing creator funds.
            $intent->update([
                'status' => StorefrontPayoutIntent::STATUS_PROVIDER_PENDING,
                'chapa_reference' => $chapaRef ?? $intent->chapa_reference,
                'last_error' => null,
                'verified_at' => now(),
                'verification_data' => $raw,
            ]);

            return $intent->fresh();
        });
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

            $alreadyPaid = $payout->status === 'paid';

            $chapaRef = $this->resolveChapaReference($intent, $raw);

            $intent->update([
                'status' => StorefrontPayoutIntent::STATUS_SUCCESSFUL,
                'chapa_reference' => $chapaRef ?? $intent->chapa_reference,
                'last_error' => null,
                'verified_at' => now(),
                'verification_data' => $raw,
            ]);
            $payout->update([
                'status' => 'paid',
                'paid_at' => now(),
                'transfer_reference' => $intent->merchant_reference,
            ]);
            $this->ledger()->disbursePayout($payout);
            if (! $alreadyPaid) {
                ChapaPayoutStatusNotification::notifyCreator($payout, 'sent');
            }

            return $intent->fresh();
        });
    }

    private function releaseFailed(StorefrontPayoutIntent $intent, array $raw): StorefrontPayoutIntent
    {
        return $this->rejectAndRelease(
            $intent,
            $raw,
            'Chapa verified the transfer was unsuccessful.',
        );
    }

    private function releaseRejectedSubmission(
        StorefrontPayoutIntent $intent,
        ChapaTransferRejectedException $exception,
    ): StorefrontPayoutIntent {
        return $this->rejectAndRelease($intent, $exception->evidence(), $exception->publicReason());
    }

    /** @param array<string, mixed> $evidence */
    private function rejectAndRelease(
        StorefrontPayoutIntent $intent,
        array $evidence,
        string $reason,
    ): StorefrontPayoutIntent {
        return DB::transaction(function () use ($intent, $evidence, $reason): StorefrontPayoutIntent {
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
                'last_error' => $reason,
                'verified_at' => now(),
                'verification_data' => $evidence,
            ]);
            $alreadyRejected = $payout->status === 'rejected';
            $payout->update([
                'status' => 'rejected',
                'rejected_at' => now(),
                'rejection_reason' => $reason,
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
            if (! $alreadyRejected) {
                ChapaPayoutStatusNotification::notifyCreator($payout, 'failed');
            }

            return $intent->fresh();
        });
    }

    /** @param array<string, mixed> $raw */
    private function resolveChapaReference(StorefrontPayoutIntent $intent, array $raw): ?string
    {
        if ($intent->chapa_reference) {
            return $intent->chapa_reference;
        }

        $transferId = data_get($raw, 'data.chapa_transfer_id');
        if (is_string($transferId) && $transferId !== '') {
            return $transferId;
        }

        $reference = (string) data_get($raw, 'data.reference', '');
        if (str_starts_with($reference, 'CT')) {
            return $reference;
        }

        return null;
    }

    /** @param array<string, mixed> $response */
    private function queuedProviderReference(array $response): ?string
    {
        $data = $response['data'] ?? null;
        if (is_string($data)) {
            return $this->nonEmptyString($data);
        }

        if (!is_array($data)) {
            return null;
        }

        foreach (['chapa_transfer_id', 'reference', 'id', 'tx_ref'] as $key) {
            $value = $this->nonEmptyString($data[$key] ?? null);
            if ($value !== null) {
                return $value;
            }
        }

        return null;
    }

    private function nonEmptyString(mixed $value): ?string
    {
        if (!is_string($value) && !is_numeric($value)) {
            return null;
        }

        $trimmed = trim((string) $value);

        return $trimmed !== '' ? $trimmed : null;
    }

    /** @param array<string, mixed> $result */
    private function assertValidSubmissionResponse(
        StorefrontPayoutIntent $intent,
        array $result,
        ?string $providerReference,
    ): void {
        if ($providerReference === null || $providerReference === '') {
            throw new RuntimeException('Chapa did not return a transfer reference.');
        }

        $data = $result['data'] ?? null;

        if (is_array($data)) {
            $merchantRef = (string) ($data['tx_ref'] ?? $data['merchant_reference'] ?? '');
            if ($merchantRef !== '' && !hash_equals((string) $intent->merchant_reference, $merchantRef)) {
                throw new RuntimeException('Chapa returned a mismatched merchant transfer reference.');
            }

            return;
        }

        $matchesMerchant = hash_equals((string) $intent->merchant_reference, $providerReference);
        $isChapaTransferId = str_starts_with($providerReference, 'CT');

        if (!$matchesMerchant && !$isChapaTransferId) {
            throw new RuntimeException('Chapa did not return the submitted transfer reference.');
        }
    }

    private function provider(): ChapaPayoutService
    {
        return $this->chapaPayoutService ?? app(ChapaPayoutService::class);
    }

    private function generatePayoutReference(): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $reference = 'lk-po-'.Str::random(12);
            if (!StorefrontPayoutIntent::query()->where('merchant_reference', $reference)->exists()) {
                return $reference;
            }
        }

        throw new RuntimeException('Unable to allocate a unique payout transfer reference.');
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
