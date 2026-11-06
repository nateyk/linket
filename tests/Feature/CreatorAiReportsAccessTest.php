<?php

use App\CreatorAi\Services\CreatorAiAccess;
use App\CreatorAi\Services\SalesSummaryService;
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
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(DatabaseTransactions::class);

function aiReportsEnable(string ...$capabilities): void
{
    config()->set('creator_ai.enabled', true);
    foreach ($capabilities as $capability) {
        config()->set('creator_ai.features.'.$capability, true);
    }
}

/** @return array{0: User, 1: \Common\Workspaces\Models\Workspace, 2: DigitalProduct} */
function aiReportsFixture(string $title = 'Synthetic reporting product'): array
{
    $creator = User::factory()->create(['email_verified_at' => now()]);
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => $title,
        'price_cents' => 10000,
        'currency' => 'ETB',
        'status' => 'approved',
        'approved_at' => now(),
        'type' => 'digital',
    ]);

    return [$creator, $workspace, $product];
}

/** @param array<string, mixed> $attributes */
function aiReportsOrder(User $creator, DigitalProduct $product, array $attributes = []): StorefrontOrder
{
    return StorefrontOrder::query()->create([
        'uuid' => (string) Str::uuid(),
        'creator_id' => $creator->id,
        'digital_product_id' => $product->id,
        'buyer_name' => 'SECRET BUYER NAME',
        'buyer_email' => 'secret-buyer@example.test',
        'payment_reference' => 'PRIVATE-AI-REF-'.Str::upper(Str::random(16)),
        'payment_account_snapshot' => '100045678912345',
        'currency' => 'ETB',
        'gross_amount_cents' => 10000,
        'creator_earnings_cents' => 10000,
        'commission_bps' => 0,
        'platform_fee_cents' => 0,
        'status' => 'paid',
        'payment_gateway' => 'verify_et',
        'created_at' => '2026-10-18 08:00:00',
        'paid_at' => '2026-10-19 09:00:00',
        ...$attributes,
    ]);
}

function aiReportsActAs($test, User $creator): void
{
    ActiveWorkspace::clearCache();
    $test->withSession(['_token' => 'ai-reports-test'])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', 'ai-reports-test')
        ->actingAs($creator);
}

/** Create synthetic verified Pro evidence without calling Verify.et. */
function aiReportsPro(User $creator, bool $verified = true, bool $expired = false): void
{
    settings()->save(['billing.enable' => true]);
    $plan = Product::query()->where('system_key', 'pro')->first()
        ?? Product::query()->create([
            'name' => 'AI Pro synthetic',
            'uuid' => (string) Str::uuid(),
            'system_key' => 'pro',
            'free' => false,
            'is_default' => false,
            'active' => true,
        ]);
    $price = Price::query()->where('product_id', $plan->id)
        ->where('currency', 'ETB')->where('interval', 'month')->first()
        ?? Price::query()->create([
            'product_id' => $plan->id,
            'currency' => 'ETB',
            'amount' => 500,
            'interval' => 'month',
            'interval_count' => 1,
        ]);
    $endsAt = $expired ? now()->subDay() : now()->addMonth();

    Subscription::query()->create([
        'user_id' => $creator->id,
        'product_id' => $plan->id,
        'price_id' => $price->id,
        'gateway_name' => 'verify_et',
        'gateway_status' => 'active',
        'renews_at' => $endsAt,
    ]);

    if (!$verified) {
        return;
    }

    $payment = ProSubscriptionPayment::query()->create([
        'uuid' => (string) Str::uuid(),
        'creator_id' => $creator->id,
        'product_id' => $plan->id,
        'price_id' => $price->id,
        'amount_cents' => 50000,
        'status' => 'paid',
        'paid_at' => now()->subDay(),
        'subscription_period_start' => now()->subDay(),
        'subscription_period_end' => $endsAt,
    ]);

    DirectPaymentVerification::query()->create([
        'reference' => 'AI-PRO-'.Str::upper(Str::random(16)),
        'payable_type' => ProSubscriptionPayment::class,
        'payable_id' => $payment->id,
        'bank_code' => 'cbe',
        'settlement_account' => '1000123456789',
        'amount_cents' => 50000,
        'currency' => 'ETB',
        'status' => 'success',
        'verified_at' => now()->subDay(),
    ]);
}

