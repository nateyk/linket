<?php

declare(strict_types=1);

namespace App\Payments\Commands;

use App\Payments\VerifyEt\VerifyEtRetirementAudit;
use Illuminate\Console\Command;
use Throwable;

final class AuditVerifyEtRetirement extends Command
{
    protected $signature = 'billing:audit-verify-et-retirement
                            {--json : Output counts as machine-readable JSON}';

    protected $description = 'Read-only retirement inventory; does not disable Verify.et or alter payment records.';

    public function handle(VerifyEtRetirementAudit $audit): int
    {
        try {
            $report = $audit->snapshot();
        } catch (Throwable) {
            // Never display SQL, credentials or account identifiers.
            $report = [
                'candidate_for_manual_signoff' => false,
                'error' => 'audit_unavailable',
            ];
        }

        if ($this->option('json')) {
            $this->line(json_encode($report, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
        } else {
            $this->info('Verify.et historical-retirement inventory (read-only)');
            foreach (($report['blockers'] ?? []) as $name => $count) {
                $this->line("{$name}: {$count}");
            }
            $this->line(($report['candidate_for_manual_signoff'] ?? false)
                ? 'LOCAL BLOCKERS: none; external settlement and retention signoff still required.'
                : 'BLOCKED: keep historical webhooks, reconciliation and records.');
            if (isset($report['error']) || ($report['missing_tables'] ?? []) !== []) {
                $this->warn('Audit incomplete. Do not retire historical payment processing.');
            }
        }

        return ($report['candidate_for_manual_signoff'] ?? false)
            ? self::SUCCESS
            : self::FAILURE;
    }
}
