<?php

declare(strict_types=1);

namespace App\Storefront;

use App\Payments\Chapa\ChapaV1TransferClient;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Models\StorefrontPayoutIntent;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/** Chapa v1 transfer destination validation and provider dispatch. */
class ChapaPayoutService
{
    public const WALLET_CODES = ['telebirr', 'mpesa', 'yaya', 'cbebirr'];

    /** @return array<int, array<string, mixed>> */
    public function getBanks(): array
    {
        return Cache::remember('chapa:v1:transfer-banks', 1800, fn () => app(ChapaV1TransferClient::class)
            ->banks(app(LinketChapaManager::class)->platformSecret()));
    }

    public function resolveBank(string $code): array
    {
        $aliases = [
            'cbe' => 'cbe_bank',
            'boa' => 'boa_bank',
            'dashen' => 'dashen_bank',
            'awash' => 'awash_bank',
            'hibret' => 'hibret_bank',
            'wegagen' => 'wegagen_bank',
            'zemen' => 'zemen_bank',
            'yaya_wallet' => 'yaya',
            'm-pesa' => 'mpesa',
            'cbe_birr' => 'cbebirr',
        ];
        $code = strtolower(trim($code));
        $slug = $aliases[$code] ?? $code;
        foreach ($this->getBanks() as $bank) {
            if ((string) ($bank['slug'] ?? '') === $slug
                || (string) ($bank['id'] ?? '') === $code) {
                if (empty($bank['is_active']) || empty($bank['active'])
                    || strtoupper((string) ($bank['currency'] ?? '')) !== 'ETB') {
                    throw new RuntimeException('This Chapa payout destination is not available for ETB.');
                }

                return $bank;
            }
        }

        throw new RuntimeException('The selected destination is not supported by the current Chapa bank list.');
    }

    public function findBankByCode(string $code): ?array
    {
        $code = strtoupper(trim($code));
        foreach ($this->getBanks() as $bank) {
            if (!empty($bank['active']) && !empty($bank['is_active'])
                && strtoupper((string) ($bank['currency'] ?? '')) === 'ETB'
                && (strtoupper((string) ($bank['slug'] ?? '')) === $code
                    || strtoupper((string) ($bank['swift'] ?? '')) === $code
                    || (string) ($bank['id'] ?? '') === $code)) {
                return $bank;
            }
        }

        return null;
    }

    public function validateBankCode(string $code): bool
    {
        return $this->findBankByCode($code) !== null;
    }

    public function assertSufficientBalance(int $amountCents): void
    {
        $response = app(ChapaV1TransferClient::class)->balance(
            app(LinketChapaManager::class)->platformSecret(),
        );
        $balances = $response['data'] ?? null;
        if (!is_array($balances)) {
            throw new RuntimeException('Chapa did not return a valid available-balance report.');
        }

        foreach ($balances as $balance) {
            if (!is_array($balance) || strtoupper((string) ($balance['currency'] ?? '')) !== 'ETB') {
                continue;
            }

            $available = $balance['available_balance'] ?? null;
            if (!is_numeric($available) || (int) round(((float) $available) * 100) < $amountCents) {
                throw new RuntimeException('Chapa available ETB balance is insufficient for this withdrawal.');
            }

            return;
        }

        throw new RuntimeException('Chapa did not report an available ETB transfer balance.');
    }