test('AI reporting is disabled by default even for an authenticated creator', function () {
    [$creator, $workspace] = aiReportsFixture();
    aiReportsActAs($this, $creator);
    $this->getJson('/api/v1/creator-ai/sales-summary?'.http_build_query([
        'workspace_id' => $workspace->id, 'from' => '2026-10-01', 'to' => '2026-10-31',
    ]))->assertForbidden();
});

test('AI summary allows Free basic reporting only when globally and individually enabled', function () {
    [$creator, $workspace, $product] = aiReportsFixture();
    aiReportsOrder($creator, $product, ['gross_amount_cents' => 12000]);
    aiReportsOrder($creator, $product, ['gross_amount_cents' => 200000, 'status' => 'manual_review']);
    aiReportsEnable('sales_summary');
    aiReportsActAs($this, $creator);

    $response = $this->getJson('/api/v1/creator-ai/sales-summary?'.http_build_query([
        'workspace_id' => $workspace->id, 'from' => '2026-10-01', 'to' => '2026-10-31',
    ]))->assertOk()->assertJsonPath('data.verified_sales_count', 1)
        ->assertJsonPath('data.verified_revenue_cents', 12000)
        ->assertJsonPath('data.currency', 'ETB');
    expect($response->headers->get('Cache-Control'))->toContain('no-store');

    config()->set('creator_ai.features.sales_summary', false);
    $this->getJson('/api/v1/creator-ai/sales-summary?'.http_build_query([
        'workspace_id' => $workspace->id, 'from' => '2026-10-01', 'to' => '2026-10-31',
    ]))->assertForbidden();
});

test('feature and workspace authorization is also enforced at service layer', function () {
    [$creator, $workspace] = aiReportsFixture();
    [, $foreignWorkspace] = aiReportsFixture();
    $from = CarbonImmutable::parse('2026-10-01');
    $to = CarbonImmutable::parse('2026-10-31');

    try {
        app(SalesSummaryService::class)->summary($creator, $workspace->id, $from, $to);
        $this->fail('Disabled feature leaked reporting information.');
    } catch (HttpException $exception) {
        expect($exception->getStatusCode())->toBe(403);
    }

    aiReportsEnable('sales_summary');
    try {
        app(SalesSummaryService::class)->summary($creator, $foreignWorkspace->id, $from, $to);
        $this->fail('Foreign workspace was authorized.');
    } catch (HttpException $exception) {
        expect($exception->getStatusCode())->toBe(403);
    }
});

test('Free plan is denied detailed order insights and MCP even when their flags are enabled', function () {
    [$creator, $workspace] = aiReportsFixture();
    aiReportsEnable('order_insights', 'mcp');
    aiReportsActAs($this, $creator);

    expect(app(CreatorAiAccess::class)->allows($creator, $workspace->id, 'mcp'))->toBeFalse();
    $this->getJson('/api/v1/creator-ai/order-insights?'.http_build_query([
        'workspace_id' => $workspace->id, 'from' => '2026-10-01', 'to' => '2026-10-31',
    ]))->assertForbidden();
});

test('unverified and expired Pro cannot unlock advanced AI or MCP', function () {
    aiReportsEnable('order_insights', 'mcp');

    [$unverified, $unverifiedWorkspace] = aiReportsFixture();
    aiReportsPro($unverified, verified: false);
    expect(app(CreatorAiAccess::class)->allows($unverified, $unverifiedWorkspace->id, 'mcp'))->toBeFalse();

    [$expired, $expiredWorkspace] = aiReportsFixture();
    aiReportsPro($expired, expired: true);
    expect(app(CreatorAiAccess::class)->allows($expired, $expiredWorkspace->id, 'mcp'))->toBeFalse();
});

