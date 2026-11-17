<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use InvalidArgumentException;
use JsonException;

final class MarketplaceProviderEvidence
{
    private const GROUPS = [
        'chapa_payments',
        'chapa_refunds',
        'chapa_payouts',
        'verify_et_verifications',
    ];

    /** @var array<string, array<string, array{amount_cents: int, currency: string, status: string}>> */
    private array $records = [];

    /** @var array<string, array<string, true>> */
    private array $matched = [];

    private function __construct()
    {
    }

    public static function fromPath(string $path): self
    {
        if (!is_file($path) || !is_readable($path) || filesize($path) > 16777216) {
            throw new InvalidArgumentException('Provider evidence file is missing, unreadable, or larger than 16 MiB.');
        }

        try {
            $input = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new InvalidArgumentException('Provider evidence must be valid JSON.');
        }

        if (!is_array($input) || ($input['schema_version'] ?? null) !== 1
            || ($input['scope'] ?? null) !== 'complete_marketplace_history') {
            throw new InvalidArgumentException('Provider evidence must declare schema_version 1 and complete marketplace scope.');
        }

        $evidence = new self();
        foreach (self::GROUPS as $group) {
            if (!isset($input[$group]) || !is_array($input[$group]) || !array_is_list($input[$group])) {
                throw new InvalidArgumentException("Provider evidence is missing the {$group} list.");
            }
            $evidence->records[$group] = self::validateRows($input[$group], $group);
            $evidence->matched[$group] = [];
        }

        return $evidence;
    }

    /** @param array<int, mixed> $rows */
    private static function validateRows(array $rows, string $group): array
    {
        $indexed = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                throw new InvalidArgumentException("Invalid {$group} record.");
            }
            $reference = $row['reference'] ?? null;
            $amount = $row['amount_cents'] ?? null;
            $currency = $row['currency'] ?? null;
            $status = $row['status'] ?? null;

            if (!is_string($reference) || trim($reference) === '' || strlen($reference) > 190
                || !is_int($amount) || $amount < 0
                || !is_string($currency) || !preg_match('/^[A-Z]{3}$/', $currency)
                || !is_string($status) || !preg_match('/^[a-z_]+$/', $status)
                || isset($indexed[$reference])) {
                throw new InvalidArgumentException("Invalid or duplicate {$group} evidence record.");
            }

            $indexed[$reference] = [
                'amount_cents' => $amount,
                'currency' => $currency,
                'status' => $status,
            ];
        }

        return $indexed;
    }

    /** @param string[] $acceptedStatuses */
    public function compare(string $group, ?string $reference, int $amountCents, string $currency, array $acceptedStatuses): string
    {
        if ($reference === null || $reference === '' || !isset($this->records[$group][$reference])) {
            return 'missing';
        }

        $record = $this->records[$group][$reference];
        $this->matched[$group][$reference] = true;

        if ($record['amount_cents'] !== $amountCents) {
            return 'amount_mismatch';
        }
        if ($record['currency'] !== strtoupper($currency)) {
            return 'currency_mismatch';
        }
        if (!in_array($record['status'], $acceptedStatuses, true)) {
            return 'status_mismatch';
        }

        return 'matched';
    }

    /** @return array<string, int> */
    public function unmatchedCounts(): array
    {
        $unmatched = [];
        foreach (self::GROUPS as $group) {
            $unmatched[$group] = count($this->records[$group]) - count($this->matched[$group]);
        }
        return $unmatched;
    }
}
