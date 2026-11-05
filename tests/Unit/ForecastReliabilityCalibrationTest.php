<?php

use App\CreatorAi\Forecasting\ForecastHorizonCalibration;
use App\CreatorAi\Forecasting\ForecastReliabilityGate;
use DateTimeImmutable;
use DateTimeZone;

/**
 * Synthetic UTC observations. No provider, workspace, buyer information or
 * external AI request is involved.
 *
 * @return list<array{date:string,verified_sales_count:int,verified_revenue_cents:int}>
 */
function forecastReliabilityFixture(int $days, int $revenue = 10000): array
{
    $start = new DateTimeImmutable('2025-01-01', new DateTimeZone('UTC'));
    $daily = [];
    for ($i = 0; $i < $days; $i++) {
        $daily[] = [
            'date' => $start->modify('+'.$i.' days')->format('Y-m-d'),
            'verified_sales_count' => 1,
            'verified_revenue_cents' => $revenue,
        ];
    }
    return $daily;
}

test('separate calibration and validation windows measure constant seven-day history without claiming probability', function () {
    $result = app(ForecastHorizonCalibration::class)->assess(forecastReliabilityFixture(90), 7);

    expect($result['passed'])->toBeTrue()
        ->and($result['calibration_folds'])->toBeGreaterThanOrEqual(6)
        ->and($result['independent_validation_folds'])->toBe(3)
        ->and($result['historical_max_horizon_error_cents'])->toBe(0)
        ->and($result['candidate_validation_mae_cents'])->toBe(0)
        ->and($result['naive_validation_mae_cents'])->toBe(0)
        ->and($result['weekly_seasonal_validation_mae_cents'])->toBe(0)
        ->and($result['observed_validation_coverage_bps'])->toBe(10000)
        ->and($result['interval_probability_calibrated'])->toBeFalse();
});

test('a 30-day candidate does not qualify for validation until nine disjoint holdouts are available', function () {
    $under = app(ForecastHorizonCalibration::class)->assess(forecastReliabilityFixture(90), 30);
    expect($under['passed'])->toBeFalse()
        ->and($under['reason'])->toBe('insufficient_independent_holdouts')
        ->and($under['minimum_days_for_calibration'])->toBe(284);

    $enough = app(ForecastHorizonCalibration::class)->assess(forecastReliabilityFixture(300), 30);
    expect($enough['passed'])->toBeTrue()
        ->and($enough['calibration_folds'])->toBeGreaterThanOrEqual(6)
        ->and($enough['independent_validation_folds'])->toBe(3);
});

test('seven-day forecasts require more than candidate history to validate prediction errors', function () {
    $result = app(ForecastHorizonCalibration::class)->assess(forecastReliabilityFixture(30), 7);
    expect($result['passed'])->toBeFalse()
        ->and($result['reason'])->toBe('insufficient_independent_holdouts')
        ->and($result['minimum_days_for_calibration'])->toBe(77);
});

test('a late revenue regime shift is rejected by the out-of-sample range check', function () {
    $daily = forecastReliabilityFixture(100);
    for ($i = 86; $i < 100; $i++) {
        $daily[$i]['verified_revenue_cents'] = 100000;
    }

    $result = app(ForecastHorizonCalibration::class)->assess($daily, 7);
    expect($result['passed'])->toBeFalse()
        ->and($result['reason'])->toBe('validation_outside_empirical_range')
        ->and($result['observed_validation_coverage_bps'])->toBeLessThan(10000);
});

test('publication reliability gate withholds predictions when independently observed history cannot be proven', function () {
    $result = app(ForecastReliabilityGate::class)->assess(forecastReliabilityFixture(100), 7);

    expect($result['eligible'])->toBeFalse()
        ->and($result['reason'])->toBe('independent_history_coverage_unverified')
        ->and($result['independent_observation_coverage_verified'])->toBeFalse()
        ->and($result['verified_sale_days'])->toBe(100)
        ->and($result['zero_sale_days'])->toBe(0)
        ->and($result['observed_validation_coverage_bps'])->toBe(10000);

    foreach (['estimated_total_gross_cents', 'estimated_daily_gross_cents',
        'indicative_lower_gross_cents', 'indicative_upper_gross_cents',
        'historical_max_horizon_error_cents'] as $privateField) {
        expect(array_key_exists($privateField, $result))->toBeFalse();
    }
});

test('publication reliability gate withholds thin history and never leaks model output', function () {
    $result = app(ForecastReliabilityGate::class)->assess(forecastReliabilityFixture(30), 7);
    expect($result['eligible'])->toBeFalse()
        ->and($result['reason'])->toBe('insufficient_independent_holdouts')
        ->and($result['minimum_days_for_calibration'])->toBe(77)
        ->and(array_key_exists('estimated_total_gross_cents', $result))->toBeFalse();
});

test('publication reliability gate counts zero-sales streaks without treating them as verified observation coverage', function () {
    $daily = forecastReliabilityFixture(90);
    for ($i = 15; $i < 25; $i++) {
        $daily[$i]['verified_sales_count'] = 0;
        $daily[$i]['verified_revenue_cents'] = 0;
    }

    $result = app(ForecastReliabilityGate::class)->assess($daily, 7);
    expect($result['zero_sale_days'])->toBe(10)
        ->and($result['longest_zero_sale_streak_days'])->toBe(10)
        ->and($result['independent_observation_coverage_verified'])->toBeFalse()
        ->and($result['eligible'])->toBeFalse();
});

test('reliability gate rejects missing calendar observations rather than silently zero filling them', function () {
    $daily = forecastReliabilityFixture(90);
    unset($daily[12]);
    $daily = array_values($daily);

    expect(fn () => app(ForecastReliabilityGate::class)->assess($daily, 7))
        ->toThrow(InvalidArgumentException::class);
});

test('calibration fails closed on invalid values and unsupported forecast horizons', function () {
    $rows = forecastReliabilityFixture(90);
    $rows[4]['verified_revenue_cents'] = -1;
    expect(fn () => app(ForecastHorizonCalibration::class)->assess($rows, 7))
        ->toThrow(InvalidArgumentException::class);
    expect(fn () => app(ForecastHorizonCalibration::class)->assess(forecastReliabilityFixture(90), 14))
        ->toThrow(InvalidArgumentException::class);
});