test('verified current Pro can read sanitized, bounded order insights in their own workspace', function () {
    [$creator, $workspace, $product] = aiReportsFixture('AI insights guide');
    [$foreignCreator, , $foreignProduct] = aiReportsFixture('Foreign private guide');
    aiReportsPro($creator);
    aiReportsEnable('order_insights', 'mcp');
    aiReportsOrder($creator, $product, ['status' => 'paid', 'gross_amount_cents' => 17000]);
    aiReportsOrder($creator, $product, ['status' => 'fulfilled', 'gross_amount_cents' => 3000]);
    aiReportsOrder($creator, $product, ['status' => 'manual_review', 'gross_amount_cents' => 90000, 'paid_at' => null]);
    aiReportsOrder($creator, $product, ['status' => 'pending_payment', 'gross_amount_cents' => 40000, 'paid_at' => null]);
    aiReportsOrder($creator, $product, ['status' => 'paid', 'gross_amount_cents' => 50000, 'currency' => 'USD']);
    aiReportsOrder($foreignCreator, $foreignProduct, ['gross_amount_cents' => 900000]);

    aiReportsActAs($this, $creator);
    expect(app(CreatorAiAccess::class)->allows($creator, $workspace->id, 'mcp'))->toBeTrue();
    $response = $this->getJson('/api/v1/creator-ai/order-insights?'.http_build_query([
        'workspace_id' => $workspace->id, 'from' => '2026-10-01',
        'to' => '2026-10-31', 'page' => 1, 'per_page' => 1,
    ]))->assertOk()
        ->assertJsonPath('data.verified_sales_count', 2)
        ->assertJsonPath('data.verified_revenue_cents', 20000)
        ->assertJsonPath('data.status_counts.manual_review', 1)
        ->assertJsonPath('data.orders.total', 2)
        ->assertJsonPath('data.orders.page', 1)
        ->assertJsonCount(1, 'data.orders.data');

    $text = $response->getContent();
    foreach (['SECRET BUYER NAME', 'secret-buyer@example.test', 'PRIVATE-AI-REF-', '100045678912345', 'Foreign private guide'] as $private) {
        expect($text)->not->toContain($private);
    }

    $this->getJson('/api/v1/creator-ai/order-insights?'.http_build_query([
        'workspace_id' => $workspace->id, 'from' => '2026-10-01',
        'to' => '2026-10-31', 'per_page' => 200,
    ]))->assertUnprocessable();
});

test('basic product performance ranks verified ETB revenue without exposing other workspace products', function () {
    [$creator, $workspace, $product] = aiReportsFixture('Owned AI product');
    $second = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id, 'user_id' => $creator->id, 'title' => 'Second owned item',
        'price_cents' => 10000, 'currency' => 'ETB', 'status' => 'approved',
        'approved_at' => now(), 'type' => 'digital',
    ]);
    [$foreignCreator, , $foreignProduct] = aiReportsFixture('Foreign product secret');
    aiReportsOrder($creator, $product, ['gross_amount_cents' => 13000]);
    aiReportsOrder($creator, $product, ['gross_amount_cents' => 7000, 'status' => 'fulfilled']);
    aiReportsOrder($creator, $second, ['gross_amount_cents' => 18000]);
    aiReportsOrder($creator, $second, ['gross_amount_cents' => 900000, 'status' => 'manual_review']);
    aiReportsOrder($foreignCreator, $foreignProduct, ['gross_amount_cents' => 600000]);
    aiReportsEnable('product_performance');
    aiReportsActAs($this, $creator);

    $response = $this->getJson('/api/v1/creator-ai/product-performance?'.http_build_query([
        'workspace_id' => $workspace->id, 'from' => '2026-10-01', 'to' => '2026-10-31',
        'limit' => 2,
    ]))->assertOk()->assertJsonPath('data.items.0.id', $product->id)
        ->assertJsonPath('data.items.0.verified_sales_count', 2)
        ->assertJsonPath('data.items.0.verified_revenue_cents', 20000)
        ->assertJsonPath('data.items.1.verified_revenue_cents', 18000)
        ->assertJsonCount(2, 'data.items');

    expect($response->getContent())->not->toContain('Foreign product secret')
        ->not->toContain('SECRET BUYER NAME')
        ->not->toContain('100045678912345');
});

test('report routes reject missing workspace IDs, foreign workspaces and oversized periods', function () {
    [$creator, $workspace] = aiReportsFixture();
    [, $foreignWorkspace] = aiReportsFixture();
    aiReportsEnable('sales_summary');
    aiReportsActAs($this, $creator);

    $this->getJson('/api/v1/creator-ai/sales-summary?from=2026-10-01&to=2026-10-31')
        ->assertUnprocessable();

    $this->getJson('/api/v1/creator-ai/sales-summary?'.http_build_query([
        'workspace_id' => $foreignWorkspace->id, 'from' => '2026-10-01', 'to' => '2026-10-31',
    ]))->assertForbidden();

    $this->getJson('/api/v1/creator-ai/sales-summary?'.http_build_query([
        'workspace_id' => $workspace->id, 'from' => '2024-01-01', 'to' => '2026-10-31',
    ]))->assertUnprocessable();
});

test('unauthenticated users cannot query AI reporting routes', function () {
    $this->getJson('/api/v1/creator-ai/sales-summary?workspace_id=1&from=2026-10-01&to=2026-10-31')
        ->assertUnauthorized();
});
