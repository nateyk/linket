<?php

declare(strict_types=1);

namespace App\Storefront\Commands;

use App\Storefront\Services\MarketplaceIndependentAudit;
use App\Storefront\Services\MarketplaceProviderEvidence;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

final class AuditIndependentMarketplaceFinancesCommand extends Command
{
    protected $signature = 'marketplace:audit-independent
                            {--evidence= : Path to an offline, complete provider settlement export in JSON}
                            {--json : Print the redacted report as JSON}';

    protected $description = 'Read-only Chapa and historical Verify.et reconciliation; never sends transfers or changes payments.';

    public function handle(MarketplaceIndependentAudit $audit): int
    {
        try {
            $path = $this->option('evidence');
            $evidence = is_string($path) && $path !== ''
                ? MarketplaceProviderEvidence::fromPath($path)
                : null;
            // All SELECTs share one database transaction snapshot; no writes occur.
            $report = DB::transaction(static fn () => $audit->audit($evidence), 1);
        } catch (Throwable) {
            // Do not echo SQL, imported provider references, payment details or credentials.
            $report = [
                'read_only' => true,
                'candidate_for_manual_review' => false,
                'retirement_authorized' => false,
                'live_payouts_authorized' => false,
                'error' => 'audit_unavailable_or_invalid_evidence',
            ];
        }

        if ($this->option('json')) {
            $this->line((string) json_encode($report, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
        } else {
            $this->info('Marketplace independent reconciliation (read-only)');
            foreach (($report['counts'] ?? []) as $name => $count) {
                $this->line("{$name}: {$count}");
            }
            $this->line('Issues: '.($report['issue_count'] ?? 'unknown'));
            $this->warn(($report['candidate_for_manual_review'] ?? false)
                ? 'Eligible for separate manual evidence review; retirement and transfers remain disabled.'
                : 'BLOCKED: resolve evidence and journal discrepancies before any retirement decision.');
        }

        return ($report['candidate_for_manual_review'] ?? false)
            ? self::SUCCESS : self::FAILURE;
    }
}
