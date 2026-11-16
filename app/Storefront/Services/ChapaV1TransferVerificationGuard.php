<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Storefront\Models\StorefrontPayoutIntent;
use RuntimeException;

/**
 * Chapa v1 verification is an authenticated lookup, not a transfer receipt.
 * A terminal response must match the persisted payout before touching funds.
 */
final class ChapaV1TransferVerificationGuard
{
    /** @param array<string, mixed> $response */
    public function status(StorefrontPayoutIntent $intent, array $response): string
    {
        if (strtolower((string) ($response['status'] ?? '')) !== 'success') {
            throw new RuntimeException('Chapa did not confirm a successful transfer verification lookup.');
        }

        $data = $response['data'] ?? null;
        if (!is_array($data) || array_is_list($data)) {
            throw new RuntimeException('Chapa did not return verifiable transfer details.');
        }

        $this->assertTransferIdentity($intent, $data);
        $this->assertRecipientWhenPresent($intent, $data);

        return strtolower(trim((string) ($data['status'] ?? '')));
    }

    /** @param array<string, mixed> $data */
    private function assertTransferIdentity(StorefrontPayoutIntent $intent, array $data): void
    {
        $reference = (string) ($data['reference'] ?? $data['tx_ref'] ?? $data['merchant_reference'] ?? '');
        $amount = (string) ($data['amount'] ?? '');
        $currency = strtoupper((string) ($data['currency'] ?? ''));

        if (!hash_equals((string) $intent->merchant_reference, $reference)
            || $currency !== strtoupper((string) $intent->currency)
            || preg_match('/^\d+(?:\.\d{1,2})?$/', $amount) !== 1
            || $this->amountCents($amount) !== (int) $intent->amount_cents) {
            throw new RuntimeException('Transfer verification details do not match the approved withdrawal.');
        }
    }

    private function amountCents(string $amount): int
    {
        [$major, $minor] = array_pad(explode('.', $amount, 2), 2, '0');
        if (strlen(ltrim($major, '0')) > 16) {
            throw new RuntimeException('Chapa returned an out-of-range transfer amount.');
        }

        return ((int) $major * 100) + (int) str_pad($minor, 2, '0');
    }

    /** @param array<string, mixed> $data */
    private function assertRecipientWhenPresent(StorefrontPayoutIntent $intent, array $data): void
    {
        if (!array_key_exists('account_number', $data)) {
            return; // Chapa's v1 docs do not promise this field on verification.
        }

        $actual = $this->normalizedAccount((string) $data['account_number']);
        $expected = $this->normalizedAccount((string) $intent->destination_snapshot);

        if ($expected === '' || !hash_equals($expected, $actual)) {
            throw new RuntimeException('Chapa verified a different recipient account.');
        }
    }

    private function normalizedAccount(string $value): string
    {
        $digits = preg_replace('/[\s+\-]/', '', $value);
        if (preg_match('/^0([79]\d{8})$/', $digits ?? '', $matches)) {
            return '251'.$matches[1];
        }

        return $digits ?? '';
    }
}
