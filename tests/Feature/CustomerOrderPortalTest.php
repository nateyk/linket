<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductOrderRecovery;
use App\Storefront\Models\ProductReview;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\OrderRecoveryService;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Common\Core\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Common\Core\Middleware\EnsureFrontendRequestsAreStateful;
use Tests\TestCase;

class CustomerOrderPortalTest extends TestCase
{
    use DatabaseTransactions;

    public function testCodeRequestAlwaysReturnsTheGenericResponse(): void
    {
        $this->postJson('/api/v1/public/my-order/request-code', ['email' => 'not-an-email'])
            ->assertOk()
            ->assertJson([
                'message' => 'If paid purchases match that email address, we will send a sign-in code shortly.',
            ]);
    }

    public function testPaidPurchaseRequestCreatesAnExpiringSignInChallenge(): void
    {
        RateLimiter::clear('digital-product-recovery:email:' . hash('sha256', 'buyer@example.test'));
        RateLimiter::clear('digital-product-recovery:ip:127.0.0.1');
        $this->createPaidOrder('buyer@example.test');

        $this->postJson('/api/v1/public/my-order/request-code', ['email' => 'BUYER@example.test'])
            ->assertOk();

        $challenge = DigitalProductOrderRecovery::query()
            ->where('email_hash', hash('sha256', 'buyer@example.test'))
            ->first();

        $this->assertNotNull($challenge);
        $this->assertNotSame('buyer@example.test', $challenge->token_hash);
        $this->assertTrue($challenge->expires_at->isFuture());
    }

    public function testValidCodeCreatesAThirtyDayPortalSession(): void
    {
        $email = 'buyer@example.test';
        $emailHash = hash('sha256', $email);
        DigitalProductOrderRecovery::query()->create([
            'uuid' => (string) Str::uuid(),
            'email' => $email,
            'email_hash' => $emailHash,
            'token_hash' => hash('sha256', "{$emailHash}.123456"),
            'expires_at' => now()->addMinutes(10),
        ]);

        $this->postJson('/api/v1/public/my-order/verify-code', [
            'email' => $email,
            'code' => '123456',
        ])->assertOk()
            ->assertCookie(OrderRecoveryService::COOKIE);
    }

