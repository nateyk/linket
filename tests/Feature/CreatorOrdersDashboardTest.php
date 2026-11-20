<?php

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductPaymentRefund;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

test('a creator without products has an empty overview and actual free allowance', function () {
    $creator = User::factory()->create();
    app(CreateWorkspace::class)->createPersonalWorkspace($creator);
    creatorOrdersDashboardActAs($this, $creator);
    $this->getJson('/api/v1/storefront/direct-orders')
        ->assertOk()->assertJsonPath('summary.verified_sales_count', 0)
        ->assertJsonPath('summary.verified_revenue_cents', 0)
        ->assertJsonPath('summary.pending_count', 0)
        ->assertJsonPath('summary.manual_review_count', 0)
        ->assertJsonPath('verification_allowance.is_pro', false)
        ->assertJsonPath('verification_allowance.consumed', 0)
        ->assertJsonCount(0, 'data.data')->assertJsonCount(0, 'sales_trend');
});

test('overview reports the actual active pro subscription', function () {
    [$creator] = creatorOrdersDashboardFixture();
    settings()->save(['billing.enable' => true]);
    $plan = \Common\Billing\Models\Product::query()->create(['name' => 'Pro', 'uuid' => (string) Str::uuid(), 'free' => false, 'is_default' => false]);
    $price = \Common\Billing\Models\Price::query()->create(['product_id' => $plan->id, 'currency' => 'ETB', 'amount' => 500, 'interval' => 'month', 'interval_count' => 1]);
    \Common\Billing\Subscription::query()->create(['user_id' => $creator->id, 'product_id' => $plan->id, 'price_id' => $price->id, 'gateway_name' => 'verify_et', 'gateway_status' => 'active', 'renews_at' => now()->addMonth()]);
    $creator = User::query()->findOrFail($creator->id);
    creatorOrdersDashboardActAs($this, $creator);
    $this->getJson('/api/v1/storefront/direct-orders')->assertOk()->assertJsonPath('verification_allowance.is_pro', true);
});

test('creator sales trend includes only paid orders in the selected period and workspace', function () {
    [$creator, , $product] = creatorOrdersDashboardFixture();
    [$other, , $otherProduct] = creatorOrdersDashboardFixture();
    creatorOrdersDashboardOrder($creator, $product, ['status' => 'paid', 'gross_amount_cents' => 1200, 'paid_at' => '2026-10-10 12:00:00']);
    creatorOrdersDashboardOrder($creator, $product, ['status' => 'manual_review', 'gross_amount_cents' => 9000, 'paid_at' => '2026-10-10 12:00:00']);
    creatorOrdersDashboardOrder($other, $otherProduct, ['status' => 'paid', 'gross_amount_cents' => 8000, 'paid_at' => '2026-10-10 12:00:00']);
    creatorOrdersDashboardActAs($this, $creator);
    $this->getJson('/api/v1/storefront/direct-orders?from=2026-10-01&to=2026-10-31')
        ->assertOk()->assertJsonPath('sales_trend.0.date', '2026-10-10')
        ->assertJsonPath('sales_trend.0.amount_cents', 1200)
        ->assertJsonCount(1, 'sales_trend');
});

/**
 * @return array{0: User, 1: Workspace, 2: DigitalProduct}
 */
