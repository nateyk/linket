<?php

namespace App\Payments\VerifyEt;

final class VerifyEtIdentityResolver
{
    /**
     * Resolve the canonical transaction identity from provider evidence.
     *
     * @param array<string, mixed> $item
     */
    public function canonicalIdentity(array $item, string $bank): ?string
    {
        $bank = strtolower($bank);

        if (!$this->hasRequiredCbeReceiptIdentity($item, $bank)) {
            return null;
        }

        $fields = $this->candidateFieldsForBank($bank);
        $identities = $this->extractCanonicalIdentities($item, $fields);

        if ($identities === null) {
            return null;
        }

        if ($bank !== 'cbe' && count(array_unique($identities)) > 1) {
            return null;
        }

        return $identities[0] ?? null;
    }

    /**
     * Strip non-alphanumeric characters and uppercase.
     */
    public function canonical(string $value): string
    {
        return strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $value));
    }

    /**
     * Check whether actual received settlement account matches expected account.
     */
    public function accountMatches(string $expected, string $actual, string $bank): bool
    {
        if ($this->isMaskedAccount($actual) || $this->isMaskedAccount($expected)) {
            return false;
        }

        $normalizedExpected = $this->normalizeSettlementAccount($expected, $bank);
        $normalizedActual = $this->normalizeSettlementAccount($actual, $bank);

        return $normalizedExpected !== '' && hash_equals($normalizedExpected, $normalizedActual);
    }

    /**
     * Normalize settlement phone number or account number.
     */
    public function normalizeSettlementAccount(string $account, string $bank): string
    {
        $cleaned = strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $account));

        if (in_array(strtolower($bank), ['telebirr', 'mpesa', 'cbebirr'], true)) {
            if (preg_match('/^0([79][0-9]{8})$/', $cleaned, $parts)) {
                return '251' . $parts[1];
            }
            if (preg_match('/^251([79][0-9]{8})$/', $cleaned, $parts)) {
                return '251' . $parts[1];
            }
        }

        return $cleaned;
    }

    /**
     * @param array<string, mixed> $item
     */
    private function hasRequiredCbeReceiptIdentity(array $item, string $bank): bool
    {
        if ($bank !== 'cbe') {
            return true;
        }

        $receiptNumber = $item['receiptNumber'] ?? null;
        if (is_string($receiptNumber) && $receiptNumber !== '') {
            return true;
        }

        $receiptId = $item['referenceNumber'] ?? $item['reference'] ?? null;
        return is_string($receiptId) && $receiptId !== '';
    }

    /**
     * @return list<string>
     */
    private function candidateFieldsForBank(string $bank): array
    {
        return match ($bank) {
            'telebirr', 'mpesa' => ['transactionNumber', 'referenceNumber', 'receiptNumber', 'reference'],
            'cbe', 'cbebirr' => ['receiptNumber', 'referenceNumber', 'transactionNumber', 'reference'],
            default => ['referenceNumber', 'receiptNumber', 'transactionNumber', 'reference'],
        };
    }

    /**
     * @param array<string, mixed> $item
     * @param list<string> $fields
     * @return list<string>|null
     */
    private function extractCanonicalIdentities(array $item, array $fields): ?array
    {
        $identities = [];
        foreach ($fields as $field) {
            $value = $item[$field] ?? null;
            if (is_string($value) && $value !== '') {
                $canonical = $this->canonical($value);
                if ($canonical === '') {
                    return null;
                }
                $identities[] = $canonical;
            }
        }

        return $identities;
    }

    private function isMaskedAccount(string $value): bool
    {
        return str_contains($value, '*') || str_contains($value, '•');
    }
}
