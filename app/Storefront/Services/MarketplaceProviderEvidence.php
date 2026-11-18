<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use InvalidArgumentException;
use JsonException;

final class MarketplaceProviderEvidence
{
    private const GROUPS = [
        'chapa_payments', 'chapa_refunds', 'chapa_payouts', 'verify_et_verifications',
    ];

    /** @var array<string, array<string, array{amount_cents: int, currency: string, status: string}>> */
    private array $records = [];

    /** @var array<string, array<string, true>> */
    private array $matched = [];

    private function __construct() {}

    public static function fromPath(string $path): self
    {
        $input = self::read($path);
        self::validateHeader($input);

        $evidence = new self();
        foreach (self::GROUPS as $group) {
            $evidence->records[$group] = self::indexRows(self::groupRows($input, $group));
            $evidence->matched[$group] = [];
        }
        return $evidence;
    }

    private static function read(string $path): array
    {
        self::assertReadable($path);
        try {
            $decoded = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new InvalidArgumentException('Provider evidence must be valid JSON.');
        }
        if (!is_array($decoded)) {
            throw new InvalidArgumentException('Provider evidence must be a JSON object.');
        }
        return $decoded;
    }

    private static function assertReadable(string $path): void
    {
        if (!is_file($path)) {
            throw new InvalidArgumentException('Provider evidence file is missing.');
        }
        if (!is_readable($path)) {
            throw new InvalidArgumentException('Provider evidence file is unreadable.');
        }
        if (filesize($path) > 16777216) {
            throw new InvalidArgumentException('Provider evidence exceeds 16 MiB.');
        }
    }

    private static function validateHeader(array $input): void
    {
        if (($input['schema_version'] ?? null) !== 1) {
            throw new InvalidArgumentException('Unsupported provider evidence schema version.');
        }
        if (($input['scope'] ?? null) !== 'complete_marketplace_history') {
            throw new InvalidArgumentException('Provider evidence must cover the complete marketplace history.');
        }
    }

    private static function groupRows(array $input, string $group): array
    {
        $rows = $input[$group] ?? null;
        if (!is_array($rows)) {
            throw new InvalidArgumentException("Missing {$group} evidence.");
        }
        if (!array_is_list($rows)) {
            throw new InvalidArgumentException("Invalid {$group} evidence list.");
        }
        return $rows;
    }

    private static function indexRows(array $rows): array
    {
        $indexed = [];
        foreach ($rows as $row) {
            $normalized = self::normalizeRow($row);
            $reference = $normalized['reference'];
            if (isset($indexed[$reference])) {
                throw new InvalidArgumentException('Duplicate provider reference.');
            }
            unset($normalized['reference']);
            $indexed[$reference] = $normalized;
        }
        return $indexed;
    }

    private static function normalizeRow(mixed $row): array
    {
        if (!is_array($row)) {
            throw new InvalidArgumentException('Invalid provider record.');
        }
        return [
            'reference' => self::checkedString($row, [
                'field' => 'reference',
                'pattern' => '/^(?=.{1,190}\z)(?=.*\S).+$/s',
            ]),
            'amount_cents' => self::amount($row['amount_cents'] ?? null),
            'currency' => self::checkedString($row, [
                'field' => 'currency', 'pattern' => '/^[A-Z]{3}$/',
            ]),
            'status' => self::checkedString($row, [
                'field' => 'status', 'pattern' => '/^[a-z_]+$/',
            ]),
        ];
    }

    private static function checkedString(array $row, array $rule): string
    {
        $value = $row[$rule['field']] ?? null;
        if (!is_string($value)) {
            throw new InvalidArgumentException('Provider evidence has an invalid text field.');
        }
        if (!preg_match($rule['pattern'], $value)) {
            throw new InvalidArgumentException('Provider evidence has an invalid text format.');
        }
        return $value;
    }

    private static function amount(mixed $value): int
    {
        if (!is_int($value) || $value < 0) {
            throw new InvalidArgumentException('Invalid provider amount.');
        }
        return $value;
    }

    /** @param array{reference: ?string, amount_cents: int, currency: string, statuses: string[]} $subject */
    public function compare(string $group, array $subject): string
    {
        $reference = $subject['reference'];
        $record = $this->find($group, $reference);
        if ($record === null) {
            return 'missing';
        }
        $this->matched[$group][$reference] = true;
        return self::matchValues($record, $subject);
    }

    private function find(string $group, ?string $reference): ?array
    {
        if ($reference === null || $reference === '') {
            return null;
        }
        return $this->records[$group][$reference] ?? null;
    }

    private static function matchValues(array $record, array $subject): string
    {
        if ($record['amount_cents'] !== $subject['amount_cents']) {
            return 'amount_mismatch';
        }
        if ($record['currency'] !== strtoupper($subject['currency'])) {
            return 'currency_mismatch';
        }
        if (!in_array($record['status'], $subject['statuses'], true)) {
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