    public function testVerifiedBrowserSessionCanLoadItsPaidPurchases(): void
    {
        $email = 'buyer@example.test';
        $order = $this->createPaidOrder($email);
        $emailHash = hash('sha256', $email);
        DigitalProductOrderRecovery::query()->create([
            'uuid' => (string) Str::uuid(),
            'email' => $email,
            'email_hash' => $emailHash,
            'token_hash' => hash('sha256', "{$emailHash}.123456"),
            'expires_at' => now()->addMinutes(10),
        ]);

        $verification = $this->stateful()->postJson('/api/v1/public/my-order/verify-code', [
            'email' => $email,
            'code' => '123456',
        ])->assertOk();
        $cookie = $verification->getCookie(OrderRecoveryService::COOKIE, decrypt: false);

        $this->assertNotNull($cookie);
        $this->stateful()->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie->getValue()])
            ->getJson('/api/v1/public/my-order/purchases')
            ->assertOk()
            ->assertJsonPath('orders.0.id', $order->uuid);
    }

    public function testExpiredBrowserSessionCannotLoadPurchases(): void
    {
        $email = 'buyer@example.test';
        $this->createPaidOrder($email);
        $emailHash = hash('sha256', $email);
        $recovery = DigitalProductOrderRecovery::query()->create([
            'uuid' => (string) Str::uuid(),
            'email' => $email,
            'email_hash' => $emailHash,
            'token_hash' => hash('sha256', "{$emailHash}.123456"),
            'expires_at' => now()->addMinutes(10),
        ]);
        $verification = $this->stateful()->postJson('/api/v1/public/my-order/verify-code', [
            'email' => $email,
            'code' => '123456',
        ])->assertOk();
        $cookie = $verification->getCookie(OrderRecoveryService::COOKIE, decrypt: false);
        $recovery->update(['session_expires_at' => now()->subSecond()]);

        $this->stateful()->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie->getValue()])
            ->getJson('/api/v1/public/my-order/purchases')
            ->assertForbidden();
    }

    public function testFiveFailedOtpAttemptsInvalidateTheChallenge(): void
    {
        $email = 'buyer@example.test';
        $emailHash = hash('sha256', $email);
        DigitalProductOrderRecovery::query()->create([
            'uuid' => (string) Str::uuid(),
            'email' => $email,
            'email_hash' => $emailHash,
            'token_hash' => hash('sha256', "{$emailHash}.123456"),
            'expires_at' => now()->addMinutes(10),
        ]);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/public/my-order/verify-code', ['email' => $email, 'code' => '000000'])
                ->assertUnprocessable();
        }

        $this->postJson('/api/v1/public/my-order/verify-code', ['email' => $email, 'code' => '123456'])
            ->assertUnprocessable();
    }

    public function testPortalListsOnlyPaidPurchasesForTheVerifiedEmail(): void
    {
        $order = $this->createPaidOrder('buyer@example.test');
        $recovery = $this->portalSessionFor('buyer@example.test');

        $this->assertNotNull(app(OrderRecoveryService::class)->current(Request::create('/', 'GET', [], [
            OrderRecoveryService::COOKIE => $recovery['cookie'],
        ])));

        $orders = app(OrderRecoveryService::class)->paidOrders(
            app(OrderRecoveryService::class)->current(Request::create('/', 'GET', [], [
                OrderRecoveryService::COOKIE => $recovery['cookie'],
            ])),
        )->get();

        $this->assertSame($order->uuid, $orders->first()->uuid);
    }

    public function testVerifiedPortalSessionCanCreateAReviewForItsPurchase(): void
    {
        settings()->save(['storefront.reviews_enabled' => true]);
        $order = $this->createPaidOrder('buyer@example.test');
        $session = $this->portalSessionFor('buyer@example.test');

        (new \App\Storefront\Controllers\CustomerOrderPortalController())->review(
            Request::create('/api/v1/public/my-order/purchases/' . $order->uuid . '/review', 'POST', [
                'stars' => 5,
                'title' => 'Excellent guide',
                'review' => 'Exactly what I needed.',
            ], [OrderRecoveryService::COOKIE => $session['cookie']]),
            $order->uuid,
        );

        $review = ProductReview::query()->where('storefront_order_id', $order->id)->first();
        $this->assertNotNull($review);
        $this->assertSame('Excellent guide', $review->title);
    }

    public function testPortalVerificationEncryptsItsSessionCookieWithoutCsrfValidation(): void
    {
        $route = collect(app('router')->getRoutes()->getRoutes())
            ->first(fn ($route) => $route->uri() === 'api/v1/public/my-order/verify-code');

        $this->assertNotNull($route);
        $this->assertContains(EnsureFrontendRequestsAreStateful::class, $route->excludedMiddleware());
        $this->assertContains(VerifyCsrfToken::class, $route->excludedMiddleware());
    }

    public function testPublicReviewSubmissionRoutesAreUnavailable(): void
    {
        $this->postJson('/api/v1/public/biolinks/1/digital-products/1/reviews')->assertMethodNotAllowed();
        $this->postJson('/api/v1/public/stores/1/digital-products/1/reviews')->assertMethodNotAllowed();
    }

    private function createPaidOrder(string $buyerEmail): StorefrontOrder
    {
        $creator = User::query()->forceCreate([
            'name' => 'Portal Creator',
            'username' => 'portal-creator-' . Str::random(8),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Customer guide',
            'price_cents' => 2500,
            'currency' => 'ETB',
            'status' => 'approved',
        ]);

        return StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_email' => $buyerEmail,
            'currency' => 'ETB',
            'gross_amount_cents' => 2500,
            'commission_bps' => 1000,
            'platform_fee_cents' => 250,
            'creator_earnings_cents' => 2250,
            'status' => 'paid',
            'paid_at' => now(),
        ]);
    }

    /** @return array{cookie: string} */
    private function portalSessionFor(string $email): array
    {
        $sessionToken = Str::random(80);
        $recovery = DigitalProductOrderRecovery::query()->create([
            'uuid' => (string) Str::uuid(),
            'email' => $email,
            'email_hash' => hash('sha256', $email),
            'token_hash' => hash('sha256', Str::random(20)),
            'expires_at' => now()->subMinute(),
            'redeemed_at' => now(),
            'session_token_hash' => hash('sha256', $sessionToken),
            'session_expires_at' => now()->addDays(30),
        ]);

        return ['cookie' => "{$recovery->uuid}.{$sessionToken}"];
    }

    private function stateful(): static
    {
        config()->set('app.url', 'http://localhost');
        config()->set('sanctum.stateful', ['localhost']);

        return $this->withCredentials()->withHeader('Referer', 'http://localhost');
    }
}
