<?php

use App\CreatorAi\Forecasting\CreatorForecastReadinessReport;
use App\CreatorAi\Forecasting\ForecastObservationCheckpointAudit;
use App\CreatorAi\Forecasting\RollingRevenueBacktest;
use App\CreatorAi\Forecasting\VerifiedRevenueDailySeries;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Carbon\CarbonImmutable;
use Common\Workspaces\Models\Workspace;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(DatabaseTransactions::class);

function forecastSourceFixture(): array
{
    $creator = User::factory()->create(['email_verified_at' => now()]);
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    // Synthetic fixture: this workspace really existed before the October
    // verified-sale history. It must not rely on fabricated pre-opening days.
    $workspace->forceFill(['created_at' => CarbonImmutable::parse('2026-09-01 00:00:00', 'UTC')])->save();
    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id, 'user_id' => $creator->id,
        'title' => 'Synthetic forecast guide', 'type' => 'digital',
        'price_cents' => 10000, 'currency' => 'ETB', 'status' => 'approved', 'approved_at' => now(),
    ]);
    return [$creator, (int) $workspace->id, $product];
}

function forecastSourcePro(User $creator): void
{
    $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
    $price = Price::query()->where('product_id', $plan->id)->where('currency', 'ETB')->firstOrFail();
    Subscription::query()->create([
        'user_id' => $creator->id, 'product_id' => $plan->id, 'price_id' => $price->id,
        'gateway_name' => 'verify_et', 'gateway_status' => 'active', 'renews_at' => now()->addMonth(),
    ]);
    $payment = ProSubscriptionPayment::query()->create([
        'uuid' => (string) Str::uuid(), 'creator_id' => $creator->id,
        'product_id' => $plan->id, 'price_id' => $price->id, 'amount_cents' => 50000,
        'status' => 'paid', 'paid_at' => now()->subDay(),
        'subscription_period_start' => now()->subDay(), 'subscription_period_end' => now()->addMonth(),
    ]);
    DirectPaymentVerification::query()->create([
        'reference' => 'FORECAST-'.Str::upper(Str::random(16)),
        'payable_type' => ProSubscriptionPayment::class, 'payable_id' => $payment->id,
        'bank_code' => 'cbe', 'settlement_account' => '1000123456789',
        'amount_cents' => 50000, 'currency' => 'ETB',
        'status' => 'success', 'verified_at' => now()->subDay(),
    ]);
}

function forecastSourceProof(StorefrontOrder $order, array $overrides = []): DirectPaymentVerification
{
    return DirectPaymentVerification::query()->create([
        'reference' => 'FCST-'.Str::upper(Str::random(18)),
        'payable_type' => StorefrontOrder::class,
        'payable_id' => $order->getKey(),
        'bank_code' => 'cbe',
        'settlement_account' => '1000123456789',
        'amount_cents' => (int) $order->gross_amount_cents,
        'currency' => (string) $order->currency,
        'status' => 'success',
        'verified_at' => now()->subDay(),
        'canonical_transaction_identity' => Str::upper(Str::random(24)),
        ...$overrides,
    ]);
}

function forecastSourceOrder(User $creator, DigitalProduct $product, string $status, int $cents, string $currency = 'ETB', bool $withProof = true): StorefrontOrder
{
    $order = StorefrontOrder::query()->create([
        'uuid' => (string) Str::uuid(), 'creator_id' => $creator->id, 'digital_product_id' => $product->id,
        'buyer_name' => 'PRIVATE FORECAST BUYER', 'buyer_email' => 'private-forecast@example.test',
        'payment_reference' => 'PRIVATE-FORECAST-REFERENCE-'.Str::random(12), 'currency' => $currency,
        'gross_amount_cents' => $cents, 'creator_earnings_cents' => $cents,
        'commission_bps' => 0, 'platform_fee_cents' => 0, 'payment_gateway' => 'verify_et',
        'status' => $status, 'paid_at' => '2026-10-12 10:00:00',
    ]);
    if ($withProof && in_array($status, ['paid', 'fulfilled'], true)) {
        forecastSourceProof($order);
    }

    return $order;
}

