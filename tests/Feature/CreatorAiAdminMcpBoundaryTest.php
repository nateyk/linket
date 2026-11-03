<?php

use App\CreatorAi\Services\CreatorAiSettings;
use App\CreatorAi\Services\CreatorAiUsageService;
use App\CreatorAi\Services\CreatorMcpReportFacade;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Carbon\CarbonImmutable;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Permissions\Models\Permission;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(DatabaseTransactions::class);

function creatorAiAdminTestActAs($test, User $user): void
{
    $test->withSession(['_token' => 'creator-ai-admin-test'])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', 'creator-ai-admin-test')
        ->actingAs($user);
}

function creatorAiAdminTestUser(): User
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    foreach (['admin', 'settings.update'] as $permission) {
        $user->permissions()->attach(Permission::query()->firstOrCreate(['name' => $permission]));
    }

    return $user;
}

/** @return array{0: User, 1: int, 2: DigitalProduct} */
function creatorAiMcpTestCreator(): array
{
    $creator = User::factory()->create(['email_verified_at' => now()]);
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $product = DigitalProduct::query()->create([
        'user_id' => $creator->id,
        'workspace_id' => $workspace->id,
        'title' => 'Only this creator title',
        'description' => 'Synthetic private reporting product',
        'price_cents' => 10000,
        'currency' => 'ETB',
        'status' => 'approved',
        'approved_at' => now(),
        'type' => 'digital',
    ]);

    return [$creator, (int) $workspace->id, $product];
}

