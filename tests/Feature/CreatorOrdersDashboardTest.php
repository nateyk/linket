<?php

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\DigitalProduct;
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
    expect($response->json('data.data.0.buyer_email'))->toBeNull();

    $this->getJson('/api/v1/storefront/direct-orders?status=manual_review')
        ->assertOk()
        ->assertJsonFragment(['uuid' => $manualReview->uuid])
        ->assertJsonMissing(['uuid' => $verified->uuid]);

    $this->getJson('/api/v1/storefront/direct-orders?search=Synthetic%20buyer&from='.now()->subDay()->format('Y-m-d').'&to='.now()->addDay()->format('Y-m-d'))
        ->assertOk()
        ->assertJsonPath('data.total', 4);
});

test('creator can inspect an owned order with masked account evidence and delivery state', function () {
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
    $verification = DirectPaymentVerification::query()->create([
        'reference' => 'DETAIL-REFERENCE-1',
        'payable_type' => $order::class,
        'payable_id' => $order->id,
        'bank_code' => 'cbe',
        'settlement_account' => '1000123456789',
        'amount_cents' => 10000,
        'currency' => 'ETB',
        'status' => 'success',
        'verified_at' => now(),
        'attempt' => 1,
        'provider_input' => ['accountSuffix' => '6789'],
        'provider_result' => ['sensitive' => 'provider payload'],
    ]);

    creatorOrdersDashboardActAs($this, $creator);

    $this->getJson('/api/v1/storefront/direct-orders/'.$order->uuid)
        ->assertOk()
        ->assertJsonPath('data.uuid', $order->uuid)
        ->assertJsonPath('data.transaction_reference', 'DETAIL-REFERENCE-1')
        ->assertJsonPath('data.account_ending', '6789')
        ->assertJsonPath('data.payment_method', 'cbe')
        ->assertJsonPath('data.verification.status', 'success')
        ->assertJsonPath('data.verification.attempts', 1)
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

test('creator transaction history is scoped and never exposes provider evidence', function () {
    [$creator, , $product] = creatorOrdersDashboardFixture();
    [$otherCreator, , $otherProduct] = creatorOrdersDashboardFixture('Other product');

    $ownedOrder = creatorOrdersDashboardOrder($creator, $product, [
        'status' => 'paid',
        'payment_reference' => 'OWNED-TRANSACTION-1',
        'payment_provider_snapshot' => 'cbe',
        'payment_account_snapshot' => '1000123456789',
    ]);
    $otherOrder = creatorOrdersDashboardOrder($otherCreator, $otherProduct, [
        'status' => 'paid',
        'payment_reference' => 'OTHER-TRANSACTION-1',
    ]);

    $ownedVerification = DirectPaymentVerification::query()->create([
        'reference' => 'OWNED-TRANSACTION-1',
        'payable_type' => $ownedOrder::class,
        'payable_id' => $ownedOrder->id,
        'bank_code' => 'cbe',
        'settlement_account' => '1000123456789',
        'amount_cents' => 10000,
        'currency' => 'ETB',
        'status' => 'success',
        'verified_at' => now(),
        'attempt' => 1,
        'provider_result' => ['sensitive' => 'provider payload'],
    ]);
    DirectPaymentVerification::query()->create([
        'reference' => 'OTHER-TRANSACTION-1',
        'payable_type' => $otherOrder::class,
        'payable_id' => $otherOrder->id,
        'bank_code' => 'cbe',
        'settlement_account' => '9999999999999',
        'amount_cents' => 90000,
        'currency' => 'ETB',
        'status' => 'success',
        'verified_at' => now(),
        'attempt' => 1,
    ]);

    creatorOrdersDashboardActAs($this, $creator);

    $this->getJson('/api/v1/storefront/direct-orders/transactions')
        ->assertOk()
        ->assertJsonPath('data.total', 1)
        ->assertJsonFragment([
            'reference' => 'OWNED-TRANSACTION-1',
            'status' => 'success',
            'order_uuid' => $ownedOrder->uuid,
            'order_status' => 'paid',
        ])
        ->assertJsonMissing(['reference' => 'OTHER-TRANSACTION-1'])
        ->assertDontSee('1000123456789')
        ->assertDontSee('9999999999999')
        ->assertDontSee('provider payload');
});