function creatorOrdersDashboardFixture(string $title = 'Creator product'): array
{
    $creator = User::factory()->create();
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
function creatorOrdersDashboardOrder(User $creator, DigitalProduct $product, array $attributes = []): StorefrontOrder
{
    return StorefrontOrder::query()->create([
        'uuid' => (string) Str::uuid(),
        'digital_product_id' => $product->id,
        'creator_id' => $creator->id,
        'buyer_name' => 'Synthetic buyer',
        'buyer_email' => 'buyer@example.test',
        'currency' => 'ETB',
        'gross_amount_cents' => 10000,
        'commission_bps' => 0,
        'platform_fee_cents' => 0,
        'creator_earnings_cents' => 10000,
        'status' => 'pending_payment',
        'payment_gateway' => 'verify_et',
        ...$attributes,
    ]);
}

function creatorOrdersDashboardActAs($test, User $user): void
{
    ActiveWorkspace::clearCache();
    $test->withSession(['_token' => 'test-token'])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', 'test-token')
        ->actingAs($user);
}

test('creator orders dashboard lists only owned orders with real summary totals', function () {
    [$creator, , $product] = creatorOrdersDashboardFixture('Owned product');
    [$otherCreator, , $otherProduct] = creatorOrdersDashboardFixture('Other product');

    $verified = creatorOrdersDashboardOrder($creator, $product, [
        'status' => 'paid',
        'gross_amount_cents' => 10000,
        'payment_reference' => 'VERIFIED-ORDER-1',
        'payment_provider_snapshot' => 'cbe',
        'payment_account_snapshot' => '1000123456789',
        'paid_at' => now(),
    ]);
    $chapa = creatorOrdersDashboardOrder($creator, $product, [
        'status' => 'paid',
        'gross_amount_cents' => 15000,
        'payment_gateway' => 'chapa',
        'chapa_tx_ref' => 'CHAPA-ORDER-1',
        'paid_at' => now(),
    ]);
    $manualReview = creatorOrdersDashboardOrder($creator, $product, [
        'status' => 'manual_review',
        'gross_amount_cents' => 5000,
        'payment_reference' => 'MANUAL-REVIEW-1',
    ]);
    $pending = creatorOrdersDashboardOrder($creator, $product, [
        'status' => 'pending_payment',
        'gross_amount_cents' => 7000,
        'payment_reference' => 'PENDING-1',
    ]);
    $otherOrder = creatorOrdersDashboardOrder($otherCreator, $otherProduct, [
        'status' => 'paid',
        'gross_amount_cents' => 90000,
        'payment_reference' => 'OTHER-CREATOR-1',
    ]);

    creatorOrdersDashboardActAs($this, $creator);

    $response = $this->getJson('/api/v1/storefront/direct-orders')
        ->assertOk()
        ->assertJsonPath('summary.verified_sales_count', 2)
        ->assertJsonPath('summary.verified_revenue_cents', 25000)
        ->assertJsonPath('summary.pending_count', 1)
        ->assertJsonPath('summary.manual_review_count', 1)
        ->assertJsonPath('summary.status_counts.paid', 2)
        ->assertJsonPath('summary.status_counts.manual_review', 1)
        ->assertJsonFragment(['uuid' => $verified->uuid, 'transaction_reference' => 'VERIFIED-ORDER-1'])
        ->assertJsonFragment(['uuid' => $chapa->uuid, 'payment_method' => 'chapa'])
        ->assertJsonFragment(['uuid' => $manualReview->uuid])
        ->assertJsonFragment(['uuid' => $pending->uuid])
        ->assertJsonMissing(['uuid' => $otherOrder->uuid])
        ->assertDontSee('1000123456789');

    expect($response->json('data.data'))->toHaveCount(4);
    expect($response->json('data.data.0.buyer_email'))->toBe('buyer@example.test');

    $this->getJson('/api/v1/storefront/direct-orders?status=manual_review')
        ->assertOk()
        ->assertJsonFragment(['uuid' => $manualReview->uuid])
        ->assertJsonMissing(['uuid' => $verified->uuid]);

    $this->getJson('/api/v1/storefront/direct-orders?search=Synthetic%20buyer&from='.now()->subDay()->format('Y-m-d').'&to='.now()->addDay()->format('Y-m-d'))
        ->assertOk()
        ->assertJsonPath('data.total', 4);
});

test('gateway-scoped orders and financial metrics exclude historical Verify.et from Chapa totals', function () {
    [$creator, , $product] = creatorOrdersDashboardFixture();
    [$otherCreator, , $otherProduct] = creatorOrdersDashboardFixture();

    $chapaPaid = creatorOrdersDashboardOrder($creator, $product, [
        'payment_gateway' => 'chapa',
        'status' => 'paid',
        'gross_amount_cents' => 10000,
        'creator_earnings_cents' => 8500,
        'platform_fee_cents' => 1500,
        'paid_at' => now(),
    ]);
    $chapaPending = creatorOrdersDashboardOrder($creator, $product, [
        'payment_gateway' => 'chapa',
        'status' => 'pending_payment',
        'gross_amount_cents' => 4000,
    ]);
    $legacyPaid = creatorOrdersDashboardOrder($creator, $product, [
        'payment_gateway' => 'verify_et',
        'status' => 'paid',
        'gross_amount_cents' => 25000,
        'paid_at' => now(),
    ]);
    $legacyReview = creatorOrdersDashboardOrder($creator, $product, [
        'payment_gateway' => 'verify_et',
        'status' => 'manual_review',
        'gross_amount_cents' => 5000,
    ]);
    $unowned = creatorOrdersDashboardOrder($otherCreator, $otherProduct, [
        'payment_gateway' => 'chapa',
        'status' => 'paid',
        'gross_amount_cents' => 99000,
    ]);

    creatorOrdersDashboardActAs($this, $creator);

    $this->getJson('/api/v1/storefront/direct-orders?gateway=chapa')
        ->assertOk()
        ->assertJsonPath('data.total', 2)
        ->assertJsonPath('summary.verified_sales_count', 1)
        ->assertJsonPath('summary.verified_revenue_cents', 10000)
        ->assertJsonPath('summary.creator_earnings_cents', 8500)
        ->assertJsonPath('summary.platform_fee_cents', 1500)
        ->assertJsonPath('summary.paid_orders_count', 1)
        ->assertJsonPath('summary.pending_count', 1)
        ->assertJsonPath('summary.manual_review_count', 0)
        ->assertJsonFragment(['uuid' => $chapaPaid->uuid])
        ->assertJsonFragment(['uuid' => $chapaPending->uuid])
        ->assertJsonMissing(['uuid' => $legacyPaid->uuid])
        ->assertJsonMissing(['uuid' => $legacyReview->uuid])
        ->assertJsonMissing(['uuid' => $unowned->uuid]);

    $this->getJson('/api/v1/storefront/direct-orders?gateway=verify_et')
        ->assertOk()
        ->assertJsonPath('data.total', 2)
        ->assertJsonPath('summary.verified_revenue_cents', 25000)
        ->assertJsonPath('summary.manual_review_count', 1)
        ->assertJsonFragment(['uuid' => $legacyPaid->uuid])
        ->assertJsonFragment(['uuid' => $legacyReview->uuid])
        ->assertJsonMissing(['uuid' => $chapaPaid->uuid]);

    $this->getJson('/api/v1/storefront/direct-orders?gateway=all')
        ->assertOk()
        ->assertJsonPath('data.total', 4)
        ->assertJsonPath('summary.verified_revenue_cents', 35000)
        ->assertJsonPath('summary.manual_review_count', 1);

    // An archived order can still be inspected securely without re-enabling checkout.
    $this->getJson('/api/v1/storefront/direct-orders/'.$legacyReview->uuid)
        ->assertOk()->assertJsonPath('data.payment_gateway', 'verify_et');
    $this->getJson('/api/v1/storefront/direct-orders?gateway=invalid')->assertUnprocessable();
});

test('creator Chapa net earnings account for completed partial refunds without changing gross sales', function () {
    [$creator, , $product] = creatorOrdersDashboardFixture();
    $paid = creatorOrdersDashboardOrder($creator, $product, [
        'status' => 'paid',
        'payment_gateway' => 'chapa',
        'collection_owner' => StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA,
        'gross_amount_cents' => 10000,
        'creator_earnings_cents' => 9000,
        'platform_fee_cents' => 1000,
        'paid_at' => now(),
    ]);
    DigitalProductPaymentRefund::query()->create([
        'storefront_order_id' => $paid->id,
        'recorded_by' => $creator->id,
        'amount_cents' => 4000,
        'creator_earnings_reversal_cents' => 3600,
        'platform_fee_reversal_cents' => 400,
        'currency' => 'ETB',
        'external_reference' => 'synthetic-partial-refund',
        'reason' => 'Synthetic partial return',
        'status' => DigitalProductPaymentRefund::STATUS_COMPLETED,
        'refunded_at' => now(),
    ]);

    creatorOrdersDashboardActAs($this, $creator);
    $this->getJson('/api/v1/storefront/direct-orders?gateway=chapa')
        ->assertOk()
        ->assertJsonPath('summary.verified_revenue_cents', 10000)
        ->assertJsonPath('summary.creator_earnings_cents', 5400)
        ->assertJsonPath('summary.paid_orders_count', 1);
});

test('Chapa dashboard commerce cards use paid item quantities and net refunds, not pending or legacy data', function () {
    [$creator, , $product] = creatorOrdersDashboardFixture();
    $first = creatorOrdersDashboardOrder($creator, $product, [
        'status' => 'paid', 'payment_gateway' => 'chapa',
        'gross_amount_cents' => 10000, 'platform_fee_cents' => 1000,
        'creator_earnings_cents' => 9000, 'paid_at' => now(),
    ]);
    $second = creatorOrdersDashboardOrder($creator, $product, [
        'status' => 'paid', 'payment_gateway' => 'chapa',
        'gross_amount_cents' => 5000, 'platform_fee_cents' => 500,
        'creator_earnings_cents' => 4500, 'paid_at' => now(),
    ]);
    $first->items()->create([
        'digital_product_id' => $product->id, 'title' => 'Bundle',
        'unit_amount_cents' => 5000, 'quantity' => 2,
    ]);
    $second->items()->create([
        'digital_product_id' => $product->id, 'title' => 'Guide',
        'unit_amount_cents' => 5000, 'quantity' => 1,
    ]);
    DigitalProductPaymentRefund::query()->create([
        'storefront_order_id' => $first->id, 'recorded_by' => $creator->id,
        'amount_cents' => 4000, 'creator_earnings_reversal_cents' => 3600,
        'platform_fee_reversal_cents' => 400, 'currency' => 'ETB',
        'external_reference' => 'test-kpi-partial-refund',
        'reason' => 'Synthetic refund', 'status' => DigitalProductPaymentRefund::STATUS_COMPLETED,
        'refunded_at' => now(),
    ]);

    creatorOrdersDashboardOrder($creator, $product, [
        'status' => 'refunded', 'payment_gateway' => 'chapa', 'gross_amount_cents' => 12000,
    ]);
    creatorOrdersDashboardOrder($creator, $product, [
        'status' => 'pending_payment', 'payment_gateway' => 'chapa', 'gross_amount_cents' => 7000,
    ]);
    creatorOrdersDashboardOrder($creator, $product, [
        'status' => 'paid', 'payment_gateway' => 'verify_et', 'gross_amount_cents' => 30000,
    ]);
    creatorOrdersDashboardOrder($creator, $product, [
        'status' => 'paid', 'payment_gateway' => 'chapa', 'currency' => 'USD', 'gross_amount_cents' => 50000,
    ]);

    creatorOrdersDashboardActAs($this, $creator);
    $this->getJson('/api/v1/storefront/direct-orders?gateway=chapa')
        ->assertOk()
        ->assertJsonPath('summary.verified_revenue_cents', 15000)
        ->assertJsonPath('summary.net_sales_cents', 11000)
        ->assertJsonPath('summary.paid_orders_count', 2)
        ->assertJsonPath('summary.items_sold_count', 3)
        ->assertJsonPath('summary.average_order_cents', 5500)
        ->assertJsonPath('summary.creator_earnings_cents', 9900)
        ->assertJsonPath('summary.gross_profit_cents', 9900)
        ->assertJsonPath('summary.gross_profit_margin_percent', 90)
        ->assertJsonPath('summary.pending_count', 1);
});

test('empty sales safely produce zero average order and zero margin', function () {
    [$creator] = creatorOrdersDashboardFixture();
    creatorOrdersDashboardActAs($this, $creator);
    $this->getJson('/api/v1/storefront/direct-orders?gateway=chapa')
        ->assertOk()
        ->assertJsonPath('summary.net_sales_cents', 0)
        ->assertJsonPath('summary.paid_orders_count', 0)
        ->assertJsonPath('summary.items_sold_count', 0)
        ->assertJsonPath('summary.average_order_cents', 0)
        ->assertJsonPath('summary.gross_profit_margin_percent', 0);
});

test('creator can inspect an owned order without provider account evidence and with delivery state', function () {
    [$creator, , $product] = creatorOrdersDashboardFixture();
    [$otherCreator] = creatorOrdersDashboardFixture('Other product');

    $file = FileEntry::query()->create([
        'name' => 'guide.pdf',
        'file_name' => Str::random(20),
        'file_size' => 1024,
        'mime' => 'application/pdf',
        'extension' => 'pdf',
        'type' => 'file',
        'workspace_id' => $product->workspace_id,
        'owner_id' => $creator->id,
    ]);
    $product->files()->attach($file->id);

    $order = creatorOrdersDashboardOrder($creator, $product, [
        'status' => 'paid',
        'gross_amount_cents' => 10000,
        'payment_reference' => 'DETAIL-REFERENCE-1',
        'payment_provider_snapshot' => 'cbe',
        'payment_account_snapshot' => '1000123456789',
        'payment_account_name_snapshot' => 'Synthetic Recipient',
        'paid_at' => now(),
    ]);
    DownloadEntitlement::query()->create([
        'token' => (string) Str::uuid(),
        'storefront_order_id' => $order->id,
        'file_entry_id' => $file->id,
        'download_count' => 1,
        'download_limit' => 10,
        'expires_at' => now()->addDays(30),
    ]);
    creatorOrdersDashboardActAs($this, $creator);

    $this->getJson('/api/v1/storefront/direct-orders/'.$order->uuid)
        ->assertOk()
        ->assertJsonPath('data.uuid', $order->uuid)
        ->assertJsonPath('data.transaction_reference', 'DETAIL-REFERENCE-1')
        ->assertJsonPath('data.payment_method', $order->payment_gateway)
        ->assertJsonMissingPath('data.verification')
        ->assertJsonMissingPath('data.account_ending')
        ->assertJsonPath('data.delivery.status', 'downloaded')
        ->assertJsonPath('data.delivery.entitlements_count', 1)
        ->assertJsonPath('data.delivery.downloaded_count', 1)
        ->assertDontSee('1000123456789')
        ->assertDontSee('provider payload')
        ->assertDontSee('accountSuffix');

    creatorOrdersDashboardActAs($this, $otherCreator);
    $this->getJson('/api/v1/storefront/direct-orders/'.$order->uuid)->assertNotFound();
});

test('delivery status reflects entitlement and download evidence rather than payment alone', function () {
    [$creator, , $product] = creatorOrdersDashboardFixture();
    $file = FileEntry::query()->create([
        'name' => 'guide.pdf', 'file_name' => Str::random(20), 'file_size' => 1024,
        'mime' => 'application/pdf', 'extension' => 'pdf', 'type' => 'file',
        'workspace_id' => $product->workspace_id, 'owner_id' => $creator->id,
    ]);
    $paid = creatorOrdersDashboardOrder($creator, $product, ['status' => 'paid']);
    $granted = creatorOrdersDashboardOrder($creator, $product, ['status' => 'paid']);
    $downloaded = creatorOrdersDashboardOrder($creator, $product, ['status' => 'paid']);
    $unknown = creatorOrdersDashboardOrder($creator, $product, ['status' => 'pending_payment']);
    foreach ([[$granted, 0], [$downloaded, 1]] as [$order, $count]) {
        DownloadEntitlement::query()->create([
            'token' => (string) Str::uuid(), 'storefront_order_id' => $order->id,
            'file_entry_id' => $file->id, 'download_count' => $count,
            'download_limit' => 10, 'expires_at' => now()->addDays(30),
        ]);
    }
    creatorOrdersDashboardActAs($this, $creator);
    foreach ([[$paid, 'paid'], [$granted, 'access_granted'], [$downloaded, 'downloaded'], [$unknown, 'unknown']] as [$order, $status]) {
        $this->getJson('/api/v1/storefront/direct-orders/'.$order->uuid)
            ->assertOk()->assertJsonPath('data.delivery.status', $status);
    }
});