function creatorAiMcpTestPro(User $creator): void
{
    $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
    $price = Price::query()->where('product_id', $plan->id)->where('currency', 'ETB')->firstOrFail();

    Subscription::query()->create([
        'user_id' => $creator->id,
        'product_id' => $plan->id,
        'price_id' => $price->id,
        'gateway_name' => 'verify_et',
        'gateway_status' => 'active',
        'renews_at' => now()->addMonth(),
    ]);

    $payment = ProSubscriptionPayment::query()->create([
        'uuid' => (string) Str::uuid(),
        'creator_id' => $creator->id,
        'product_id' => $plan->id,
        'price_id' => $price->id,
        'amount_cents' => 50000,
        'status' => 'paid',
        'paid_at' => now()->subDay(),
        'subscription_period_start' => now()->subDay(),
        'subscription_period_end' => now()->addMonth(),
    ]);

    DirectPaymentVerification::query()->create([
        'reference' => 'AI-MCP-PRO-'.Str::upper(Str::random(14)),
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

function creatorAiMcpTestFlagOn(): void
{
    config()->set('creator_ai.enabled', true);
    foreach (['mcp', 'sales_summary', 'sales_trends', 'order_insights', 'product_performance'] as $flag) {
        config()->set('creator_ai.features.'.$flag, true);
    }
}

test('AI Admin settings API denies unauthenticated and ordinary creators', function () {
    $this->getJson('/api/v1/admin/creator-ai/settings')->assertUnauthorized();
    creatorAiAdminTestActAs($this, User::factory()->create(['email_verified_at' => now()]));
    $this->getJson('/api/v1/admin/creator-ai/settings')->assertForbidden();
    $this->patchJson('/api/v1/admin/creator-ai/settings', ['enabled' => true])->assertForbidden();
});

test('AI Admin can configure and rotate an encrypted write-only key without exposing it', function () {
    $admin = creatorAiAdminTestUser();
    creatorAiAdminTestActAs($this, $admin);

    $config = [
        'enabled' => true,
        'provider' => 'openai',
        'api_key' => 'sk-test-admin-rotate-first',
        'free_monthly_limit' => 10,
        'pro_monthly_limit' => 100,
        'provider_monthly_budget_microusd' => 3000000,
        'per_request_reservation_microusd' => 100000,
    ];

    $update = $this->patchJson('/api/v1/admin/creator-ai/settings', $config)
        ->assertOk()
        ->assertJsonPath('data.api_key_configured', true)
        ->assertJsonPath('data.free_monthly_limit', 10)
        ->assertJsonPath('data.pro_monthly_limit', 100);
    expect($update->getContent())->not->toContain('sk-test-admin-rotate-first');
    expect($update->headers->get('Cache-Control'))->toContain('no-store');

    $read = $this->getJson('/api/v1/admin/creator-ai/settings')->assertOk();
    expect($read->getContent())->not->toContain('sk-test-admin-rotate-first');

    $this->patchJson('/api/v1/admin/creator-ai/settings', [
        'api_key' => 'sk-test-admin-rotate-second',
    ])->assertOk();

    $ciphertext = DB::table('creator_ai_settings')->where('id', 1)->value('encrypted_config');
    expect($ciphertext)->not->toContain('sk-test-admin-rotate-first')
        ->not->toContain('sk-test-admin-rotate-second');
    expect(app(CreatorAiSettings::class)->apiKey())->toBe('sk-test-admin-rotate-second');
});

test('AI Admin rejects unsafe provider configuration and a provider-specific arbitrary endpoint', function () {
    creatorAiAdminTestActAs($this, creatorAiAdminTestUser());
    $this->patchJson('/api/v1/admin/creator-ai/settings', ['provider' => 'unvetted-provider'])
        ->assertUnprocessable();
    $this->patchJson('/api/v1/admin/creator-ai/settings', ['endpoint_url' => 'https://attacker.test'])
        ->assertUnprocessable();
});

test('creator usage endpoint returns their own quota status but no provider credentials', function () {
    [$creator] = creatorAiMcpTestCreator();
    creatorAiAdminTestActAs($this, $creator);

    $response = $this->getJson('/api/v1/creator-ai/usage')
        ->assertOk()
        ->assertJsonPath('data.plan', 'free')
        ->assertJsonPath('data.limit', 10)
        ->assertJsonPath('data.remaining', 10);
    expect($response->getContent())->not->toContain('api_key');
    expect($response->headers->get('Cache-Control'))->toContain('no-store');
});

test('MCP reporting facade is Pro-only and fails closed for other workspaces', function () {
    creatorAiMcpTestFlagOn();
    [$freeCreator, $freeWorkspace] = creatorAiMcpTestCreator();
    [$proCreator, $proWorkspace] = creatorAiMcpTestCreator();
    creatorAiMcpTestPro($proCreator);
    $bridge = app(CreatorMcpReportFacade::class);
    $from = CarbonImmutable::parse('2026-10-01');
    $to = CarbonImmutable::parse('2026-10-31');

    try {
        $bridge->salesSummary($freeCreator, $freeWorkspace, $from, $to);
        $this->fail('Free creator used read-only MCP.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(403);
    }

    try {
        $bridge->salesSummary($proCreator, $freeWorkspace, $from, $to);
        $this->fail('Pro creator accessed another workspace through MCP.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(403);
    }

    expect($bridge->salesSummary($proCreator, $proWorkspace, $from, $to)['verified_sales_count'])
        ->toBe(0);
});

test('MCP reporting facade returns only safe verified sales, trends, order and product fields', function () {
    creatorAiMcpTestFlagOn();
    [$creator, $workspaceId, $product] = creatorAiMcpTestCreator();
    [$other, , $foreignProduct] = creatorAiMcpTestCreator();
    creatorAiMcpTestPro($creator);

    StorefrontOrder::query()->create([
        'uuid' => (string) Str::uuid(),
        'creator_id' => $creator->id,
        'digital_product_id' => $product->id,
        'buyer_name' => 'SECRET MCP BUYER',
        'buyer_email' => 'hidden-mcp@example.test',
        'payment_reference' => 'HIDDEN-MCP-REF-'.Str::random(12),
        'currency' => 'ETB',
        'gross_amount_cents' => 24000,
        'creator_earnings_cents' => 24000,
        'commission_bps' => 0,
        'platform_fee_cents' => 0,
        'payment_gateway' => 'verify_et',
        'status' => 'paid',
        'paid_at' => '2026-10-18 10:00:00',
    ]);
    StorefrontOrder::query()->create([
        'uuid' => (string) Str::uuid(),
        'creator_id' => $other->id,
        'digital_product_id' => $foreignProduct->id,
        'buyer_email' => 'other-creator@example.test',
        'currency' => 'ETB',
        'gross_amount_cents' => 9000000,
        'creator_earnings_cents' => 9000000,
        'commission_bps' => 0,
        'platform_fee_cents' => 0,
        'payment_gateway' => 'verify_et',
        'status' => 'paid',
        'paid_at' => '2026-10-18 10:00:00',
    ]);

    $bridge = app(CreatorMcpReportFacade::class);
    $from = CarbonImmutable::parse('2026-10-01');
    $to = CarbonImmutable::parse('2026-10-31');

    expect($bridge->salesSummary($creator, $workspaceId, $from, $to)['verified_revenue_cents'])
        ->toBe(24000);
    expect($bridge->salesTrends($creator, $workspaceId, $from, $to)['points'][0]['verified_revenue_cents'])
        ->toBe(24000);
    expect($bridge->orderInsights($creator, $workspaceId, $from, $to)['verified_sales_count'])
        ->toBe(1);
    expect($bridge->listOrders($creator, $workspaceId, $from, $to)['orders']['total'])
        ->toBe(1);
    expect($bridge->productPerformance($creator, $workspaceId, $from, $to)['items'][0]['verified_sales_count'])
        ->toBe(1);

    $serialized = json_encode([
        $bridge->salesSummary($creator, $workspaceId, $from, $to),
        $bridge->salesTrends($creator, $workspaceId, $from, $to),
        $bridge->listOrders($creator, $workspaceId, $from, $to),
        $bridge->productPerformance($creator, $workspaceId, $from, $to),
    ], JSON_THROW_ON_ERROR);

    foreach (['SECRET MCP BUYER', 'hidden-mcp@example.test', 'other-creator@example.test', 'HIDDEN-MCP-REF'] as $secret) {
        expect($serialized)->not->toContain($secret);
    }

    expect(app(CreatorAiUsageService::class)->summary($creator)['remaining'])->toBe(10);
});

test('MCP forecast stays disabled until a tested forecast engine exists', function () {
    creatorAiMcpTestFlagOn();
    config()->set('creator_ai.features.forecast', true);
    [$creator, $workspaceId] = creatorAiMcpTestCreator();
    creatorAiMcpTestPro($creator);

    try {
        app(CreatorMcpReportFacade::class)->salesForecast($creator, $workspaceId, 7);
        $this->fail('An unsupported forecast was exposed.');
    } catch (HttpException $e) {
        expect($e->getStatusCode())->toBe(503);
    }
});
