<?php

declare(strict_types=1);

namespace App\Storefront\Commands;

use App\Storefront\Services\MarketplaceReconciliationService;
use Illuminate\Console\Command;

final class ReconcileMarketplaceFinancesCommand extends Command
{
    protected $signature = 'marketplace:reconcile
                            {--dry-run : Audit ledger and report pending items without modifying state}
                            {--audit-only : Run only ledger integrity audit}';

    protected $description = 'Reconciles marketplace payments, payout settlements, escrow maturation, and ledger balance integrity.';

    public function handle(MarketplaceReconciliationService $service): int
    {
        $this->info('Starting Marketplace Financial Reconciliation...');

        if ($this->option('audit-only')) {
            $audit = $service->auditLedgerIntegrity();
            $this->renderAudit($audit);
            return $audit->hasAnomalies() ? self::FAILURE : self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');
        if ($dryRun) {
            $this->warn('Running in DRY-RUN mode. No state modifications will be committed.');
        }

        $report = $service->reconcile($dryRun);

        $this->table(
            ['Metric', 'Count / Value'],
            [
                ['Matured Escrow Orders', $report->maturedOrdersCount],
                ['Reconciled Payments', $report->reconciledPaymentsCount],
                ['Reconciled Payouts', $report->reconciledPayoutsCount],
                ['Fixed Missing Journal Entries', $report->missingJournalEntriesFixedCount],
            ]
        );

        if ($report->ledgerAudit !== null) {
            $this->renderAudit($report->ledgerAudit);
        }

        if (!$report->isHealthy()) {
            $this->error('Reconciliation detected discrepancies or ledger anomalies!');
            foreach ($report->discrepancies as $discrepancy) {
                $this->error(" - {$discrepancy}");
            }
            return self::FAILURE;
        }

        $this->info('Marketplace reconciliation completed successfully. All ledger invariants balanced.');
        return self::SUCCESS;
    }

    private function renderAudit(\App\Storefront\Services\LedgerAuditResult $audit): void
    {
        $this->line('');
        $this->info('--- Double-Entry Ledger Audit ---');
        $this->table(
            ['Account / Invariant', 'Amount (Cents)', 'Amount (ETB)', 'Status'],
            [
                ['Total Debits', $audit->totalDebitsCents, number_format($audit->totalDebitsCents / 100, 2), '-'],
                ['Total Credits', $audit->totalCreditsCents, number_format($audit->totalCreditsCents / 100, 2), '-'],
                ['Double-Entry Balanced', '-', '-', $audit->isBalanced ? 'BALANCED' : 'UNBALANCED (FAIL)'],
                ['Net Platform Clearing', $audit->clearingBalanceCents, number_format($audit->clearingBalanceCents / 100, 2), 'Asset'],
                ['Total Creator Liabilities', $audit->totalCreatorLiabilitiesCents, number_format($audit->totalCreatorLiabilitiesCents / 100, 2), 'Liability'],
                ['Accrued Platform Commission', $audit->platformCommissionCents, number_format($audit->platformCommissionCents / 100, 2), 'Revenue'],
                ['Total Disbursed Payouts', $audit->totalDisbursedCents, number_format($audit->totalDisbursedCents / 100, 2), 'Disbursed'],
            ]
        );

        if (!empty($audit->issues)) {
            $this->error('Ledger Issues:');
            foreach ($audit->issues as $issue) {
                $this->error("  * {$issue}");
            }
        }
    }
}