test('scoped daily adapter zero fills UTC calendar but excludes unverified, foreign and non ETB sales', function () {
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.forecast', true);
    [$creator, $workspace, $product] = forecastSourceFixture();
    [$foreign, , $foreignProduct] = forecastSourceFixture();
    forecastSourcePro($creator);
    forecastSourceOrder($creator, $product, 'paid', 10000);
    forecastSourceOrder($creator, $product, 'fulfilled', 15000);
    forecastSourceOrder($creator, $product, 'manual_review', 900000);
    forecastSourceOrder($creator, $product, 'paid', 900000, 'USD');
    forecastSourceOrder($foreign, $foreignProduct, 'paid', 900000);
    $daily = app(VerifiedRevenueDailySeries::class)->forCreator(
        $creator, $workspace,
        CarbonImmutable::parse('2026-10-11', 'UTC'),
        CarbonImmutable::parse('2026-10-13', 'UTC')
    );
    expect($daily)->toBe([
        ['date' => '2026-10-11', 'verified_sales_count' => 0, 'verified_revenue_cents' => 0],
        ['date' => '2026-10-12', 'verified_sales_count' => 2, 'verified_revenue_cents' => 25000],
        ['date' => '2026-10-13', 'verified_sales_count' => 0, 'verified_revenue_cents' => 0],
    ]);
    $json = json_encode($daily, JSON_THROW_ON_ERROR);
    expect($json)->not->toContain('PRIVATE FORECAST BUYER')
        ->not->toContain('private-forecast@example.test')
        ->not->toContain('PRIVATE-FORECAST-REFERENCE');
});

test('forecast history ignores paid labels without exact Verify.et confirmation and deduplicates multiple attempts', function () {
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.forecast', true);
    [$creator, $workspace, $product] = forecastSourceFixture();
    forecastSourcePro($creator);

    $trusted = forecastSourceOrder($creator, $product, 'paid', 12000);
    forecastSourceProof($trusted); // duplicate success does not add another order

    forecastSourceOrder($creator, $product, 'paid', 200000, 'ETB', false); // status spoofed without proof

    $badAmount = forecastSourceOrder($creator, $product, 'paid', 300000, 'ETB', false);
    forecastSourceProof($badAmount, ['amount_cents' => 299999]);

    $missingIdentity = forecastSourceOrder($creator, $product, 'paid', 400000, 'ETB', false);
    forecastSourceProof($missingIdentity, ['canonical_transaction_identity' => null]);

    $missingVerifiedAt = forecastSourceOrder($creator, $product, 'paid', 500000, 'ETB', false);
    forecastSourceProof($missingVerifiedAt, ['verified_at' => null]);

    $legacy = forecastSourceOrder($creator, $product, 'paid', 600000);
    $legacy->update(['payment_gateway' => 'chapa']);

    $rows = app(VerifiedRevenueDailySeries::class)->forCreator(
        $creator, $workspace,
        CarbonImmutable::parse('2026-10-12', 'UTC'),
        CarbonImmutable::parse('2026-10-12', 'UTC')
    );

    expect($rows)->toBe([[
        'date' => '2026-10-12',
        'verified_sales_count' => 1,
        'verified_revenue_cents' => 12000,
    ]]);
});

