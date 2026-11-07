<?php

use App\CreatorAi\Forecasting\VerifiedRevenueForecastEngine;

/**
 * Synthetic, complete UTC calendar series only. No database, provider, buyer
 * data, model request or feature flag is involved in these engine tests.
 *
 * @return list<array{date:string, verified_sales_count:int, verified_revenue_cents:int}>
 */
function verifiedForecastFixture(int $days, int $revenueCents = 10000, int $salesCount = 1): array
{
    $start = new DateTimeImmutable('2026-01-01', new DateTimeZone('UTC'));
    $rows = [];

    for ($index = 0; $index < $days; $index++) {
        $rows[] = [
            'date' => $start->modify('+'.$index.' days')->format('Y-m-d'),
            'verified_sales_count' => $salesCount,
            'verified_revenue_cents' => $revenueCents,
        ];
    }

    return $rows;
}

test('forecast engine keeps 7-day forecasts ineligible without 30 full days and 10 verified orders', function () {
    $engine = new VerifiedRevenueForecastEngine();

    $short = $engine->evaluate(verifiedForecastFixture(29));
    expect($short['eligible'])->toBeFalse()
        ->and($short['reason'])->toBe('insufficient_history');

    $sparse = verifiedForecastFixture(30, 0, 0);
    for ($index = 0; $index < 9; $index++) {
        $sparse[$index]['verified_sales_count'] = 1;
        $sparse[$index]['verified_revenue_cents'] = 1000;
    }
    $fewOrders = $engine->evaluate($sparse);
    expect($fewOrders['eligible'])->toBeFalse()
        ->and($fewOrders['reason'])->toBe('insufficient_verified_orders');
});

test('forecast engine backtests against a naive model before returning a bounded indicative ETB range', function () {
    $result = (new VerifiedRevenueForecastEngine())->evaluate(verifiedForecastFixture(30));

    expect($result['eligible'])->toBeTrue()
        ->and($result['horizon_days'])->toBe(7)
        ->and($result['currency'])->toBe('ETB')
        ->and($result['revenue_basis'])->toBe('verified_gross')
        ->and($result['backtest_days'])->toBe(7)
        ->and($result['rolling_backtest_folds'])->toBe(2)
        ->and($result['rolling_backtest_mae_cents'])->toBe(0)
        ->and($result['backtest_mae_cents'])->toBe(0)
        ->and($result['naive_backtest_mae_cents'])->toBe(0)
        ->and($result['estimated_total_gross_cents'])->toBe(70000)
        ->and($result['indicative_lower_gross_cents'])->toBe(52500)
        ->and($result['indicative_upper_gross_cents'])->toBe(87500)
        ->and($result['range_method'])->toBe('uncalibrated_backtest_error_envelope');

    expect(json_encode($result, JSON_THROW_ON_ERROR))
        ->not->toContain('buyer_name')
        ->not->toContain('payment_reference')
        ->not->toContain('settlement_account');
});

test('30-day forecasting requires longer coverage and more verified sales', function () {
    $engine = new VerifiedRevenueForecastEngine();

    $tooShort = $engine->evaluate(verifiedForecastFixture(89), 30);
    expect($tooShort['eligible'])->toBeFalse()
        ->and($tooShort['reason'])->toBe('insufficient_history');

    $full = $engine->evaluate(verifiedForecastFixture(90), 30);
    expect($full['eligible'])->toBeTrue()
        ->and($full['estimated_total_gross_cents'])->toBe(300000)
        ->and($full['backtest_days'])->toBe(30);
});

test('forecast engine rejects gaps, duplicate days, inconsistent aggregates and invalid horizons', function () {
    $engine = new VerifiedRevenueForecastEngine();
    $gapped = verifiedForecastFixture(30);
    $gapped[15]['date'] = '2026-02-20';
    expect(fn () => $engine->evaluate($gapped))->toThrow(InvalidArgumentException::class);

    $duplicate = verifiedForecastFixture(30);
    $duplicate[15]['date'] = $duplicate[14]['date'];
    expect(fn () => $engine->evaluate($duplicate))->toThrow(InvalidArgumentException::class);

    $inconsistent = verifiedForecastFixture(30);
    $inconsistent[0]['verified_sales_count'] = 0;
    expect(fn () => $engine->evaluate($inconsistent))->toThrow(InvalidArgumentException::class);

    expect(fn () => $engine->evaluate(verifiedForecastFixture(30), 14))
        ->toThrow(InvalidArgumentException::class);
});

test('forecast engine suppresses an underperforming candidate instead of manufacturing earnings claims', function () {
    $days = verifiedForecastFixture(30);
    $days[22]['verified_revenue_cents'] = 0;
    for ($index = 23; $index < 30; $index++) {
        $days[$index]['verified_revenue_cents'] = 0;
    }

    $result = (new VerifiedRevenueForecastEngine())->evaluate($days);
    expect($result['eligible'])->toBeFalse()
        ->and($result['reason'])->toBe('backtest_underperformed_naive')
        ->and(array_key_exists('estimated_total_gross_cents', $result))->toBeFalse();
});

test('forecast engine suppresses inactive creators and missing recent verified revenue', function () {
    $days = verifiedForecastFixture(30);
    for ($index = 16; $index < 30; $index++) {
        $days[$index]['verified_sales_count'] = 0;
        $days[$index]['verified_revenue_cents'] = 0;
    }

    $result = (new VerifiedRevenueForecastEngine())->evaluate($days);
    expect($result['eligible'])->toBeFalse()
        ->and($result['reason'])->toBe('no_recent_verified_activity');
});


test('forecast evaluation suppresses a model when an earlier chronological fold loses despite latest holdout passing', function () {
    $history = verifiedForecastFixture(30);
    for ($day = 9; $day < 15; $day++) {
        $history[$day]['verified_revenue_cents'] = 0;
    }

    $result = (new VerifiedRevenueForecastEngine())->evaluate($history, 7);
    expect($result['eligible'])->toBeFalse()
        ->and($result['reason'])->toBe('rolling_backtest_underperformed_naive')
        ->and(array_key_exists('estimated_total_gross_cents', $result))->toBeFalse();
});
