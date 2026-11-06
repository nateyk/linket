<?php

use App\CreatorAi\Services\CreatorAiUsageService;
use App\CreatorAi\Services\CreatorMcpConnectionRegistry;
use App\CreatorAi\Services\CreatorMcpToolGateway;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(DatabaseTransactions::class);

/** @return array{0: User, 1: int, 2: DigitalProduct} */
function mcpToolGatewayCreator(): array
{
    $creator = User::factory()->create(['email_verified_at' => now()]);
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Private creator guide',
        'price_cents' => 10000,
        'currency' => 'ETB',
        'status' => 'approved',
        'approved_at' => now(),
        'type' => 'digital',
    ]);

    return [$creator, (int) $workspace->getKey(), $product];
}

function mcpToolGatewayEnable(): void
{
    config()->set('creator_ai.enabled', true);
    foreach (['mcp', 'sales_summary', 'sales_trends', 'order_insights', 'product_performance'] as $name) {
        config()->set('creator_ai.features.'.$name, true);
    }
}

function mcpToolGatewayVerifiedPro(User $creator): void
{
    $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
    $price = Price::query()->where('product_id', $plan->id)
        ->where('currency', 'ETB')->firstOrFail();

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
        'reference' => 'MCP-GATE-'.Str::upper(Str::random(16)),
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

function mcpToolGatewaySale(User $creator, DigitalProduct $product, string $status = 'paid'): void
{
    StorefrontOrder::query()->create([
        'uuid' => (string) Str::uuid(),
        'creator_id' => $creator->id,
        'digital_product_id' => $product->id,
        'buyer_name' => 'PRIVATE MCP BUYER NAME',
        'buyer_email' => 'private-mcp-buyer@example.test',
        'payment_reference' => 'SECRET-MCP-REFERENCE-'.Str::random(12),
        'payment_account_snapshot' => '100045678912345',
        'currency' => 'ETB',
        'gross_amount_cents' => 24000,
        'creator_earnings_cents' => 24000,
        'commission_bps' => 0,
        'platform_fee_cents' => 0,
        'payment_gateway' => 'verify_et',
        'status' => $status,
        'created_at' => '2026-10-18 10:00:00',
        'paid_at' => $status === 'paid' ? '2026-10-18 10:00:00' : null,
    ]);
}

test('MCP gateway exposes five read-only tools while forecast remains unadvertised and gated', function () {
    $gateway = app(CreatorMcpToolGateway::class);

    expect($gateway->availableTools())->toBe([
        'sales_summary',
        'sales_trends',
        'order_insights',
        'list_orders',
        'product_performance',
    ]);
});

test('MCP gateway resolves scope from verified consent and returns sanitized reports without burning credits', function () {
    mcpToolGatewayEnable();
    [$creator, $workspaceId, $product] = mcpToolGatewayCreator();
    mcpToolGatewayVerifiedPro($creator);
    mcpToolGatewaySale($creator, $product);
    mcpToolGatewaySale($creator, $product, 'manual_review');

    [$foreign, , $foreignProduct] = mcpToolGatewayCreator();
    mcpToolGatewaySale($foreign, $foreignProduct);

    $grant = app(CreatorMcpConnectionRegistry::class)->recordConsent(
        $creator, $workspaceId, 'chatgpt-verified-client'
    );
    $gateway = app(CreatorMcpToolGateway::class);
    $connectionId = $grant['id'];
    $args = ['from' => '2026-10-01', 'to' => '2026-10-31'];

    $summary = $gateway->invoke($creator, $connectionId, 'chatgpt-verified-client', 'sales_summary', $args);
    expect($summary['verified_sales_count'])->toBe(1)
        ->and($summary['verified_revenue_cents'])->toBe(24000);

    $trend = $gateway->invoke($creator, $connectionId, 'chatgpt-verified-client', 'sales_trends', $args);
    expect($trend['points'][0]['verified_revenue_cents'])->toBe(24000);

    $insights = $gateway->invoke($creator, $connectionId, 'chatgpt-verified-client', 'order_insights', $args);
    expect($insights['verified_sales_count'])->toBe(1)
        ->and($insights['status_counts']['manual_review'])->toBe(1);

    $orders = $gateway->invoke($creator, $connectionId, 'chatgpt-verified-client', 'list_orders', [
        ...$args, 'page' => 1, 'per_page' => 1,
    ]);
    expect($orders['orders']['total'])->toBe(1);

    $products = $gateway->invoke($creator, $connectionId, 'chatgpt-verified-client', 'product_performance', [
        ...$args, 'limit' => 1,
    ]);
    expect($products['items'][0]['verified_revenue_cents'])->toBe(24000);

    $serialized = json_encode([$summary, $trend, $insights, $orders, $products], JSON_THROW_ON_ERROR);
    foreach (['PRIVATE MCP BUYER NAME', 'private-mcp-buyer@example.test', 'SECRET-MCP-REFERENCE', '100045678912345'] as $secret) {
        expect($serialized)->not->toContain($secret);
    }

    expect(app(CreatorAiUsageService::class)->summary($creator)['remaining'])->toBe(100);
});

test('MCP gateway rejects revoked, foreign, wrong-client and downgraded grants on every invocation', function () {
    mcpToolGatewayEnable();
    [$creator, $workspaceId] = mcpToolGatewayCreator();
    [$foreign] = mcpToolGatewayCreator();
    mcpToolGatewayVerifiedPro($creator);

    $registry = app(CreatorMcpConnectionRegistry::class);
    $grant = $registry->recordConsent($creator, $workspaceId, 'verified-client-a');
    $gateway = app(CreatorMcpToolGateway::class);
    $args = ['from' => '2026-10-01', 'to' => '2026-10-31'];

    foreach ([
        fn () => $gateway->invoke($foreign, $grant['id'], 'verified-client-a', 'sales_summary', $args),
        fn () => $gateway->invoke($creator, $grant['id'], 'wrong-client', 'sales_summary', $args),
    ] as $attack) {
        try {
            $attack();
            $this->fail('An unauthorized MCP tool invocation succeeded.');
        } catch (HttpException $exception) {
            expect($exception->getStatusCode())->toBe(403);
        }
    }

    $registry->revoke($creator, $grant['id']);
    try {
        $gateway->invoke($creator, $grant['id'], 'verified-client-a', 'sales_summary', $args);
        $this->fail('A revoked MCP grant still allowed tool execution.');
    } catch (HttpException $exception) {
        expect($exception->getStatusCode())->toBe(403);
    }

    $new = $registry->recordConsent($creator, $workspaceId, 'verified-client-a');
    Subscription::query()->where('user_id', $creator->id)
        ->where('gateway_name', 'verify_et')
        ->update(['gateway_status' => 'expired']);

    try {
        $gateway->invoke($creator, $new['id'], 'verified-client-a', 'sales_summary', $args);
        $this->fail('Lapsed Pro still allowed MCP tools.');
    } catch (HttpException $exception) {
        expect($exception->getStatusCode())->toBe(403);
    }
});

test('MCP gateway enforces exact tool arguments, strict dates and bounded results', function () {
    mcpToolGatewayEnable();
    [$creator, $workspaceId] = mcpToolGatewayCreator();
    mcpToolGatewayVerifiedPro($creator);
    $grant = app(CreatorMcpConnectionRegistry::class)
        ->recordConsent($creator, $workspaceId, 'verified-client-b');
    $gateway = app(CreatorMcpToolGateway::class);
    $args = ['from' => '2026-10-01', 'to' => '2026-10-31'];

    $attacks = [
        ['sales_summary', [...$args, 'workspace_id' => $workspaceId]],
        ['sales_summary', [...$args, 'user_id' => $creator->id]],
        ['sales_summary', [...$args, 'client_id' => 'other-client']],
        ['sales_summary', [...$args, 'payment_reference' => 'PRIVATE']],
        ['sales_summary', ['from' => '2026-02-30', 'to' => '2026-10-31']],
        ['sales_summary', ['from' => '2025-01-01', 'to' => '2026-10-31']],
        ['list_orders', [...$args, 'page' => 0]],
        ['list_orders', [...$args, 'per_page' => 200]],
        ['product_performance', [...$args, 'limit' => 1000]],
        ['delete_product', $args],
    ];

    foreach ($attacks as [$tool, $input]) {
        try {
            $gateway->invoke($creator, $grant['id'], 'verified-client-b', $tool, $input);
            $this->fail('Unsafe MCP tool input was accepted: '.$tool);
        } catch (HttpException $exception) {
            expect($exception->getStatusCode())->toBeIn([403, 422]);
        }
    }
});

test('unvalidated forecast tool is not exposed even if its feature flag is enabled', function () {
    mcpToolGatewayEnable();
    config()->set('creator_ai.features.forecast', true);
    [$creator, $workspaceId] = mcpToolGatewayCreator();
    mcpToolGatewayVerifiedPro($creator);
    $grant = app(CreatorMcpConnectionRegistry::class)
        ->recordConsent($creator, $workspaceId, 'verified-client-c');
    $gateway = app(CreatorMcpToolGateway::class);

    expect($gateway->availableTools())->not->toContain('sales_forecast');

    try {
        $gateway->invoke($creator, $grant['id'], 'verified-client-c', 'sales_forecast', ['days' => 7]);
        $this->fail('Unverified forecasting was exposed.');
    } catch (HttpException $exception) {
        expect($exception->getStatusCode())->toBe(503);
    }
});