test('scoped forecast history requires current verified Pro, workspace membership and enabled flag', function () {
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.forecast', true);
    [$creator, $workspace] = forecastSourceFixture();
    [, $foreignWorkspace] = forecastSourceFixture();
    $service = app(VerifiedRevenueDailySeries::class);
    $from = CarbonImmutable::parse('2026-10-01', 'UTC');
    $to = CarbonImmutable::parse('2026-10-30', 'UTC');
    foreach ([$workspace, $foreignWorkspace] as $id) {
        try {
            $service->forCreator($creator, $id, $from, $to);
            $this->fail('Unverified creator or wrong workspace gained forecast history');
        } catch (HttpException $exception) {
            expect($exception->getStatusCode())->toBe(403);
        }
    }
    forecastSourcePro($creator);
    expect($service->forCreator($creator, $workspace, $from, $to))->toHaveCount(30);
    config()->set('creator_ai.features.forecast', false);
    try {
        $service->forCreator($creator, $workspace, $from, $to);
        $this->fail('Disabled forecast flag was bypassed');
    } catch (HttpException $exception) {
        expect($exception->getStatusCode())->toBe(403);
    }
});

test('forecast daily adapter rejects invented pre-opening days even when the creator is verified Pro', function () {
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.forecast', true);
    [$creator, $workspaceId] = forecastSourceFixture();
    forecastSourcePro($creator);
    $workspace = Workspace::query()->findOrFail($workspaceId);
    $workspace->forceFill(['created_at' => CarbonImmutable::parse('2026-10-20 00:00:00', 'UTC')])->save();

    expect(fn () => app(VerifiedRevenueDailySeries::class)->forCreator(
        $creator, $workspaceId,
        CarbonImmutable::parse('2026-10-01', 'UTC'),
        CarbonImmutable::parse('2026-10-30', 'UTC')
    ))->toThrow(InvalidArgumentException::class, 'Forecast history predates workspace creation.');
});

test('forecast adapter rejects incomplete UTC history and non-UTC or invalid boundaries', function () {
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.forecast', true);
    [$creator, $workspace] = forecastSourceFixture();
    forecastSourcePro($creator);
    $service = app(VerifiedRevenueDailySeries::class);
    expect(fn () => $service->forCreator($creator, $workspace, CarbonImmutable::now('UTC')->subDay(), CarbonImmutable::now('UTC')))
        ->toThrow(InvalidArgumentException::class);
    expect(fn () => $service->forCreator($creator, $workspace, CarbonImmutable::parse('2026-10-15', 'UTC'), CarbonImmutable::parse('2026-10-01', 'UTC')))
        ->toThrow(InvalidArgumentException::class);
    expect(fn () => $service->forCreator($creator, $workspace, CarbonImmutable::parse('2026-10-01', 'Africa/Addis_Ababa'), CarbonImmutable::parse('2026-10-30', 'UTC')))
        ->toThrow(InvalidArgumentException::class);
});

test('rolling origin comparison uses two independent holdouts and rejects historical regression', function () {
    $steady = array_fill(0, 90, ['verified_revenue_cents' => 10000]);
    $seven = (new RollingRevenueBacktest())->evaluate(array_slice($steady, 0, 30), 7);
    expect($seven['fold_count'])->toBe(2)
        ->and($seven['candidate_mae_cents'])->toBe(0)
        ->and($seven['naive_mae_cents'])->toBe(0)
        ->and($seven['all_folds_pass'])->toBeTrue();
    $thirty = (new RollingRevenueBacktest())->evaluate($steady, 30);
    expect($thirty['fold_count'])->toBe(2)->and($thirty['all_folds_pass'])->toBeTrue();
    $history = array_fill(0, 30, ['verified_revenue_cents' => 10000]);
    for ($day = 9; $day < 15; $day++) {
        $history[$day]['verified_revenue_cents'] = 0;
    }
    $result = (new RollingRevenueBacktest())->evaluate($history, 7);
    expect($result['all_folds_pass'])->toBeFalse();
});


