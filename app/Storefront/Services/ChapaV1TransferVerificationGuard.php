<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Support\EtbMajorAmount;
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
        $data = self::verifiedTransferDetails($response);
        $this->assertTransferIdentity($intent, $data);
        $this->assertRecipientWhenPresent($intent, $data);

        return strtolower(trim((string) ($data['status'] ?? '')));
    }

    /**
     * Chapa v1 may wrap one transfer record in a one-element data array,
     * or return the raw queued reference string for in-flight test transfers.
     *
     * @param array<string, mixed> $response
     * @return array<string, mixed>
     */
    public static function verifiedTransferDetails(array $response): array
    {
        if (strtolower((string) ($response['status'] ?? '')) !== 'success') {
            throw new RuntimeException('Chapa did not confirm a successful transfer verification lookup.');
        }

        $data = self::unwrapSingleRecord($response['data'] ?? null);

        if (is_string($data) && trim($data) !== '') {
            return [
                'reference' => trim($data),
                'status' => 'queued',
            ];
        }

        if (!is_array($data) || array_is_list($data)) {
            throw new RuntimeException('Chapa did not return verifiable transfer details.');
        }

        return $data;
    }

    private static function unwrapSingleRecord(mixed $data): mixed
    {
        while (is_array($data) && array_is_list($data)) {
            if (count($data) !== 1) {
                throw new RuntimeException('Chapa did not return one unambiguous transfer record.');
            }
            $data = $data[0];
        }

        return $data;
    }

    /** @param array<string, mixed> $data */
    private function assertTransferIdentity(StorefrontPayoutIntent $intent, array $data): void
    {
        $reference = (string) ($data['reference'] ?? $data['tx_ref'] ?? $data['merchant_reference'] ?? '');
        if (!hash_equals((string) $intent->merchant_reference, $reference)) {
            throw new RuntimeException('Transfer verification details do not match the approved withdrawal.');
        }

        $status = strtolower(trim((string) ($data['status'] ?? '')));
        $amount = (string) ($data['amount'] ?? '');
        $currency = strtoupper((string) ($data['currency'] ?? ''));

        if (in_array($status, ['pending', 'queued', 'processing'], true) && $amount === '' && $currency === '') {
            return;
        }

        if ($currency !== strtoupper((string) $intent->currency)
            || EtbMajorAmount::cents($amount) !== (int) $intent->amount_cents) {
            throw new RuntimeException('Transfer verification details do not match the approved withdrawal.');
        }
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
