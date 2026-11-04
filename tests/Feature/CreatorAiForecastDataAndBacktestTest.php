<?php

use App\CreatorAi\Forecasting\RollingRevenueBacktest;
use App\CreatorAi\Forecasting\VerifiedRevenueDailySeries;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Carbon\CarbonImmutable;
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

function forecastSourceOrder(User $creator, DigitalProduct $product, string $status, int $cents, string $currency = 'ETB'): void
{
    StorefrontOrder::query()->create([
        'uuid' => (string) Str::uuid(), 'creator_id' => $creator->id, 'digital_product_id' => $product->id,
        'buyer_name' => 'PRIVATE FORECAST BUYER', 'buyer_email' => 'private-forecast@example.test',
        'payment_reference' => 'PRIVATE-FORECAST-REFERENCE-'.Str::random(12), 'currency' => $currency,
        'gross_amount_cents' => $cents, 'creator_earnings_cents' => $cents,
        'commission_bps' => 0, 'platform_fee_cents' => 0, 'payment_gateway' => 'verify_et',
        'status' => $status, 'paid_at' => '2026-10-12 10:00:00',
    ]);
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
