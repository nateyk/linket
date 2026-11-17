<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Payments\VerifyEt\VerifyEtSettings;
use App\Stores\Models\Store;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DirectPaymentMethod;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class CentralizedMarketplaceCheckoutTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeader('Referer', 'http://localhost');
    }

    public function testPublicProductResourceAllowsPurchaseWithoutVerifyEtAccountsWhenChapaIsEnabled(): void
    {
        config(['services.chapa.secret' => 'platform-sec-test']);
        config(['services.verify_et.enabled' => false]);

        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $store = Store::factory()->create(['workspace_id' => $workspace->id, 'user_id' => $creator->id]);
        $product = $this->createApprovedProduct($creator, $workspace, 3500);
        $product->biolinks()->attach($store->id);

        $response = $this->getJson("/api/v1/public/biolinks/{$store->id}/digital-products/{$product->id}");

        $response->assertOk()
            ->assertJsonPath('data.can_buy', true)
            ->assertJsonPath('data.payment_mode', 'direct')
            ->assertJsonPath('data.checkout_blocker', null)
            ->assertJsonPath('data.verification_quota_exhausted', false)
            ->assertJsonPath('data.receiving_accounts', []);
    }

    public function testPublicCheckoutCreatesPlatformChapaOrderAndInitiatesSession(): void
    {
        config(['services.chapa.secret' => 'platform-sec-test']);
        config(['services.verify_et.enabled' => false]);
        config(['store.default_benefits.commission_bps' => 1000]);
        $this->mockPlatformChapaClient('https://checkout.chapa.global/mock-session-42', 'CHP-REF-42');

        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $store = Store::factory()->create(['workspace_id' => $workspace->id, 'user_id' => $creator->id]);
        $product = $this->createApprovedProduct($creator, $workspace, 4500);
        $product->biolinks()->attach($store->id);

        $response = $this->postJson("/api/v1/public/biolinks/{$store->id}/digital-products/{$product->id}/checkout", [
            'buyer_name' => 'Sara Buyer',
            'buyer_email' => 'sara@example.test',
        ]);

        $response->assertOk()
            ->assertJsonPath('checkout_url', 'https://checkout.chapa.global/mock-session-42')
            ->assertJsonPath('status', 'pending_payment');

        $orderUuid = $response->json('order_id');
        $order = StorefrontOrder::query()->where('uuid', $orderUuid)->first();
        $this->assertNotNull($order);
        $this->assertSame(StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA, $order->collection_owner);
        $this->assertSame('chapa', $order->payment_gateway);
        $this->assertSame('pending_payment', $order->status);
        $this->assertSame(4500, (int) $order->gross_amount_cents);
        $this->assertGreaterThan(0, (int) $order->platform_fee_cents);
        $this->assertSame((int) $order->gross_amount_cents - (int) $order->platform_fee_cents, (int) $order->creator_earnings_cents);

        $attempt = StorefrontPaymentAttempt::query()->where('order_id', $order->id)->first();
        $this->assertNotNull($attempt);
        $this->assertSame(StorefrontPaymentAttempt::STATUS_PENDING, $attempt->status);
        $this->assertSame('https://checkout.chapa.global/mock-session-42', $attempt->checkout_url);
        $this->assertSame('mock-session-42', $attempt->chapa_reference);
    }

    public function testDirectCheckoutEndpointAlsoRoutesToPlatformChapa(): void
    {
        config(['services.chapa.secret' => 'platform-sec-test']);
        config(['services.verify_et.enabled' => false]);
        $this->mockPlatformChapaClient('https://checkout.chapa.global/direct-session-77', 'CHP-REF-77');

        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = $this->createApprovedProduct($creator, $workspace, 2000);

        $response = $this->postJson("/api/v1/digital-products/{$product->id}/checkout", [
            'buyer_name' => 'Abebe Buyer',
            'buyer_email' => 'abebe.direct@example.test',
        ]);

        $response->assertOk()
            ->assertJsonPath('checkout_url', 'https://checkout.chapa.global/direct-session-77')
            ->assertJsonPath('status', 'pending_payment');

        $orderUuid = $response->json('order_id');
        $order = StorefrontOrder::query()->where('uuid', $orderUuid)->first();
        $this->assertNotNull($order);
        $this->assertSame(StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA, $order->collection_owner);
    }

    public function testCheckoutBlockedWhenBothChapaAndVerifyEtAreDisabled(): void
    {
        config(['services.chapa.secret' => '']);
        config(['services.verify_et.enabled' => false]);

        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $store = Store::factory()->create(['workspace_id' => $workspace->id, 'user_id' => $creator->id]);
        $product = $this->createApprovedProduct($creator, $workspace, 3000);
        $product->biolinks()->attach($store->id);

        $this->getJson("/api/v1/public/biolinks/{$store->id}/digital-products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.can_buy', false)
            ->assertJsonPath('data.payment_mode', 'unavailable')
            ->assertJsonPath('data.checkout_blocker', 'verification_unavailable');

        $this->postJson("/api/v1/public/biolinks/{$store->id}/digital-products/{$product->id}/checkout", [
            'buyer_name' => 'Blocked Buyer',
            'buyer_email' => 'blocked@example.test',
        ])->assertStatus(503);
    }

    public function testExplicitLegacyReceivingAccountCannotOverridePlatformChapa(): void
    {
        config(['services.chapa.secret' => 'platform-sec-test']);
        config(['services.verify_et.enabled' => true]);
        $this->mockPlatformChapaClient('https://checkout.chapa.global/centralized-legacy-override', 'CHP-REF-LEGACY');

        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $store = Store::factory()->create(['workspace_id' => $workspace->id, 'user_id' => $creator->id]);
        $product = $this->createApprovedProduct($creator, $workspace, 1500);
        $product->biolinks()->attach($store->id);

        DirectPaymentMethod::query()->updateOrCreate(
            ['code' => 'telebirr'],
            [
                'display_name' => 'Telebirr',
                'checkout_enabled' => true,
                'automated_verification_supported' => true,
                'recipient_matching_supported' => true,
                'operationally_suspended' => false,
            ]
        );

        $paymentMethod = CreatorPaymentMethod::query()->create([
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
            'provider' => 'telebirr',
            'account_number' => '0911223344',
            'account_fingerprint' => hash_hmac('sha256', 'telebirr:0911223344', (string) config('app.key')),
            'account_name_raw' => 'Creator Telebirr',
            'account_name_normalized' => 'creator telebirr',
            'status' => 'approved',
            'provider_registration_status' => 'registered',
            'is_active' => true,
            'is_suspended' => false,
        ]);

        $response = $this->postJson("/api/v1/public/biolinks/{$store->id}/digital-products/{$product->id}/checkout", [
            'buyer_name' => 'Direct Buyer',
            'buyer_email' => 'direct@example.test',
            'creator_payment_method_id' => $paymentMethod->id,
        ]);

        $response->assertOk()
            ->assertJsonPath('checkout_url', 'https://checkout.chapa.global/centralized-legacy-override')
            ->assertJsonPath('status', 'pending_payment');

        $orderUuid = $response->json('order_id');
        $order = StorefrontOrder::query()->where('uuid', $orderUuid)->first();
        $this->assertNotNull($order);
        $this->assertSame('chapa', $order->payment_gateway);
        $this->assertSame(StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA, $order->collection_owner);
        $this->assertNull($order->creator_payment_method_id);
        $this->getJson("/api/v1/public/biolinks/{$store->id}/digital-products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.receiving_accounts', []);
    }

    private function createApprovedProduct(User $creator, $workspace, int $priceCents): DigitalProduct
    {
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Test Marketplace Product '.Str::random(6),
            'price_cents' => $priceCents,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);

        $file = FileEntry::query()->create([
            'name' => 'product.pdf',
            'file_name' => 'product-'.Str::uuid().'.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'file_size' => 200,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);

        return $product;
    }

    private function mockPlatformChapaClient(string $checkoutUrl, string $reference): void
    {
        Http::fake([
            'https://api.chapa.co/v1/transaction/initialize' => Http::response([
                'status' => 'success',
                'data' => ['checkout_url' => $checkoutUrl],
            ]),
        ]);
    }
}
