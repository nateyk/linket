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
        // CI uses its own belink_test database. Never touch a production DB or
        // real provider. The OTP delivery is represented by a test-only code.
        Http::fake();
        Queue::fake();
        config()->set('services.verify_et.mock', false);

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
        $file = FileEntry::query()->create([
            'name' => 'qa-free-file.pdf',
            'file_name' => 'qa-free-file.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);
        $product->biolinks()->attach($store->id);

        $buyerEmail = 'qa-buyer-'.Str::lower(Str::random(12)).'@example.test';
        // This is the actual guest-accessible storefront route. The legacy
        // /api/v1/digital-products/{id}/checkout route is API-access gated and
        // returns 401 for an anonymous buyer; testing that one would never
        // exercise the public /username purchase journey.
        $response = $this->postJson(
            "/api/v1/public/stores/{$store->id}/digital-products/{$product->id}/checkout",
            ['buyer_name' => 'QA Buyer', 'buyer_email' => $buyerEmail],
        )->assertOk()
            ->assertJsonStructure(['order_id', 'status']);

        $orderId = (string) $response->json('order_id');
        // Legacy direct checkout can return the pre-refresh pending status on
        // the response model even though the synchronous DB fulfillment is
        // committed. Verify the persisted order rather than trusting a stale
        // Eloquent snapshot or asserting a false frontend requirement.
        $order = StorefrontOrder::query()->where('uuid', $orderId)->firstOrFail();
        $this->assertSame('paid', $order->status);
        $this->assertSame($store->id, $order->biolink_id);
        $this->assertSame(0, (int) $order->gross_amount_cents);
        $this->assertNotNull($order->paid_at);
        $this->assertTrue($order->entitlements()->exists());
        $this->assertDatabaseHas('digital_product_earnings_ledger', [
            'storefront_order_id' => $order->id,
        ]);

        // A free order must not start an external payment request, and portal
        // access is forbidden without a verified buyer-email session.
        Http::assertNothingSent();
        $this->getJson('/api/v1/public/my-portal/library')->assertForbidden();

        $emailHash = hash('sha256', strtolower($buyerEmail));
        RateLimiter::clear("digital-product-recovery:email:{$emailHash}");
        RateLimiter::clear('digital-product-recovery:ip:127.0.0.1');
        $this->postJson('/api/v1/public/my-portal/request-code', [
            'email' => strtoupper($buyerEmail),
        ])->assertOk();

        $recovery = DigitalProductOrderRecovery::query()
            ->where('email_hash', $emailHash)->latest('id')->firstOrFail();
        $this->assertTrue($recovery->expires_at->isFuture());

        // Mail is deliberately faked: replace the queued challenge's code
        // hash with the known test OTP, then verify through the real endpoint.
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

        $portal = $this->withCredentials()
            ->withHeader('Referer', 'http://localhost')
            ->withUnencryptedCookies([
                OrderRecoveryService::COOKIE => $cookie->getValue(),
            ]);

        $portal->getJson('/api/v1/public/my-portal/library')
            ->assertOk()
            ->assertJsonPath('orders.0.id', $orderId)
            ->assertJsonPath('orders.0.gross_amount_cents', 0)
            ->assertJsonPath('orders.0.downloads.0.available', true);

        $entitlement = $order->entitlements()->firstOrFail();
        $portal->postJson(
            "/api/v1/public/my-portal/purchases/{$orderId}/downloads/{$entitlement->id}",
        )->assertOk()->assertJsonStructure(['url']);

        Http::assertNothingSent();
    }
}
