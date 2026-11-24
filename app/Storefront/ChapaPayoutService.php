<?php

declare(strict_types=1);

namespace App\Storefront;

use App\Payments\Chapa\ChapaV1TransferClient;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Support\EtbMajorAmount;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/** Chapa v1 transfer destination validation and provider dispatch. */
class ChapaPayoutService
{
    public const WALLET_CODES = ['telebirr', 'mpesa', 'yaya', 'cbebirr'];

    // Curated names from the Chapa v1 bank/wallet selector. These are NOT
    // a blanket availability list: the authenticated /v1/banks endpoint
    // must still return an active ETB entry for the current merchant.
    // Numeric transfer bank_code IDs are always taken from Chapa.
    public const PAYOUT_BANK_OPTIONS = [
        'awash' => ['name' => 'Awash Bank', 'type' => 'bank_transfer', 'method' => 'bank_transfer'],
        'boa' => ['name' => 'Bank of Abyssinia', 'type' => 'bank_transfer', 'method' => 'bank_transfer'],
        'cbebirr' => ['name' => 'CBEBirr', 'type' => 'cbebirr', 'method' => 'cbebirr'],
        'cbe' => ['name' => 'Commercial Bank of Ethiopia (CBE)', 'type' => 'bank_transfer', 'method' => 'bank_transfer'],
        'dashen' => ['name' => 'Dashen Bank', 'type' => 'bank_transfer', 'method' => 'bank_transfer'],
        'hibret' => ['name' => 'Hibret Bank', 'type' => 'bank_transfer', 'method' => 'bank_transfer'],
        'mpesa' => ['name' => 'M-Pesa', 'type' => 'mpesa', 'method' => 'mpesa'],
        'nib' => ['name' => 'Nib International Bank', 'type' => 'bank_transfer', 'method' => 'bank_transfer'],
        'telebirr' => ['name' => 'telebirr', 'type' => 'telebirr', 'method' => 'telebirr'],
        'yaya' => ['name' => 'YaYaWallet', 'type' => 'yaya', 'method' => 'yaya'],
        'zemen' => ['name' => 'Zemen Bank', 'type' => 'bank_transfer', 'method' => 'bank_transfer'],
    ];

    public static function canonicalBankCode(string $value): ?string
    {
        $key = strtolower((string) preg_replace('/[^a-zA-Z0-9]/', '', $value));

        return match ($key) {
            'awash', 'awashbank' => 'awash',
            'boa', 'bankofabyssinia', 'bankofabyssiniaboa', 'abyssiniabank' => 'boa',
            'cbebirr', 'cbebirrwallet' => 'cbebirr',
            'cbe', 'cbebank', 'commercialbankofethiopia', 'commercialbankofethiopiacbe' => 'cbe',
            'dashen', 'dashenbank' => 'dashen',
            'hibret', 'hibretbank', 'unitedbank', 'unitedbankethiopia' => 'hibret',
            'mpesa', 'mpesaethiopia' => 'mpesa',
            'nib', 'nibbank', 'nibinternationalbank', 'nibinternational' => 'nib',
            'telebirr', 'telebirrethio', 'telebirrethiotelecom' => 'telebirr',
            'yaya', 'yayawallet' => 'yaya',
            'zemen', 'zemenbank' => 'zemen',
            default => null,
        };
    }

    /**
     * Admin controls are per bank. The old bank_transfer method remains the
     * shared financial method/limits for existing accounts and payouts.
     * Use integer 0/1 because Settings::save removes boolean false values.
     */
    public static function bankEnabled(string $code): bool
    {
        if (!isset(self::PAYOUT_BANK_OPTIONS[$code])) {
            return false;
        }

        if (self::PAYOUT_BANK_OPTIONS[$code]['method'] !== 'bank_transfer') {
            return true; // Wallet controls continue using withdrawal-method rows.
        }

        return (int) settings('marketplace.payout_bank.'.$code.'.enabled', 1) === 1;
    }

    /**
     * Show only destinations enabled by Linket AND currently active in
     * the authenticated Chapa v1 ETB bank list. Never offer speculative banks.
     *
     * @return array<int, array{code: string, name: string, type: string, withdrawal_method_id: int}>
     */
    public function availableBankOptions(): array
    {
        $enabled = \App\Storefront\Models\DigitalProductWithdrawalMethod::query()
            ->active()->get()->keyBy('code');
        $verified = [];

        foreach ($this->getBanks() as $bank) {
            if (!is_array($bank) || empty($bank['is_active']) || empty($bank['active'])
                || strtoupper((string) ($bank['currency'] ?? '')) !== 'ETB'
                || !filter_var($bank['id'] ?? null, FILTER_VALIDATE_INT)) {
                continue;
            }

            $code = self::canonicalBankCode((string) ($bank['slug'] ?? ''))
                ?? self::canonicalBankCode((string) ($bank['name'] ?? ''));
            if ($code !== null && !isset($verified[$code])) {
                $verified[$code] = $bank;
            }
        }

        $options = [];
        foreach (self::PAYOUT_BANK_OPTIONS as $code => $option) {
            $method = $enabled->get($option['method']);
            if ($method && isset($verified[$code]) && self::bankEnabled($code)) {
                $options[] = [
                    'code' => $code,
                    'name' => $option['name'],
                    'type' => $option['type'],
                    'withdrawal_method_id' => (int) $method->id,
                ];
            }
        }

        return $options;
    }

