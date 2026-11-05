<?php

namespace App\CreatorAi\Forecasting;

use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Internal application-layer report, intentionally not an HTTP/MCP endpoint.
 * The authorized SQL source is always constructed server-side. A zero-filled
 * day is never considered independently observed without external evidence.
 */
final class CreatorForecastReadinessReport
{
    public function __construct(
        private readonly VerifiedRevenueDailySeries $history,
        private readonly ForecastReliabilityGate $reliability,
        private readonly ForecastObservationCheckpointAudit $checkpoints,
    ) {}

    /** @return array<string,int|string|bool> */
    public function assess(
        User $creator,
        int $workspaceId,
        CarbonImmutable $from,
        CarbonImmutable $to,
        int $horizonDays = 7,
    ): array {
        $daily = $this->history->forCreator($creator, $workspaceId, $from, $to);
        $reliability = $this->reliability->assess($daily, $horizonDays);
        $audit = $this->checkpoints->assess($creator, $workspaceId, $daily);

        // This service never returns a daily series or buyer/provider records.
        // Both underlying gates currently reject forecast publication.
        return [
            ...$reliability,
            'checkpoint_audit_reason' => $audit['reason'],
            'checkpoint_days_requested' => $audit['checkpoint_days_requested'],
            'locally_reconciled_checkpoint_days' => $audit['locally_reconciled_checkpoint_days'],
            'external_source_authenticity_verified' => false,
            'independent_observation_coverage_verified' => false,
        ];
    }
}