/** @return array<string,mixed> */
function forecastCheckpointFixture(
    int $workspaceId,
    string $date,
    string $source,
    int $sales = 0,
    int $revenueCents = 0,
    array $overrides = [],
): array {
    $watermark = CarbonImmutable::parse($date, 'UTC')->addDays(3)->startOfDay();

    return [
        'workspace_id' => $workspaceId,
        'observed_on' => $date,
        'source_kind' => $source,
        'verified_sales_count' => $sales,
        'verified_gross_cents' => $revenueCents,
        'source_cursor_sha256' => hash('sha256', $workspaceId.'|'.$date.'|'.$source),
        'source_watermark_at' => $watermark->toDateTimeString(),
        'captured_at' => $watermark->addHour()->toDateTimeString(),
        'sealed_at' => $watermark->addHours(2)->toDateTimeString(),
        'created_at' => now()->toDateTimeString(),
        'updated_at' => now()->toDateTimeString(),
        ...$overrides,
    ];
}

test('forecast checkpoint audit fails closed on missing sources and refuses to trust matching local projections', function () {
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.forecast', true);
    [$creator, $workspaceId] = forecastSourceFixture();
    forecastSourcePro($creator);
    $daily = [['date' => '2026-10-12', 'verified_sales_count' => 0, 'verified_revenue_cents' => 0]];
    $audit = app(ForecastObservationCheckpointAudit::class);

    $missing = $audit->assess($creator, $workspaceId, $daily);
    expect($missing['independent_observation_coverage_verified'])->toBeFalse()
        ->and($missing['reason'])->toBe('checkpoint_evidence_missing');

    \Illuminate\Support\Facades\DB::table('creator_ai_forecast_coverage_checkpoints')
        ->insert(forecastCheckpointFixture($workspaceId, '2026-10-12', 'checkout_event_stream'));

    $partial = $audit->assess($creator, $workspaceId, $daily);
    expect($partial['reason'])->toBe('checkpoint_source_missing');

    \Illuminate\Support\Facades\DB::table('creator_ai_forecast_coverage_checkpoints')
        ->insert(forecastCheckpointFixture($workspaceId, '2026-10-12', 'verify_et_reconciliation'));

    $reconciled = $audit->assess($creator, $workspaceId, $daily);
    expect($reconciled['independent_observation_coverage_verified'])->toBeFalse()
        ->and($reconciled['external_source_authenticity_verified'])->toBeFalse()
        ->and($reconciled['locally_reconciled_checkpoint_days'])->toBe(1)
        ->and($reconciled['reason'])->toBe('checkpoint_lineage_not_independently_attested');

    $encoded = json_encode($reconciled, JSON_THROW_ON_ERROR);
    expect($encoded)->not->toContain('buyer')
        ->not->toContain('settlement_account')
        ->not->toContain('estimated_total_gross_cents');
});

test('forecast audit detects conflicting amounts, suspicious cursor reuse and incomplete source watermarks', function () {
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.forecast', true);
    [$creator, $workspaceId] = forecastSourceFixture();
    forecastSourcePro($creator);
    $daily = [['date' => '2026-10-12', 'verified_sales_count' => 1, 'verified_revenue_cents' => 10000]];
    $table = \Illuminate\Support\Facades\DB::table('creator_ai_forecast_coverage_checkpoints');

    $table->insert(forecastCheckpointFixture($workspaceId, '2026-10-12', 'checkout_event_stream', 1, 10000));
    $table->insert(forecastCheckpointFixture($workspaceId, '2026-10-12', 'verify_et_reconciliation', 1, 9999));

    $audit = app(ForecastObservationCheckpointAudit::class);
    expect($audit->assess($creator, $workspaceId, $daily)['reason'])
        ->toBe('checkpoint_aggregate_mismatch');

    $table->where('workspace_id', $workspaceId)
        ->where('source_kind', 'verify_et_reconciliation')
        ->update(['verified_gross_cents' => 10000, 'source_cursor_sha256' =>
            hash('sha256', $workspaceId.'|2026-10-12|checkout_event_stream')]);

    expect($audit->assess($creator, $workspaceId, $daily)['reason'])
        ->toBe('checkpoint_source_cursor_collision');

    $table->where('workspace_id', $workspaceId)
        ->where('source_kind', 'verify_et_reconciliation')
        ->update(['source_cursor_sha256' => hash('sha256', 'distinct-synthetic-verify-et-checkpoint'),
            'sealed_at' => null]);

    expect($audit->assess($creator, $workspaceId, $daily)['reason'])
        ->toBe('checkpoint_not_sealed');

    $table->where('workspace_id', $workspaceId)
        ->where('source_kind', 'verify_et_reconciliation')
        ->update([
            'sealed_at' => '2026-10-15 02:00:00',
            'captured_at' => '2026-10-15 01:00:00',
            'source_watermark_at' => '2026-10-13 00:00:00',
        ]);

    expect($audit->assess($creator, $workspaceId, $daily)['reason'])
        ->toBe('checkpoint_watermark_incomplete');
});