    /** @return array<int, array<string, mixed>> */
    public function getBanks(): array
    {
        $secret = app(LinketChapaManager::class)->platformSecret();
        if (blank($secret)) {
            throw new RuntimeException('Chapa secret is not configured.');
        }

        // The active bank catalog is merchant-specific. Never reuse the cached
        // test-key result when the platform switches to a different merchant.
        $key = 'chapa:v1:transfer-banks:'.hash('sha256', $secret);

        return Cache::remember($key, 1800, fn () => app(ChapaV1TransferClient::class)
            ->banks($secret));
    }

    public function resolveBank(string $code): array
    {
        $canonical = self::canonicalBankCode($code);
        if ($canonical === null) {
            throw new RuntimeException('This destination is not part of the supported Chapa payout methods.');
        }
        if (!self::bankEnabled($canonical)) {
            throw new RuntimeException('This Chapa payout bank is disabled by the administrator.');
        }

        foreach ($this->getBanks() as $bank) {
            if (!is_array($bank)) {
                continue;
            }

            $providerCode = self::canonicalBankCode((string) ($bank['slug'] ?? ''))
                ?? self::canonicalBankCode((string) ($bank['name'] ?? ''));
            if ($providerCode !== $canonical) {
                continue;
            }

            if (empty($bank['is_active']) || empty($bank['active'])
                || strtoupper((string) ($bank['currency'] ?? '')) !== 'ETB'
                || !filter_var($bank['id'] ?? null, FILTER_VALIDATE_INT)) {
                throw new RuntimeException('This Chapa payout destination is not available for ETB.');
            }

            return $bank;
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
            $availableCents = EtbMajorAmount::cents($available);
            if ($availableCents === null) {
                throw new RuntimeException('Chapa returned an invalid available ETB balance.');
            }
            if ($availableCents < $amountCents) {
                throw new RuntimeException('Chapa available ETB balance is insufficient for this withdrawal.');
            }

            return;
        }

        throw new RuntimeException('Chapa did not report an available ETB transfer balance.');
    }

    /** @return array<string, mixed> */
    public function createTransfer(StorefrontPayoutIntent $intent): array
    {
        app(\App\Storefront\Services\ChapaV1PayoutMode::class)->assertDispatchReady();
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
            app(\App\Storefront\Services\ChapaV1PayoutMode::class)->withTestStatus([
                'account_name' => (string) $payout->account_holder_snapshot,
                'account_number' => $accountNumber,
                'amount' => number_format(((int) $intent->amount_cents) / 100, 2, '.', ''),
                'currency' => 'ETB',
                'reference' => (string) $intent->merchant_reference,
                'bank_code' => (int) $bank['id'],
            ]),
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

    private function normalizeTelebirrName(string $name): string
    {
        $collapsed = preg_replace('/\s+/u', ' ', $name);

        return mb_strtolower(trim($collapsed ?? $name), 'UTF-8');
    }

    /** Check callback recipient details against the immutable approved payout snapshot. */
    public function approvalMatches(StorefrontPayoutIntent $intent, array $payload): bool
    {
        return $this->approvalMismatchReason($intent, $payload) === null;
    }

    /** @param array<string, mixed> $payload */
    public function approvalMismatchReason(StorefrontPayoutIntent $intent, array $payload): ?string
    {
        $payout = $intent->payoutRequest;
        if ($payout === null || $payout->status !== 'processing') {
            return 'withdrawal_not_processing';
        }
        if (!$payout->withdrawalMethod?->is_active) {
            return 'withdrawal_method_inactive';
        }
        $account = $payout->payoutMethod;
        if (!$account?->is_active || $account->status !== 'active' || $account->approved_at === null) {
            return 'payout_account_unavailable';
        }
        if (!in_array($intent->status, [
            StorefrontPayoutIntent::STATUS_SUBMITTED,
            StorefrontPayoutIntent::STATUS_PROVIDER_PENDING,
        ], true)) {
            return 'intent_not_submitted';
        }
        if ((string) ($payload['reference'] ?? '') !== (string) $intent->merchant_reference) {
            return 'reference_mismatch';
        }

        $code = strtolower((string) $payout->bank_code_snapshot);
        $expectedBank = self::canonicalBankCode($code);
        $actualBank = strtolower(trim((string) ($payload['bank'] ?? '')));
        if ($expectedBank === null || self::canonicalBankCode($actualBank) !== $expectedBank) {
            return 'bank_mismatch';
        }
        $actualNumber = preg_replace('/[\s+\-]/', '', (string) ($payload['account_number'] ?? ''));
        $expectedNumber = preg_replace('/[\s+\-]/', '', (string) $intent->destination_snapshot);
        if (in_array($code, self::WALLET_CODES, true)) {
            $actualNumber = $this->normalizeMobile($actualNumber);
            $expectedNumber = $this->normalizeMobile($expectedNumber);
        }
        if (!hash_equals((string) $expectedNumber, (string) $actualNumber)) {
            return 'account_number_mismatch';
        }
        $accountName = (string) ($payload['account_name'] ?? '');
        $expectedName = (string) $payout->account_holder_snapshot;
        $isWallet = in_array($code, self::WALLET_CODES, true);
        if ($isWallet) {
            $accountName = $this->normalizeTelebirrName($accountName);
            $expectedName = $this->normalizeTelebirrName($expectedName);
        }
        if ((!$isWallet || $accountName !== '')
            && !hash_equals($expectedName, $accountName)) {
            return 'account_name_mismatch';
        }
        $amountCents = EtbMajorAmount::cents($payload['amount'] ?? null);
        if ($amountCents === null || $amountCents !== (int) $intent->amount_cents) {
            return 'amount_mismatch';
        }

        return null;
    }
}
