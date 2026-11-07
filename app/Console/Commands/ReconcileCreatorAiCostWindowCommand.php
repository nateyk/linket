<?php

namespace App\Console\Commands;

use App\CreatorAi\Writing\CreatorAiProviderCostReconciler;
use Illuminate\Console\Command;
use Throwable;

/**
 * Manual-only, operator-controlled closed-day reconciliation.
 * No scheduled job, web route or implicit feature enablement.
 */
final class ReconcileCreatorAiCostWindowCommand extends Command
{
    protected $signature = 'creator-ai:reconcile-cost-window
        {day : A closed UTC day (YYYY-MM-DD)}
        {--settle : Commit the stable provider aggregate after the observation delay}';

    protected $description = 'Compare independent provider cost evidence and, explicitly, reconcile held AI spend';

    public function handle(CreatorAiProviderCostReconciler $reconciler): int
    {
        try {
            $result = $reconciler->reconcile(
                (string) $this->argument('day'),
                (bool) $this->option('settle'),
            );
        } catch (Throwable) {
            // Billing API responses may include sensitive metadata. Do not
            // expose request details, credentials, or provider response body.
            $this->error('Cost reconciliation refused. Verify private operator evidence and configuration.');

            return self::FAILURE;
        }

        $this->line(json_encode($result, JSON_THROW_ON_ERROR));
        if ($this->option('settle') && $result['status'] !== 'settled') {
            $this->warn('No budget or quota reservation was released.');

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
