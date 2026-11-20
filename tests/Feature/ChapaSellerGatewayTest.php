<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\CreatorChapaGateway;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\CreatorVerificationAllowance;
use App\Storefront\StorefrontCheckout;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

class ChapaSellerGatewayTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        settings()->save(['billing.enable' => true]);
    }

    public function testProSellerCanSaveChapaKeysAndTakeAHostedCheckout(): void
    {
        Queue::fake();
        [$creator, $product] = $this->seller();
        $this->activatePro($creator);
        Http::fake([
            'https://api.chapa.co/v1/banks' => Http::response([
                'message' => 'Banks retrieved',
                'data' => [['slug' => 'telebirr']],
            ]),
            'https://api.chapa.co/v1/transaction/initialize' => Http::response([
                'status' => 'success',
                'data' => ['checkout_url' => 'https://checkout.chapa.global/CHSELLER1'],
            ]),
        ]);

        $savedResponse = $this->browser()->actingAs($creator)->putJson('/api/v1/storefront/chapa-gateway', [
            'public_key' => 'CHAPUBK-test-public',
            'secret_key' => 'seller-secret',
        ]);
        $savedResponse->assertOk()
            ->assertJsonPath('data.has_secret', true)
            ->assertJsonPath('data.pro', true);
        $this->assertStringNotContainsString('seller-secret', $savedResponse->getContent());

        $saved = CreatorChapaGateway::query()->where('workspace_id', $product->workspace_id)->firstOrFail();
        $this->assertSame('seller-secret', $saved->secret_key);
        $this->assertStringEndsWith('blic', $this->browser()->actingAs($creator)->getJson('/api/v1/storefront/chapa-gateway')->json('data.public_key_masked'));

        $this->browser()->actingAs($creator)->putJson('/api/v1/storefront/payment-collector', [
            'collector' => 'chapa',
        ])->assertOk()->assertJsonPath('data.collector', 'chapa');

        $order = app(StorefrontCheckout::class)->create($product->fresh()->load('creator'), null, [
            'name' => 'Buyer',
            'email' => 'buyer@example.test',
        ]);

        $this->assertSame('chapa', $order->payment_gateway);
        $this->assertSame(CreatorVerificationAllowance::PRO_POLICY, $order->monetization_policy);
        $this->assertSame('https://checkout.chapa.global/CHSELLER1', $order->chapaCheckoutUrl);
        $this->assertLessThanOrEqual(20, strlen((string) $order->chapa_tx_ref));
        $this->assertSame(0, \App\Payments\Models\DirectPaymentVerification::query()->where('payable_id', $order->id)->count());
        Http::assertSent(fn ($request): bool => $request->url() === 'https://api.chapa.co/v1/transaction/initialize'
            && $request->hasHeader('Authorization', 'Bearer seller-secret')
            && !$request->hasHeader('Idempotency-Key')
            && $request['amount'] === '100.00'
            && $request['tx_ref'] === $order->chapa_tx_ref);
    }

    public function testABadSecretIsNotStored(): void
    {
        [$creator] = $this->seller();
        $this->activatePro($creator);
        Http::fake([
            'https://api.chapa.co/v1/banks' => Http::response(['status' => 'error'], 401),
        ]);

        $this->browser()->actingAs($creator)->putJson('/api/v1/storefront/chapa-gateway', [
            'public_key' => 'CHAPUBK-test-public',
            'secret_key' => 'bad-secret',
        ])->assertStatus(422);

        $this->assertSame(0, CreatorChapaGateway::query()->count());
    }

    public function testFreeSellerCannotConnectChapaOrStartChapaCheckout(): void
    {
        [$creator, $product] = $this->seller();
        $product->workspace->update(['active_payment_collector' => 'chapa']);

        $this->browser()->actingAs($creator)->putJson('/api/v1/storefront/chapa-gateway', [
            'public_key' => 'CHAPUBK-test-public',
            'secret_key' => 'seller-secret',
        ])->assertForbidden();

        try {
            app(StorefrontCheckout::class)->create($product->fresh()->load('creator'), null, [
                'name' => 'Buyer',
                'email' => 'buyer@example.test',
            ]);
            $this->fail('Free Chapa checkout started.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }

        $this->assertSame(0, StorefrontOrder::query()->where('digital_product_id', $product->id)->count());
    }

    public function testReturnWithTheWrongAmountStaysUnpaid(): void
    {
        $order = $this->chapaOrderAwaitingReturn();

        $this->fakeVerification($order, amount: 5000, currency: 'ETB', reference: (string) $order->chapa_tx_ref);
        $this->get('/storefront/chapa/return/'.$order->chapa_tx_ref)->assertRedirect();
        Http::assertSent(fn ($request): bool => str_contains($request->url(), '/transaction/verify/'.$order->chapa_tx_ref));

        $this->assertSame('pending_payment', $order->fresh()->status);
        $this->assertSame(0, DownloadEntitlement::query()->where('storefront_order_id', $order->id)->count());
    }

    public function testReturnWithTheWrongCurrencyStaysUnpaid(): void
    {
        $order = $this->chapaOrderAwaitingReturn();

        $this->fakeVerification($order, amount: 10000, currency: 'USD', reference: (string) $order->chapa_tx_ref);
        $this->get('/storefront/chapa/return/'.$order->chapa_tx_ref)->assertRedirect();
        Http::assertSent(fn ($request): bool => str_contains($request->url(), '/transaction/verify/'.$order->chapa_tx_ref));

        $this->assertSame('pending_payment', $order->fresh()->status);
        $this->assertSame(0, DownloadEntitlement::query()->where('storefront_order_id', $order->id)->count());
    }

    public function testReturnWithTheWrongReferenceStaysUnpaid(): void
    {
        $order = $this->chapaOrderAwaitingReturn();

        $this->fakeVerification($order, amount: 10000, currency: 'ETB', reference: 'wrongrefwrongrefwr');
        $this->get('/storefront/chapa/return/'.$order->chapa_tx_ref)->assertRedirect();
        Http::assertSent(fn ($request): bool => str_contains($request->url(), '/transaction/verify/'.$order->chapa_tx_ref));

        $this->assertSame('pending_payment', $order->fresh()->status);
        $this->assertSame(0, DownloadEntitlement::query()->where('storefront_order_id', $order->id)->count());
    }

    public function testRetiredCollectorCannotBeReactivatedAndSavedAccountsRemain(): void
    {
        Queue::fake();
        [$creator, $product] = $this->seller();
        $this->activatePro($creator);
        $account = CreatorPaymentMethod::query()->create([
            'workspace_id' => $product->workspace_id,
            'user_id' => $creator->id,
            'provider' => 'cbe',
            'account_number' => '1000123456789',
            'account_fingerprint' => hash('sha256', 'retired-collector-'.$creator->id),
            'account_name_raw' => 'Abebe Kebede',
            'account_name_normalized' => 'abebe kebede',
            'status' => 'approved',
            'provider_registration_status' => 'registered',
            'is_active' => true,
        ]);
        Http::fake([
            'https://api.chapa.co/v1/transaction/initialize' => Http::response([
                'status' => 'success',
                'data' => ['checkout_url' => 'https://checkout.chapa.global/CHSWITCH1'],
            ]),
        ]);
        CreatorChapaGateway::query()->create([
            'workspace_id' => $product->workspace_id,
            'user_id' => $creator->id,
            'public_key' => 'CHAPUBK-test-public',
            'secret_key' => 'seller-secret',
        ]);

        $this->browser()->actingAs($creator)->putJson('/api/v1/storefront/payment-collector', [
            'collector' => 'chapa',
        ])->assertOk();

        $this->browser()->actingAs($creator)->putJson('/api/v1/storefront/payment-collector', [
            'collector' => 'verify_et',
        ])->assertUnprocessable();

        $this->assertSame('chapa', $product->workspace->fresh()->active_payment_collector);
        $this->assertModelExists($account);
        $this->assertSame('seller-secret', CreatorChapaGateway::query()
            ->where('workspace_id', $product->workspace_id)->firstOrFail()->secret_key);

        $order = app(StorefrontCheckout::class)->create($product->fresh()->load('creator'), null, [
            'name' => 'Buyer',
            'email' => 'buyer@example.test',
        ]);
        $this->assertSame('chapa', $order->payment_gateway);
        $this->assertNull($order->creator_payment_method_id);
        $this->assertSame(0, \App\Payments\Models\DirectPaymentVerification::query()
            ->where('payable_id', $order->id)->count());
    }

    public function testReturnFulfillsOnceAndStillFulfillsAfterProLapses(): void
    {
        Queue::fake();
        [$creator, $product] = $this->seller();
        $subscription = $this->activatePro($creator);
        CreatorChapaGateway::query()->create([
            'workspace_id' => $product->workspace_id,
            'user_id' => $creator->id,
            'public_key' => 'CHAPUBK-test-public',
            'secret_key' => 'seller-secret',
        ]);
        $product->workspace->update(['active_payment_collector' => 'chapa']);
        Http::fake(function ($request) {
            if (str_contains($request->url(), '/transaction/initialize')) {
                return Http::response([
                    'status' => 'success',
                    'data' => ['checkout_url' => 'https://checkout.chapa.global/CHSELLER2'],
                ]);
            }

            $reference = basename((string) parse_url($request->url(), PHP_URL_PATH));

            return Http::response([
                'status' => 'success',
                'data' => [
                    'status' => 'success',
                    'amount' => '100.00',
                    'currency' => 'ETB',
                    'tx_ref' => $reference,
                    'reference' => 'CHSELLER2',
                ],
            ]);
        });
        $order = app(StorefrontCheckout::class)->create($product->fresh()->load('creator'), null, [
            'name' => 'Buyer',
            'email' => 'buyer@example.test',
        ]);
        $subscription->update(['ends_at' => now()->subDay(), 'renews_at' => now()->subDay()]);
        $this->assertFalse(app(CreatorVerificationAllowance::class)->isPro($creator->fresh()));

        $this->get('/storefront/chapa/return/'.$order->chapa_tx_ref)->assertRedirect();
        $this->get('/storefront/chapa/return/'.$order->chapa_tx_ref)->assertRedirect();

        $this->assertSame('paid', $order->fresh()->status);
        $this->assertSame(1, DownloadEntitlement::query()->where('storefront_order_id', $order->id)->count());
        $this->assertSame(0, \App\Payments\Models\DirectPaymentVerification::query()->where('payable_id', $order->id)->count());

        try {
            app(StorefrontCheckout::class)->create($product->fresh()->load('creator'), null, [
                'name' => 'Buyer',
                'email' => 'buyer@example.test',
            ]);
            $this->fail('A new Chapa checkout started after Pro lapsed.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }
    }

    private function chapaOrderAwaitingReturn(): StorefrontOrder
    {
        Queue::fake();
        [$creator, $product] = $this->seller();
        $this->activatePro($creator);
        CreatorChapaGateway::query()->create([
            'workspace_id' => $product->workspace_id,
            'user_id' => $creator->id,
            'public_key' => 'CHAPUBK-test-public',
            'secret_key' => 'seller-secret',
        ]);
        $product->workspace->update(['active_payment_collector' => 'chapa']);
        Http::fake([
            'https://api.chapa.co/v1/transaction/initialize' => Http::response([
                'status' => 'success',
                'data' => ['checkout_url' => 'https://checkout.chapa.global/CHMISMATCH'],
            ]),
        ]);

        return app(StorefrontCheckout::class)->create($product->fresh()->load('creator'), null, [
            'name' => 'Buyer',
            'email' => 'buyer@example.test',
        ]);
    }

    private function fakeVerification(StorefrontOrder $order, int $amount, string $currency, string $reference): void
    {
        Http::fake([
            'https://api.chapa.co/v1/transaction/verify/'.$order->chapa_tx_ref => Http::response([
                'status' => 'success',
                'data' => [
                    'status' => 'success',
                    'amount' => \App\Payments\Chapa\ChapaV2Client::majorFromCents($amount),
                    'currency' => $currency,
                    'tx_ref' => $reference,
                    'reference' => 'CHMISMATCH',
                ],
            ]),
        ]);
    }

    private function browser(): static
    {
        return $this->withSession(['_token' => 'test-token'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'test-token');
    }

    /** @return array{0: User, 1: DigitalProduct} */
    private function seller(): array
    {
        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Digital guide',
            'price_cents' => 10000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);
        $file = FileEntry::query()->create([
            'name' => 'guide.pdf',
            'file_name' => Str::random(20),
            'file_size' => 1024,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);
        $product->setRelation('workspace', $workspace);

        return [$creator, $product];
    }

    private function activatePro(User $creator): Subscription
    {
        $plan = Product::query()->create([
            'name' => 'Pro '.Str::random(6),
            'uuid' => (string) Str::uuid(),
            'free' => false,
            'is_default' => false,
        ]);
        $price = Price::query()->create([
            'product_id' => $plan->id,
            'currency' => 'ETB',
            'amount' => 500,
            'interval' => 'month',
            'interval_count' => 1,
        ]);

        return Subscription::query()->create([
            'user_id' => $creator->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'gateway_name' => 'verify_et',
            'gateway_status' => 'active',
            'renews_at' => now()->addMonth(),
        ]);
    }
}