    /** @return array<string, mixed> */
    public function createTransfer(StorefrontPayoutIntent $intent): array
    {
        $payout = $intent->payoutRequest()->with(['withdrawalMethod', 'payoutMethod'])->firstOrFail();
        $method = $payout->withdrawalMethod;
        if (!$method || !$method->is_active || !in_array($method->code, [
            'bank_transfer', ...self::WALLET_CODES,
        ], true)) {
            throw new RuntimeException('The payout method is disabled or is not supported by Chapa v1.');
        }

        if (!$payout->payoutMethod?->is_active
            || $payout->payoutMethod->status !== 'active'
            || !$payout->payoutMethod->approved_at) {
            throw new RuntimeException('Seller receiving account approval was revoked.');
        }
        $code = strtolower((string) ($payout->bank_code_snapshot ?: $method->code));
        if ($code === 'bank_transfer' || blank($payout->account_holder_snapshot)) {
            throw new RuntimeException('Payout recipient details require admin review before dispatch.');
        }

        $bank = $this->resolveBank($code);
        $accountNumber = preg_replace('/[\s+\-]/', '', (string) $intent->destination_snapshot);
        if (in_array($code, self::WALLET_CODES, true)) {
            $accountNumber = $this->normalizeMobile($accountNumber);
        }
        if (!is_string($accountNumber) || !preg_match('/^\d{8,20}$/', $accountNumber)) {
            throw new RuntimeException('Invalid payout destination; update and reapprove the receiving account.');
        }

        if (strtoupper((string) $intent->currency) !== 'ETB' || (int) $intent->amount_cents < 100) {
            throw new RuntimeException('Chapa v1 payouts require a valid ETB amount.');
        }

        return app(ChapaV1TransferClient::class)->create(
            app(LinketChapaManager::class)->platformSecret(),
            [
                'account_name' => (string) $payout->account_holder_snapshot,
                'account_number' => $accountNumber,
                'amount' => number_format(((int) $intent->amount_cents) / 100, 2, '.', ''),
                'currency' => 'ETB',
                'reference' => (string) $intent->merchant_reference,
                'bank_code' => (int) $bank['id'],
            ],
        );
    }

    /** @return array<string, mixed> */
    public function verifyTransfer(string $reference): array
    {
        return app(ChapaV1TransferClient::class)->verify(
            app(LinketChapaManager::class)->platformSecret(),
            $reference,
        );
    }

    private function normalizeMobile(string $number): string
    {
        // Chapa may render Ethiopian wallet numbers as 09xxxxxxxx or 2519xxxxxxxx.
        if (preg_match('/^0([79]\d{8})$/', $number, $matches)) {
            return '251'.$matches[1];
        }

        return $number;
    }

    /** Check callback recipient details against the immutable approved payout snapshot. */
    public function approvalMatches(StorefrontPayoutIntent $intent, array $payload): bool
    {
        $payout = $intent->payoutRequest;
        $code = strtolower((string) $payout?->bank_code_snapshot);
        $aliases = [
            'cbe' => 'cbe_bank',
            'boa' => 'boa_bank',
            'dashen' => 'dashen_bank',
            'awash' => 'awash_bank',
            'hibret' => 'hibret_bank',
            'wegagen' => 'wegagen_bank',
            'zemen' => 'zemen_bank',
            'm-pesa' => 'mpesa',
            'cbe_birr' => 'cbebirr',
        ];
        $expectedBank = $aliases[$code] ?? $code;
        $actualBank = strtolower(trim((string) ($payload['bank'] ?? '')));
        $actualNumber = preg_replace('/[\s+\-]/', '', (string) ($payload['account_number'] ?? ''));
        $expectedNumber = preg_replace('/[\s+\-]/', '', (string) $intent->destination_snapshot);
        if (in_array($code, self::WALLET_CODES, true)) {
            $actualNumber = $this->normalizeMobile($actualNumber);
            $expectedNumber = $this->normalizeMobile($expectedNumber);
        }
        $amount = (string) ($payload['amount'] ?? '');

        return $payout !== null
            && $payout->status === 'processing'
            && $payout->withdrawalMethod?->is_active
            && $payout->payoutMethod?->is_active
            && $payout->payoutMethod->status === 'active'
            && $payout->payoutMethod->approved_at !== null
            && in_array($intent->status, [
                StorefrontPayoutIntent::STATUS_SUBMITTED,
                StorefrontPayoutIntent::STATUS_PROVIDER_PENDING,
            ], true)
            && (string) ($payload['reference'] ?? '') === (string) $intent->merchant_reference
            && $expectedBank !== ''
            && hash_equals($expectedBank, $actualBank)
            && hash_equals((string) $expectedNumber, (string) $actualNumber)
            && hash_equals((string) $payout->account_holder_snapshot, (string) ($payload['account_name'] ?? ''))
            && is_numeric($amount)
            && (int) round(((float) $amount) * 100) === (int) $intent->amount_cents;
    }
}
