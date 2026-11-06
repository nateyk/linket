<?php

namespace App\CreatorAi\Forecasting;

use InvalidArgumentException;

/**
 * Historical stress calibration using chronologically ordered, non-overlapping
 * horizon-total holdouts. No random split, data leakage or AI-generated totals.
 *
 * Reports empirical validation only; a time series does not automatically
 * satisfy exchangeability or justify probabilistic confidence claims.
 */
final class ForecastHorizonCalibration
{
    private const MIN_CALIBRATION_FOLDS = 6;
    private const VALIDATION_FOLDS = 3;
    private const MAX_FOLDS = 12;
    private const MIN_TRAINING_DAYS = 14;

    /**
     * @param list<array{verified_revenue_cents:int}> $daily
     * @return array<string,int|string|bool>
     */
    public function assess(array $daily, int $horizonDays): array
    {
        if (! in_array($horizonDays, [7, 30], true)) {
            throw new InvalidArgumentException('Unsupported forecast horizon.');
        }

        $historyDays = count($daily);
        if ($historyDays > 366) {
            throw new InvalidArgumentException('Forecast history exceeds the maximum window.');
        }

        $requiredFolds = self::MIN_CALIBRATION_FOLDS + self::VALIDATION_FOLDS;
        $requiredDays = self::MIN_TRAINING_DAYS + $requiredFolds * $horizonDays;

        $metadata = [
            'passed' => false,
            'horizon_days' => $horizonDays,
            'history_days' => $historyDays,
            'minimum_days_for_calibration' => $requiredDays,
            'interval_probability_calibrated' => false,
        ];

        if ($historyDays < $requiredDays) {
            return [...$metadata, 'reason' => 'insufficient_independent_holdouts'];
        }

        foreach ($daily as $row) {
            if (! is_array($row)
                || ! is_int($row['verified_revenue_cents'] ?? null)
                || $row['verified_revenue_cents'] < 0
                || $row['verified_revenue_cents'] > 1000000000000) {
                throw new InvalidArgumentException('Invalid verified ETB daily revenue for calibration.');
            }
        }

        $foldCount = min(
            self::MAX_FOLDS,
            intdiv($historyDays - self::MIN_TRAINING_DAYS, $horizonDays)
        );
        $folds = [];
        for ($foldIndex = 0; $foldIndex < $foldCount; $foldIndex++) {
            $split = $historyDays - ($foldCount - $foldIndex) * $horizonDays;
            $lastWeek = array_slice($daily, $split - 7, 7);
            $predictedDaily = intdiv(
                array_sum(array_column($lastWeek, 'verified_revenue_cents')) + 3, 7
            );

            $candidateTotal = $predictedDaily * $horizonDays;
            $naiveTotal = $daily[$split - 1]['verified_revenue_cents'] * $horizonDays;
            $seasonalTotal = 0;
            for ($offset = 0; $offset < $horizonDays; $offset++) {
                $seasonalTotal += $lastWeek[$offset % 7]['verified_revenue_cents'];
            }

            $actualTotal = array_sum(array_column(
                array_slice($daily, $split, $horizonDays), 'verified_revenue_cents'
            ));

            $folds[] = [
                'predicted_total' => $candidateTotal,
                'candidate_error' => abs($actualTotal - $candidateTotal),
                'naive_error' => abs($actualTotal - $naiveTotal),
                'seasonal_error' => abs($actualTotal - $seasonalTotal),
            ];
        }

        $calibration = array_slice($folds, 0, -self::VALIDATION_FOLDS);
        $validation = array_slice($folds, -self::VALIDATION_FOLDS);
        $historicalRadius = max(array_column($calibration, 'candidate_error'));

        $covered = 0;
        $candidateErrors = 0;
        $naiveErrors = 0;
        $seasonalErrors = 0;
        foreach ($validation as $fold) {
            // The 25% floor is a safety heuristic, not a confidence claim.
            // The validation windows never influence historicalRadius.
            $radius = max(
                $historicalRadius,
                intdiv($fold['predicted_total'] + 3, 4)
            );

            $covered += (int) ($fold['candidate_error'] <= $radius);
            $candidateErrors += $fold['candidate_error'];
            $naiveErrors += $fold['naive_error'];
            $seasonalErrors += $fold['seasonal_error'];
        }

        $baselinePassed = $candidateErrors <= $naiveErrors
            && $candidateErrors <= $seasonalErrors;
        $coveragePassed = $covered === self::VALIDATION_FOLDS;

        return [
            ...$metadata,
            'passed' => $baselinePassed && $coveragePassed,
            'reason' => ! $coveragePassed
                ? 'validation_outside_empirical_range'
                : (! $baselinePassed ? 'validation_underperformed_baselines' : 'backtest_evidence_sufficient'),
            'calibration_folds' => count($calibration),
            'independent_validation_folds' => count($validation),
            'historical_max_horizon_error_cents' => $historicalRadius,
            'candidate_validation_mae_cents' => intdiv(
                $candidateErrors + self::VALIDATION_FOLDS - 1, self::VALIDATION_FOLDS
            ),
            'naive_validation_mae_cents' => intdiv(
                $naiveErrors + self::VALIDATION_FOLDS - 1, self::VALIDATION_FOLDS
            ),
            'weekly_seasonal_validation_mae_cents' => intdiv(
                $seasonalErrors + self::VALIDATION_FOLDS - 1, self::VALIDATION_FOLDS
            ),
            'observed_validation_coverage_bps' => intdiv(
                10000 * $covered, self::VALIDATION_FOLDS
            ),
            'interval_method' => 'historical_max_error_with_25pct_floor',
        ];
    }
}
