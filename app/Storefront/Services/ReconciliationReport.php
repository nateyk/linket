<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use Carbon\Carbon;

final class ReconciliationReport
{
    public int $maturedOrdersCount = 0;
    public int $reconciledPaymentsCount = 0;
    public int $reconciledPayoutsCount = 0;
    public int $missingJournalEntriesFixedCount = 0;
    public ?LedgerAuditResult $ledgerAudit = null;

    /** @var string[] */
    public array $discrepancies = [];

    public ?Carbon $executedAt = null;

    public function isHealthy(): bool
    {
        return empty($this->discrepancies) && !($this->ledgerAudit?->hasAnomalies() ?? false);
    }
}