test('checkpoint lookups are workspace-scoped and require live verified Pro and forecast flag', function () {
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.forecast', true);
    [$creator, $workspaceId] = forecastSourceFixture();
    [$other, $foreignWorkspace] = forecastSourceFixture();
    forecastSourcePro($creator);
    forecastSourcePro($other);

    $daily = [['date' => '2026-10-12', 'verified_sales_count' => 0, 'verified_revenue_cents' => 0]];
    \Illuminate\Support\Facades\DB::table('creator_ai_forecast_coverage_checkpoints')->insert([
        forecastCheckpointFixture($foreignWorkspace, '2026-10-12', 'checkout_event_stream'),
        forecastCheckpointFixture($foreignWorkspace, '2026-10-12', 'verify_et_reconciliation'),
    ]);

    $audit = app(ForecastObservationCheckpointAudit::class);
    expect($audit->assess($creator, $workspaceId, $daily)['reason'])
        ->toBe('checkpoint_evidence_missing');

    try {
        $audit->assess($creator, $foreignWorkspace, $daily);
        $this->fail('Creator could audit a foreign workspace');
    } catch (HttpException $exception) {
        expect($exception->getStatusCode())->toBe(403);
    }

    config()->set('creator_ai.features.forecast', false);
    try {
        $audit->assess($creator, $workspaceId, $daily);
        $this->fail('Disabled forecast capability was bypassed');
    } catch (HttpException $exception) {
        expect($exception->getStatusCode())->toBe(403);
    }
});

test('checkpoint audit rejects fabricated missing calendar dates before querying source data', function () {
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.forecast', true);
    [$creator, $workspaceId] = forecastSourceFixture();
    forecastSourcePro($creator);
    $daily = [
        ['date' => '2026-10-12', 'verified_sales_count' => 0, 'verified_revenue_cents' => 0],
        ['date' => '2026-10-14', 'verified_sales_count' => 0, 'verified_revenue_cents' => 0],
    ];
    expect(fn () => app(ForecastObservationCheckpointAudit::class)->assess($creator, $workspaceId, $daily))
        ->toThrow(InvalidArgumentException::class, 'Invalid or incomplete checkpoint calendar.');
});

test('creator forecast readiness remains nonpublishable even with matching checkpoint records', function () {
    config()->set('creator_ai.enabled', true);
    config()->set('creator_ai.features.forecast', true);
    [$creator, $workspaceId] = forecastSourceFixture();
    forecastSourcePro($creator);

    $report = app(CreatorForecastReadinessReport::class)->assess(
        $creator,
        $workspaceId,
        CarbonImmutable::parse('2026-10-11', 'UTC'),
        CarbonImmutable::parse('2026-10-13', 'UTC'),
    );

    expect($report['eligible'])->toBeFalse()
        ->and($report['reason'])->toBe('insufficient_history')
        ->and($report['checkpoint_audit_reason'])->toBe('checkpoint_evidence_missing')
        ->and($report['independent_observation_coverage_verified'])->toBeFalse();

    foreach (['estimated_total_gross_cents', 'indicative_upper_gross_cents'] as $secretField) {
        expect(array_key_exists($secretField, $report))->toBeFalse();
    }
});
