<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\ChapaPayoutService;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontPayoutIntent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Nateyk\Chapa\Dto\PayoutStatus;
use RuntimeException;

final class StorefrontPayoutProcessingService
{
    public function __construct(
        private readonly ?LinketChapaManager $chapaManager = null,
        private readonly ?StorefrontPaymentReferenceGenerator $referenceGenerator = null,
        private readonly ?CreatorLedgerService $creatorLedger = null,
        private readonly ?ChapaPayoutService $chapaPayoutService = null,
    ) {
    }

    /**
     * Prepares or reuses a durable payout intent with stable reference and idempotency key (FIN-03).
     */
    public function prepareIntent(PayoutRequest $payout, string $withdrawalCode = 'bank_transfer'): StorefrontPayoutIntent
    {
        $existing = StorefrontPayoutIntent::query()
            ->where('payout_request_id', $payout->id)
            ->whereIn('status', [
                StorefrontPayoutIntent::STATUS_PREPARED,
                StorefrontPayoutIntent::STATUS_SUBMITTED,
                StorefrontPayoutIntent::STATUS_PROVIDER_PENDING,
            ])
            ->first();

        if ($existing) {
            return $existing;
        }

        $reference = $this->refGenerator()->generate('po');
        $idempotencyKey = (string) Str::uuid();

        return StorefrontPayoutIntent::query()->create([
            'payout_request_id' => $payout->id,
            'merchant_reference' => $reference,
            'idempotency_key' => $idempotencyKey,
            'amount_cents' => (int) $payout->amount_cents,
            'currency' => (string) ($payout->currency ?: 'ETB'),
            'provider' => 'chapa',
            'withdrawal_code' => $withdrawalCode,
            'destination_snapshot' => (string) $payout->payout_destination,
            'status' => StorefrontPayoutIntent::STATUS_PREPARED,
        ]);
    }

    /**
     * Submits transfer to Chapa outside open database transaction (FIN-02, FIN-03).
     */
    public function submitPayout(StorefrontPayoutIntent $intent): StorefrontPayoutIntent
    {
        $account = $this->resolveAccountPayload($intent);
        $payload = [
            'amount' => (int) $intent->amount_cents,
            'currency' => (string) $intent->currency,
            'merchant_reference' => $intent->merchant_reference,
            'account' => $account,
            'reason' => "Payout #{$intent->payout_request_id}",
        ];

        try {
            $initiation = $this->manager()->platformClient()->payouts()->createTyped(
                $payload,
                $intent->idempotency_key
            );

            $newStatus = $initiation->status->requiresAction()
                ? StorefrontPayoutIntent::STATUS_REQUIRES_ACTION
                : StorefrontPayoutIntent::STATUS_PROVIDER_PENDING;

            $intent->update([
                'status' => $newStatus,
                'chapa_reference' => $initiation->chapaReference,
            ]);

            $intent->payoutRequest()->update([
                'status' => 'processing',
                'transfer_reference' => $intent->merchant_reference,
            ]);

            return $intent->fresh();
        } catch (\Throwable $e) {
            Log::error('store.payout.submit_failed', [
                'intent_id' => $intent->id,
                'reference' => $intent->merchant_reference,
                'error' => $e->getMessage(),
            ]);

            $intent->update([
                'status' => StorefrontPayoutIntent::STATUS_FAILED,
                'last_error' => $e->getMessage(),
            ]);

            return $intent->fresh();
        }
    }

    /**
     * Verifies transfer settlement with Chapa before extinguishing creator liability (FIN-02).
     */
    public function verifyPayout(StorefrontPayoutIntent $intent): StorefrontPayoutIntent
    {
        $verified = $this->manager()->platformClient()->payouts()->verifyTyped($intent->merchant_reference);

        if ($verified->matchesPayout($intent->amount_cents, $intent->currency, $intent->merchant_reference)) {
            return DB::transaction(function () use ($intent, $verified): StorefrontPayoutIntent {
                $intent->update([
                    'status' => StorefrontPayoutIntent::STATUS_SUCCESSFUL,
                    'verified_at' => now(),
                    'verification_data' => $verified->raw,
                ]);

                $payout = $intent->payoutRequest()->lockForUpdate()->firstOrFail();
                $payout->update([
                    'status' => 'paid',
                    'paid_at' => now(),
                    'transfer_reference' => $intent->merchant_reference,
                ]);

                $this->ledger()->disbursePayout($payout);

                return $intent->fresh();
            });
        }

        if ($verified->payoutStatus() === PayoutStatus::FAILED || $verified->payoutStatus() === PayoutStatus::REVERSED) {
            return DB::transaction(function () use ($intent, $verified): StorefrontPayoutIntent {
                $intent->update([
                    'status' => StorefrontPayoutIntent::STATUS_FAILED,
                    'verified_at' => now(),
                    'verification_data' => $verified->raw,
                ]);

                $payout = $intent->payoutRequest()->lockForUpdate()->firstOrFail();
                $payout->update([
                    'status' => 'rejected',
                    'rejected_at' => now(),
                    'rejection_reason' => 'Transfer failed at Chapa settlement.',
                ]);

                $this->ledger()->releasePayoutReservation($payout);

                return $intent->fresh();
            });
        }

        return $intent;
    }

    /**
     * @return array{account_name: string, account_number: string, bank_slug: string}
     */
    private function resolveAccountPayload(StorefrontPayoutIntent $intent): array
    {
        $destination = (string) $intent->destination_snapshot;
        $withdrawalCode = $intent->withdrawal_code;

        if ($withdrawalCode === 'telebirr') {
            return [
                'account_name' => 'Creator',
                'account_number' => $this->extractPhoneNumber($destination),
                'bank_slug' => 'telebirr',
            ];
        }

        $bankCode = $this->extractBankCode($destination);
        $accountNumber = $this->extractAccountNumber($destination);

        return [
            'account_name' => 'Creator',
            'account_number' => $accountNumber,
            'bank_slug' => strtolower($bankCode ?? 'cbe'),
        ];
    }

    private function extractBankCode(string $destination): ?string
    {
        if (str_contains($destination, ':')) {
            [$bankCode] = explode(':', $destination, 2);
            return strtoupper(trim($bankCode));
        }

        return null;
    }

    private function extractAccountNumber(string $destination): string
    {
        if (str_contains($destination, ':')) {
            [$bankCode, $accountNumber] = explode(':', $destination, 2);
            return trim($accountNumber);
        }

        return $destination;
    }

    private function extractPhoneNumber(string $destination): string
    {
        return preg_replace('/\D/', '', $destination) ?: $destination;
    }

    private function manager(): LinketChapaManager
    {
        return $this->chapaManager ?? app(LinketChapaManager::class);
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
