<?php

namespace App\CreatorAi\Forecasting;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;

/**
 * Deterministic, offline evaluation of already-authorized verified ETB daily
 * aggregates. Not a model, public endpoint, payment verifier or MCP tool.
 *
 * All calendar days (including legitimate zero-sale days) must be supplied.
 * The caller is responsible for tenant scoping and Verify.et-backed source
 * selection; the engine refuses malformed or missing dates rather than
 * silently treating missing reporting data as zero revenue.
 */
final class VerifiedRevenueForecastEngine
{
    /**
     * @param list<array{date:string, verified_sales_count:int, verified_revenue_cents:int}> $daily
     * @return array<string, int|string|bool>
     */
    public function evaluate(array $daily, int $horizonDays = 7): array
    {
        if (! in_array($horizonDays, [7, 30], true)) {
            throw new InvalidArgumentException('Only 7-day or 30-day forecast evaluations are supported.');
        }

        $historyDays = count($daily);
        if ($historyDays > 366) {
            throw new InvalidArgumentException('Forecast evaluation exceeds the bounded history window.');
        }

        $verifiedOrders = 0;
        $previous = null;
        foreach ($daily as $row) {
            if (
                ! is_array($row)
                || ! is_string($row['date'] ?? null)
                || preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/D', $row['date']) !== 1
                || ! is_int($row['verified_sales_count'] ?? null)
                || ! is_int($row['verified_revenue_cents'] ?? null)
                || $row['verified_sales_count'] < 0
                || $row['verified_sales_count'] > 1000000
                || $row['verified_revenue_cents'] < 0
                || $row['verified_revenue_cents'] > 1000000000000
                || ($row['verified_sales_count'] === 0 && $row['verified_revenue_cents'] !== 0)
            ) {
                throw new InvalidArgumentException('Invalid verified-sales daily aggregate.');
            }

            $date = DateTimeImmutable::createFromFormat('!Y-m-d', $row['date'], new DateTimeZone('UTC'));
            if ($date === false || $date->format('Y-m-d') !== $row['date']) {
                throw new InvalidArgumentException('Invalid forecast calendar date.');
            }
            if ($previous !== null && $previous->modify('+1 day')->format('Y-m-d') !== $row['date']) {
                throw new InvalidArgumentException('Forecast history has missing, repeated or unordered days.');
            }

            $previous = $date;
            $verifiedOrders += $row['verified_sales_count'];
        }

        $metadata = [
            'eligible' => false,
            'horizon_days' => $horizonDays,
            'history_days' => $historyDays,
            'verified_order_count' => $verifiedOrders,
            'currency' => 'ETB',
            'revenue_basis' => 'verified_gross',
        ];

        $minimumDays = $horizonDays === 7 ? 30 : 90;
        $minimumOrders = $horizonDays === 7 ? 10 : 30;

        if ($historyDays < $minimumDays) {
            return [...$metadata, 'reason' => 'insufficient_history'];
        }
        if ($verifiedOrders < $minimumOrders) {
            return [...$metadata, 'reason' => 'insufficient_verified_orders'];
        }
        if (array_sum(array_column(array_slice($daily, -14), 'verified_sales_count')) === 0) {
            return [...$metadata, 'reason' => 'no_recent_verified_activity'];
        }

        // Chronological holdout: never use a holdout day's revenue as training
        // data. Compare the seven-day mean with a last-observed-day naive
        // benchmark; suppress model output when it underperforms the benchmark.
        $training = array_slice($daily, 0, -$horizonDays);
        $holdout = array_slice($daily, -$horizonDays);
        $candidateDaily = $this->trailingSevenDayAverage($training);
        $naiveDaily = $training[count($training) - 1]['verified_revenue_cents'];

        $candidateError = 0;
        $naiveError = 0;
        foreach ($holdout as $row) {
            $candidateError += abs($row['verified_revenue_cents'] - $candidateDaily);
            $naiveError += abs($row['verified_revenue_cents'] - $naiveDaily);
        }

        $candidateMae = intdiv($candidateError + $horizonDays - 1, $horizonDays);
        $naiveMae = intdiv($naiveError + $horizonDays - 1, $horizonDays);
        if ($candidateError > $naiveError) {
            return [...$metadata, 'reason' => 'backtest_underperformed_naive'];
        }

        $trainingMean = intdiv(
            array_sum(array_column($training, 'verified_revenue_cents')),
            count($training)
        );
        if ($candidateMae > max(1, $trainingMean)) {
            return [...$metadata, 'reason' => 'backtest_error_too_high'];
        }

        $predictedDaily = $this->trailingSevenDayAverage($daily);
        if ($predictedDaily === 0) {
            return [...$metadata, 'reason' => 'no_recent_verified_revenue'];
        }

        $total = $predictedDaily * $horizonDays;

        // This is an explicit heuristic error envelope, NOT a calibrated 95%
        // confidence interval. Never present it as guaranteed earnings.
        $radius = max(intdiv($total + 3, 4), 2 * $candidateMae * $horizonDays);

        return [
            ...$metadata,
            'eligible' => true,
            'model' => 'trailing_7_day_mean_v1',
            'backtest_days' => $horizonDays,
            'backtest_mae_cents' => $candidateMae,
            'naive_backtest_mae_cents' => $naiveMae,
            'estimated_daily_gross_cents' => $predictedDaily,
            'estimated_total_gross_cents' => $total,
            'indicative_lower_gross_cents' => max(0, $total - $radius),
            'indicative_upper_gross_cents' => $total + $radius,
            'range_method' => 'uncalibrated_backtest_error_envelope',
            'disclaimer' => 'Indicative statistical scenario, not guaranteed income or a calibrated confidence interval.',
        ];
    }

    /** @param list<array{verified_revenue_cents:int}> $rows */
    private function trailingSevenDayAverage(array $rows): int
    {
        $lastWeek = array_slice($rows, -7);

        return intdiv(
            array_sum(array_column($lastWeek, 'verified_revenue_cents')) + 3,
            7
        );
    }
}
