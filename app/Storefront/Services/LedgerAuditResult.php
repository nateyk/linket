<?php

declare(strict_types=1);

namespace App\Storefront\Services;

final class LedgerAuditResult
{
    public bool $isBalanced = true;
    public int $totalDebitsCents = 0;
    public int $totalCreditsCents = 0;
    public int $clearingBalanceCents = 0;
    public int $totalCreatorLiabilitiesCents = 0;
    public int $platformCommissionCents = 0;
    public int $totalDisbursedCents = 0;

    /** @var array<int, array{creator_id: int, workspace_id: int|null, balances: array<string, mixed>}> */
    public array $negativeBalancesFound = [];

    /** @var string[] */
    public array $issues = [];

    public function hasAnomalies(): bool
    {
        return !$this->isBalanced || !empty($this->negativeBalancesFound) || !empty($this->issues);
    }
}
