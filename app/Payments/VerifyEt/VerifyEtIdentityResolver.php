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

        if (!$this->hasRequiredCbeReceiptIdentity($item, ['code' => $bank])) {
            return null;
        }

        $fields = $this->candidateFieldsForBank(['code' => $bank]);
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
     * @param array{expected: string, actual: string, bank: string} $accounts
     */
    public function accountMatches(array $accounts): bool
    {
        $expected = (string) ($accounts['expected'] ?? '');
        $actual = (string) ($accounts['actual'] ?? '');
        if (str_contains($actual, '*') || str_contains($actual, '•')) {
            return false;
        }

        if (str_contains($expected, '*') || str_contains($expected, '•')) {
            return false;
        }

        $normalizedExpected = $this->normalizeSettlementAccount([
            'number' => $expected,
            'bank' => (string) ($accounts['bank'] ?? ''),
        ]);
        $normalizedActual = $this->normalizeSettlementAccount([
            'number' => $actual,
            'bank' => (string) ($accounts['bank'] ?? ''),
        ]);

        if ($normalizedExpected === '') {
            return false;
        }

        return hash_equals($normalizedExpected, $normalizedActual);
    }

    /**
     * Normalize settlement phone number or account number.
     *
     * @param array{number: string, bank: string} $account
     */
    public function normalizeSettlementAccount(array $account): string
    {
        $cleaned = strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', (string) ($account['number'] ?? '')));
        $bank = strtolower((string) ($account['bank'] ?? ''));
        if (!in_array($bank, ['telebirr', 'mpesa', 'cbebirr'], true)) {
            return $cleaned;
        }

        if (preg_match('/^0([79][0-9]{8})$/', $cleaned, $parts) === 1) {
            return '251'.$parts[1];
        }

        if (preg_match('/^251([79][0-9]{8})$/', $cleaned, $parts) === 1) {
            return '251'.$parts[1];
        }

        return $cleaned;
    }

    /**
     * @param array<string, mixed> $item
     * @param array{code: string} $bank
     */
    private function hasRequiredCbeReceiptIdentity(array $item, array $bank): bool
    {
        if (($bank['code'] ?? '') !== 'cbe') {
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
     * @param array{code: string} $bank
     * @return list<string>
     */
    private function candidateFieldsForBank(array $bank): array
    {
        return match ($bank['code']) {
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
}
