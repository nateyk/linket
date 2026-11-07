<?php

namespace App\CreatorAi\Forecasting;

/**
 * Mandatory fail-closed publication readiness assessment for future forecast
 * consumers. Intentionally does not accept user-declared "complete" flags.
 *
 * The current order database can prove selected Verify.et payments, but
 * cannot attest that each no-sale day was observed by an independent ledger.
 * Until a trusted observation-checkpoint source exists, no money forecast can
 * be released. This is internal only; MCP registration stays unchanged.
 */
final class ForecastReliabilityGate
{
    public function __construct(
        private readonly VerifiedRevenueForecastEngine $candidate,
        private readonly ForecastHorizonCalibration $calibration,
    ) {}

    /**
     * @param list<array{date:string,verified_sales_count:int,verified_revenue_cents:int}> $daily
     * @return array<string,int|string|bool>
     */
    public function assess(array $daily, int $horizonDays = 7): array
    {
        // The candidate independently validates date continuity, strict
        // amounts, sale-count consistency and horizon limits.
        $candidate = $this->candidate->evaluate($daily, $horizonDays);

        $zeroSaleDays = 0;
        $saleDays = 0;
        $longestZeroStreak = 0;
        $streak = 0;
        foreach ($daily as $row) {
            if ($row['verified_sales_count'] === 0) {
                $zeroSaleDays++;
                $streak++;
                $longestZeroStreak = max($longestZeroStreak, $streak);
            } else {
                $saleDays++;
                $streak = 0;
            }
        }

        $metadata = [
            'eligible' => false,
            'horizon_days' => $horizonDays,
            'history_days' => count($daily),
            'verified_order_count' => $candidate['verified_order_count'],
            'currency' => 'ETB',
            'revenue_basis' => 'verified_gross',
            'verified_sale_days' => $saleDays,
            'zero_sale_days' => $zeroSaleDays,
            'longest_zero_sale_streak_days' => $longestZeroStreak,
            'independent_observation_coverage_verified' => false,
        ];

        if (! $candidate['eligible']) {
            return [...$metadata, 'reason' => $candidate['reason']];
        }

        $calibration = $this->calibration->assess($daily, $horizonDays);
        if (! $calibration['passed']) {
            return [
                ...$metadata,
                'reason' => $calibration['reason'],
                'minimum_days_for_calibration' => $calibration['minimum_days_for_calibration'],
                ...$this->safeCalibrationMetrics($calibration),
            ];
        }

        // Zero sales and missing historical observations are indistinguishable
        // without independent ingestion/checkpoint evidence. Never fabricate
        // completeness from a zero-filled SQL series.
        return [
            ...$metadata,
            'reason' => 'independent_history_coverage_unverified',
            ...$this->safeCalibrationMetrics($calibration),
        ];
    }

    /**
     * Diagnostics are safe to retain internally. No estimated daily/total
     * revenue or forecast interval bounds are disclosed by this gate.
     *
     * @param array<string,int|string|bool> $calibration
     * @return array<string,int|string|bool>
     */
    private function safeCalibrationMetrics(array $calibration): array
    {
        $keys = [
            'calibration_folds',
            'independent_validation_folds',
            'candidate_validation_mae_cents',
            'naive_validation_mae_cents',
            'weekly_seasonal_validation_mae_cents',
            'observed_validation_coverage_bps',
            'interval_method',
            'interval_probability_calibrated',
        ];

        return array_intersect_key($calibration, array_flip($keys));
    }
}
