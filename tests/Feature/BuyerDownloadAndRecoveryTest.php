<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DirectPaymentMethod;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\OrderRecoveryService;
use App\Storefront\Services\DirectStorefrontCheckout;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class BuyerDownloadAndRecoveryTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.verify_et.enabled', true);
    }

    public function testMockedVerifiedPurchaseGrantsSecureDownloadImmediately(): void
    {
        Queue::fake();
        config()->set('services.verify_et.enabled', true);
        config()->set('services.verify_et.api_key', 'synthetic-test-key');
        config()->set('app.url', 'http://localhost');
        Http::preventStrayRequests();
        Storage::fake('local');

        [$order, $token, $fileContent] = $this->createPendingCheckoutWithFile();
        $reference = 'FT26'.Str::upper(Str::random(14));

        Http::fake(['verify.et/api/verify?*' => Http::response([
            'requestId' => 'buyer-journey-request',
            'verification' => ['processingStatus' => 'completed'],
            'data' => [[
                'bank' => 'cbe',
                'status' => 'success',
                'verified' => true,
                'amount' => 100,
                'currency' => 'ETB',
                'receiptNumber' => $reference,
                'referenceNumber' => $reference,
                'settlementAccountMatch' => [
                    'matched' => true,
                    'ambiguous' => false,
                    'matchConfidence' => 'high',
                    'candidateCount' => 1,
                    'matchedSettlementAccount' => '1000123456789',
                ],
            ]],
        ], 200)]);

        $transport = \Mockery::mock(\App\Payments\VerifyEt\VerifyEtHttp::class);
        $transport->shouldReceive('factory')->andReturn(Http::getFacadeRoot());
        app()->instance(\App\Payments\VerifyEt\VerifyEtHttp::class, $transport);

        $this->withHeader('X-Order-Access-Token', $token)
            ->getJson('/api/v1/public/direct-orders/'.$order->uuid.'/payment-instructions')
            ->assertOk()
            ->assertJsonPath('data.account_number', '1000123456789');

        $this->withHeader('X-Order-Access-Token', $token)
            ->postJson('/api/v1/public/direct-orders/'.$order->uuid.'/reference', [
                'reference' => $reference,
                'account_suffix' => '12345678',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'paid');

        $payload = $this->withHeader('X-Order-Access-Token', $token)
            ->getJson('/api/v1/public/direct-orders/'.$order->uuid)
            ->assertOk()
            ->json('data');

        $this->assertSame('paid', $payload['status']);
        $this->assertCount(1, $payload['downloads']);
        $this->assertSame('guide.pdf', $payload['downloads'][0]['name']);

        $download = $this->get($payload['downloads'][0]['url']);
        $download->assertOk();
        $this->assertSame($fileContent, $download->streamedContent());
    }

    public function testPaidOrderGrantsImmediateSecureDownload(): void
    {
        Queue::fake();
        config()->set('app.url', 'http://localhost');
        Storage::fake('local');

        [$order, $token, $fileContent] = $this->createPaidOrderWithFile();

        $payload = $this->withHeader('X-Order-Access-Token', $token)
            ->getJson('/api/v1/public/direct-orders/'.$order->uuid)
            ->assertOk()
            ->json('data');

        $this->assertSame('paid', $payload['status']);
        $this->assertCount(1, $payload['downloads']);
        $this->assertSame('guide.pdf', $payload['downloads'][0]['name']);
        $this->assertSame(config('storefront.download_limit'), $payload['downloads'][0]['remaining_downloads']);
        $downloadUrl = $payload['downloads'][0]['url'];
        $this->assertStringContainsString('/storefront/downloads/', $downloadUrl);

        $download = $this->get($downloadUrl);
        $download->assertOk();
        $this->assertSame($fileContent, $download->streamedContent());
    }

    public function testPendingVerifyingManualReviewAndRejectedOrdersCannotDownloadFiles(): void
    {
        config()->set('app.url', 'http://localhost');
        Storage::fake('local');

        foreach (['pending_payment', 'verifying', 'manual_review', 'failed_verification'] as $status) {
            [$order, $token, $file] = $this->createOrderInStatusWithFile($status);

            $payload = $this->withHeader('X-Order-Access-Token', $token)
                ->getJson('/api/v1/public/direct-orders/'.$order->uuid)
                ->assertOk()
                ->json('data');

            $this->assertSame($status, $payload['status'], $status);
            $this->assertSame([], $payload['downloads'], $status);

            $entitlement = DownloadEntitlement::query()->create([
                'storefront_order_id' => $order->id,
                'file_entry_id' => $file->id,
                'token' => (string) Str::uuid(),
                'download_limit' => 5,
                'expires_at' => now()->addDays(7),
            ]);

            $this->get(\Illuminate\Support\Facades\URL::temporarySignedRoute(
                'storefront.download',
                now()->addDay(),
                ['token' => $entitlement->token],
            ))->assertForbidden();
        }
    }

    public function testDuplicateReferenceCannotBeSubmittedTwice(): void
    {
        Queue::fake();
        config()->set('services.verify_et.enabled', true);
        config()->set('services.verify_et.api_key', 'synthetic-test-key');
        config()->set('app.url', 'http://localhost');
        Http::preventStrayRequests();
        Storage::fake('local');

        [$order, $verification] = $this->createOrderWithFile();
        $token = $order->getAttribute('paymentAccessToken');

        $item = [
            'bank' => 'cbe',
            'status' => 'success',
            'verified' => true,
            'amount' => 10000,
            'currency' => 'ETB',
            'receiptNumber' => $verification->reference,
            'referenceNumber' => $verification->reference,
            'settlementAccountMatch' => [
                'matched' => true,
                'ambiguous' => false,
                'matchConfidence' => 'high',
                'candidateCount' => 1,
                'matchedSettlementAccount' => '1000123456789',
            ],
        ];
        Http::fake(['verify.et/api/verify?*' => Http::response([
            'requestId' => 'synthetic',
            'verification' => ['processingStatus' => 'completed'],
            'data' => [$item],
        ], 200)]);

        $this->withHeader('X-Order-Access-Token', $token)
            ->postJson('/api/v1/public/direct-orders/'.$order->uuid.'/reference', ['reference' => $verification->reference])
            ->assertOk();

        $order2 = $this->createAnotherOrder($order->creator_id, $order->digital_product_id);
        $token2 = $order2->getAttribute('paymentAccessToken');
        $this->withHeader('X-Order-Access-Token', $token2)
            ->postJson('/api/v1/public/direct-orders/'.$order2->uuid.'/reference', ['reference' => $verification->reference])
            ->assertUnprocessable();
    }

    public function testWrongRecipientPaymentDoesNotUnlockDownload(): void
    {
        Queue::fake();
        config()->set('services.verify_et.enabled', true);
        config()->set('services.verify_et.api_key', 'synthetic-test-key');
        config()->set('app.url', 'http://localhost');
        Http::preventStrayRequests();
        Storage::fake('local');

        [$order, $token] = $this->createPendingCheckoutWithFile();
        $reference = 'FT26'.Str::upper(Str::random(14));

        Http::fake(['verify.et/api/verify?*' => Http::response([
            'requestId' => 'wrong-recipient',
            'verification' => ['processingStatus' => 'completed'],
            'data' => [[
                'bank' => 'cbe',
                'status' => 'success',
                'verified' => true,
                'amount' => 100,
                'currency' => 'ETB',
                'receiptNumber' => $reference,
                'settlementAccountMatch' => [
                    'matched' => true,
                    'ambiguous' => false,
                    'matchConfidence' => 'high',
                    'candidateCount' => 1,
                    'matchedSettlementAccount' => '9999999999999',
                ],
            ]],
        ], 200)]);

        $transport = \Mockery::mock(\App\Payments\VerifyEt\VerifyEtHttp::class);
        $transport->shouldReceive('factory')->andReturn(Http::getFacadeRoot());
        app()->instance(\App\Payments\VerifyEt\VerifyEtHttp::class, $transport);

        $this->withHeader('X-Order-Access-Token', $token)
            ->postJson('/api/v1/public/direct-orders/'.$order->uuid.'/reference', [
                'reference' => $reference,
                'account_suffix' => '12345678',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'failed_verification');

        $payload = $this->withHeader('X-Order-Access-Token', $token)
            ->getJson('/api/v1/public/direct-orders/'.$order->uuid)
            ->assertOk()
            ->json('data');

        $this->assertSame('failed_verification', $payload['status']);
        $this->assertSame([], $payload['downloads']);
    }

    public function testRecoverySessionCanDownloadAndRedownloadOnAnotherDevice(): void
    {
        Queue::fake();
        config()->set('app.url', 'http://localhost');
        Storage::fake('local');
        RateLimiter::clear('digital-product-recovery:email:'.hash('sha256', 'buyer@example.test'));
        RateLimiter::clear('digital-product-recovery:ip:127.0.0.1');

        [$order, $token, $fileContent] = $this->createPaidOrderWithFile();
        $entitlement = $order->fresh()->entitlements()->first();

        $this->stateful()->postJson('/api/v1/public/my-portal/request-code', ['email' => 'buyer@example.test'])->assertOk();

        $recovery = \App\Storefront\Models\DigitalProductOrderRecovery::query()
            ->where('email_hash', hash('sha256', 'buyer@example.test'))
            ->first();
        $recovery->update([
            'token_hash' => hash('sha256', hash('sha256', 'buyer@example.test').'.123456'),
            'expires_at' => now()->addMinutes(10),
        ]);

        $verifyResponse = $this->stateful()->postJson('/api/v1/public/my-portal/verify-code', [
            'email' => 'buyer@example.test', 'code' => '123456',
        ])->assertOk();
        $cookie = $verifyResponse->getCookie(OrderRecoveryService::COOKIE, decrypt: false);
        $this->assertNotNull($cookie);

        $purchases = $this->stateful()->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie->getValue()])
            ->getJson('/api/v1/public/my-portal/purchases')
            ->assertOk()
            ->json('orders');

        $this->assertCount(1, $purchases);
        $this->assertSame($order->uuid, $purchases[0]['id']);
        $this->assertCount(1, $purchases[0]['downloads']);
        $this->assertSame('guide.pdf', $purchases[0]['downloads'][0]['name']);

        $portalDownloadUrl = $this->stateful()->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie->getValue()])
            ->postJson('/api/v1/public/my-portal/purchases/'.$order->uuid.'/downloads/'.$entitlement->id)
            ->assertOk()
            ->json('url');

        $this->assertStringContainsString('/storefront/downloads/', $portalDownloadUrl);

        $download = $this->get($portalDownloadUrl);
        $download->assertOk();
        $this->assertSame($fileContent, $download->streamedContent());

        $downloadAgain = $this->get($portalDownloadUrl);
        $downloadAgain->assertOk();
        $this->assertSame($fileContent, $downloadAgain->streamedContent());

        // Access token from original device still works after recovery on another device.
        $this->withHeader('X-Order-Access-Token', $token)
            ->getJson('/api/v1/public/direct-orders/'.$order->uuid)
            ->assertOk()
            ->assertJsonPath('data.status', 'paid');
    }

    public function testAnotherBuyerCannotDownloadSomeoneElsePurchase(): void
    {
        config()->set('app.url', 'http://localhost');
        Storage::fake('local');

        [$order] = $this->createPaidOrderWithFile();
        $entitlement = $order->fresh()->entitlements()->first();

        $email = 'other-buyer@example.test';
        $sessionToken = Str::random(80);
        $recovery = \App\Storefront\Models\DigitalProductOrderRecovery::query()->create([
            'uuid' => (string) Str::uuid(),
            'email' => $email,
            'email_hash' => hash('sha256', $email),
            'token_hash' => hash('sha256', hash('sha256', $email).'.123456'),
            'expires_at' => now()->addMinutes(10),
            'redeemed_at' => now(),
            'session_token_hash' => hash('sha256', $sessionToken),
            'session_expires_at' => now()->addDays(30),
        ]);
        $cookie = $recovery->uuid.'.'.$sessionToken;

        $purchases = $this->stateful()->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->getJson('/api/v1/public/my-portal/purchases')
            ->assertOk()
            ->json('orders');

        $this->assertCount(0, $purchases);

        $this->stateful()->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->postJson('/api/v1/public/my-portal/purchases/'.$order->uuid.'/downloads/'.$entitlement->id)
            ->assertNotFound();
    }

    public function testMissingAccessTokenCannotReadOrderOrDownloads(): void
    {
        config()->set('app.url', 'http://localhost');
        Storage::fake('local');

        [$order] = $this->createPaidOrderWithFile();

        $this->getJson('/api/v1/public/direct-orders/'.$order->uuid)->assertForbidden();
        $this->withHeader('X-Order-Access-Token', 'not-the-real-token')
            ->getJson('/api/v1/public/direct-orders/'.$order->uuid)
            ->assertForbidden();
    }

    /** @return array{0: StorefrontOrder, 1: string, 2: string, 3: FileEntry} */
    private function createPaidOrderWithFile(): array
    {
        [$order, $token, $fileContent, $file] = $this->createPendingCheckoutWithFile();
        $order->update(['status' => 'paid', 'paid_at' => now()]);
        DownloadEntitlement::query()->create([
            'storefront_order_id' => $order->id,
            'file_entry_id' => $file->id,
            'token' => (string) Str::uuid(),
            'download_limit' => config('storefront.download_limit'),
            'expires_at' => now()->addDays(config('storefront.download_days')),
        ]);

        return [$order, $token, $fileContent, $file];
    }

    /** @return array{0: StorefrontOrder, 1: string, 2: string, 3: FileEntry} */
    private function createPendingCheckoutWithFile(): array
    {
        [$creator, $workspace, $product, $file, $fileContent] = $this->seedProductWithFile();

        DirectPaymentMethod::query()->updateOrCreate(
            ['code' => 'cbe'],
            ['checkout_enabled' => true, 'automated_verification_supported' => true, 'recipient_matching_supported' => true, 'operationally_suspended' => false],
        );

        \App\Storefront\Models\CreatorPaymentMethod::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'provider' => 'cbe',
            'account_number' => '1000123456789',
            'account_fingerprint' => hash('sha256', 'test-account-'.$creator->id),
            'account_name_raw' => 'Abebe Kebede Wolde',
            'account_name_normalized' => 'abebe kebede wolde',
            'status' => 'approved',
            'provider_registration_status' => 'registered',
            'is_active' => true,
        ]);

        $order = app(DirectStorefrontCheckout::class)->create($product->load('creator'), null, [
            'name' => 'Buyer', 'email' => 'buyer@example.test',
        ]);
        $order->syncOriginal();
        $token = $order->getAttribute('paymentAccessToken');

        return [$order, $token, $fileContent, $file];
    }

    /** @return array{0: StorefrontOrder, 1: string, 2: FileEntry} */
    private function createOrderInStatusWithFile(string $status): array
    {
        [$order, $token, $fileContent, $file] = $this->createPendingCheckoutWithFile();
        $order->update(['status' => $status]);

        return [$order, $token, $file];
    }

    /** @return array{0: StorefrontOrder, 1: DirectPaymentVerification, 2: string, 3: FileEntry} */
    private function createOrderWithFile(): array
    {
        [$order, $token, $fileContent, $file] = $this->createPendingCheckoutWithFile();

        $verification = DirectPaymentVerification::query()->create([
            'reference' => 'FT26'.Str::upper(Str::random(14)),
            'payable_type' => $order::class,
            'payable_id' => $order->id,
            'bank_code' => 'cbe',
            'settlement_account' => '1000123456789',
            'amount_cents' => 10000,
            'currency' => 'ETB',
        ]);

        return [$order, $verification, $fileContent, $file];
    }

    private function createAnotherOrder(int $creatorId, int $productId): StorefrontOrder
    {
        $product = DigitalProduct::query()->find($productId);
        $order = app(DirectStorefrontCheckout::class)->create($product->load('creator'), null, [
            'name' => 'Buyer 2', 'email' => 'buyer2@example.test',
        ]);
        $order->syncOriginal();

        return $order;
    }

    /** @return array{0: User, 1: \Common\Workspaces\Workspace, 2: DigitalProduct, 3: FileEntry, 4: string} */
    private function seedProductWithFile(): array
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
        $fileContent = "%PDF-1.4\nBuyer delivery test\n";
        $file = FileEntry::query()->create([
            'name' => 'guide.pdf',
            'file_name' => 'bd-'.Str::random(12).'.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'file_size' => strlen($fileContent),
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $file->getDisk()->put($file->getStoragePath(), $fileContent);
        $product->files()->attach($file->id);

        return [$creator, $workspace, $product, $file, $fileContent];
    }

    private function stateful(): static
    {
        config()->set('app.url', 'http://localhost');
        config()->set('sanctum.stateful', ['localhost']);
        $csrfToken = 'test-csrf-token';

        return $this->withCredentials()
            ->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
