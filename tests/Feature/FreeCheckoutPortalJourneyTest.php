<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductOrderRecovery;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\OrderRecoveryService;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Tests\TestCase;

class FreeCheckoutPortalJourneyTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testFreeCheckoutIsPaidWithoutVerificationAndAvailableThroughAuthorizedPortalRecovery(): void
    {
        // Only an isolated test DB, fake mail and fake HTTP are used here.
        Http::fake();
        Queue::fake();
        config()->set('services.verify_et.mock', false);

        [$store, $product] = $this->createPublicFreeProduct();
        $buyerEmail = 'qa-buyer-'.Str::lower(Str::random(12)).'@example.test';
        $order = $this->checkoutAndAssertFulfilled($store, $product, $buyerEmail);

        Http::assertNothingSent();
        $this->getJson('/api/v1/public/my-portal/library')->assertForbidden();

        $verifiedCookie = $this->verifyEmailRecovery($buyerEmail);
        $this->assertAuthorizedPortalDownload($order, $verifiedCookie);
        Http::assertNothingSent();
    }

    /** @return array{Biolink, DigitalProduct} */
    private function createPublicFreeProduct(): array
    {
        $creator = User::query()->forceCreate([
            'name' => 'QA Creator',
            'username' => 'qa-creator-'.Str::lower(Str::random(12)),
            'email' => Str::lower(Str::random(12)).'@example.test',
            'password' => bcrypt('qa-password-not-used'),
            'email_verified_at' => now(),
        ]);
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();

        $store = Biolink::query()->create([
            'back_half' => Str::lower(Str::random(10)),
            'name' => 'QA public storefront',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'QA free resource',
            'price_cents' => 0,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);
        $this->attachFreeDownload($store, $product, $creator);

        return [$store, $product];
    }

    private function attachFreeDownload(
        Biolink $store,
        DigitalProduct $product,
        User $creator,
    ): void {
        $file = FileEntry::query()->create([
            'name' => 'qa-free-file.pdf',
            'file_name' => 'qa-free-file.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'file_size' => 100,
            'workspace_id' => $product->workspace_id,
            'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);
        $product->biolinks()->attach($store->id);
    }

    private function checkoutAndAssertFulfilled(
        Biolink $store,
        DigitalProduct $product,
        string $buyerEmail,
    ): StorefrontOrder {
        // The real guest-accessible storefront route; the creator API is gated.
        $response = $this->postJson(
            "/api/v1/public/stores/{$store->id}/digital-products/{$product->id}/checkout",
            ['buyer_name' => 'QA Buyer', 'buyer_email' => $buyerEmail],
        )->assertOk()->assertJsonStructure(['order_id', 'status']);

        // Verify persisted fulfillment, not the legacy response's stale status.
        $order = StorefrontOrder::query()
            ->where('uuid', (string) $response->json('order_id'))
            ->firstOrFail();
        $this->assertSame('paid', $order->status);
        $this->assertSame($store->id, $order->biolink_id);
        $this->assertSame(0, (int) $order->gross_amount_cents);
        $this->assertNotNull($order->paid_at);
        $this->assertTrue($order->entitlements()->exists());
        $this->assertDatabaseHas('digital_product_earnings_ledger', [
            'storefront_order_id' => $order->id,
        ]);

        return $order;
    }

    private function verifyEmailRecovery(string $buyerEmail): string
    {
        $emailHash = hash('sha256', strtolower($buyerEmail));
        RateLimiter::clear("digital-product-recovery:email:{$emailHash}");
        RateLimiter::clear('digital-product-recovery:ip:127.0.0.1');
        $this->postJson('/api/v1/public/my-portal/request-code', [
            'email' => strtoupper($buyerEmail),
        ])->assertOk();

        $recovery = DigitalProductOrderRecovery::query()
            ->where('email_hash', $emailHash)->latest('id')->firstOrFail();
        $this->assertTrue($recovery->expires_at->isFuture());

        // No real OTP is delivered; insert a known test-only hash.
        $code = '246810';
        $recovery->update([
            'token_hash' => hash('sha256', "{$emailHash}.{$code}"),
        ]);

        config()->set('app.url', 'http://localhost');
        config()->set('sanctum.stateful', ['localhost']);
        $verified = $this->withCredentials()
            ->withHeader('Referer', 'http://localhost')
            ->postJson('/api/v1/public/my-portal/verify-code', [
                'email' => $buyerEmail,
                'code' => $code,
            ])
            ->assertOk()
            ->assertCookie(OrderRecoveryService::COOKIE);

        $cookie = $verified->getCookie(OrderRecoveryService::COOKIE, decrypt: false);
        $this->assertNotNull($cookie);

        return $cookie->getValue();
    }

    private function assertAuthorizedPortalDownload(
        StorefrontOrder $order,
        string $cookieValue,
    ): void {
        $portal = $this->withCredentials()
            ->withHeader('Referer', 'http://localhost')
            ->withUnencryptedCookies([
                OrderRecoveryService::COOKIE => $cookieValue,
            ]);
        $portal->getJson('/api/v1/public/my-portal/library')
            ->assertOk()
            ->assertJsonPath('orders.0.id', $order->uuid)
            ->assertJsonPath('orders.0.gross_amount_cents', 0)
            ->assertJsonPath('orders.0.downloads.0.available', true);

        $entitlement = $order->entitlements()->firstOrFail();
        $portal->postJson(
            "/api/v1/public/my-portal/purchases/{$order->uuid}/downloads/{$entitlement->id}",
        )->assertOk()->assertJsonStructure(['url']);
    }
}
