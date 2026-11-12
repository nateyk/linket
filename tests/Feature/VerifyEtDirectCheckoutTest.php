<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\VerifyEt\VerifyEtGateway;
use App\Payments\Models\VerifyEtWebhookDelivery;
use App\Jobs\ProcessVerifyEtWebhook;
use App\Payments\VerifyEt\ReceiptReference;
use App\Storefront\Jobs\DeliverStorefrontOrder;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Services\StorefrontVerificationSession;
use App\Storefront\Models\CommissionAccrual;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductEarningsLedger;
use App\Storefront\Services\DirectStorefrontCheckout;
use App\Storefront\Resources\PublicDigitalProductResource;
use Illuminate\Http\Request;
use App\Storefront\StorefrontCheckout;
use Common\Billing\Models\Product;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use App\Storefront\Notifications\PaymentReviewNeededNotification;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class VerifyEtDirectCheckoutTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.verify_et.enabled', true);
        settings()->save(['billing.enable' => true]);
        $plan = Product::query()->where('free', true)->first();
        if (!$plan) {
            $plan = Product::query()->create([
                'uuid' => (string) Str::uuid(), 'name' => 'Free', 'free' => true,
                'is_default' => true, 'position' => 1,
            ]);
        }
        $plan->update([
            'is_default' => true,
            'storefront_benefits' => [
                ...($plan->storefront_benefits ?? []),
                'commission_bps' => 150,
                'platform_fee_percent' => 1.5,
            ],
        ]);
    }

    public function testAutomaticSelectionSkipsNewerAccountWithUnavailableBank(): void
    {
        \Illuminate\Support\Facades\Http::preventStrayRequests();
        [$seedOrder] = $this->orderAndVerification();
        $product = DigitalProduct::query()->findOrFail($seedOrder->digital_product_id)->load('creator');
        $olderAccount = CreatorPaymentMethod::query()->findOrFail($seedOrder->creator_payment_method_id);
        \App\Storefront\Models\DirectPaymentMethod::query()->where('code', 'telebirr')->update(['checkout_enabled' => false]);
        $newerAccount = CreatorPaymentMethod::query()->create([
            'workspace_id' => $product->workspace_id, 'user_id' => $product->user_id,
            'provider' => 'telebirr', 'account_number' => '0912345678',
            'account_fingerprint' => hash('sha256', (string) Str::uuid()),
            'account_name_raw' => 'Synthetic Recipient', 'account_name_normalized' => 'synthetic recipient',
            'status' => 'approved', 'provider_registration_status' => 'registered', 'is_active' => true,
        ]);

        $order = app(StorefrontCheckout::class)->create($product, null, ['name' => 'Buyer', 'email' => 'buyer@example.test']);
        $this->assertSame($olderAccount->id, $order->creator_payment_method_id);
        $this->assertSame($olderAccount->account_number, $order->payment_account_snapshot);
        $this->assertNotSame($newerAccount->id, $order->creator_payment_method_id);
    }

    public function testExplicitUnavailableAccountDoesNotFallBackToAnotherRecipient(): void
    {
        \Illuminate\Support\Facades\Http::preventStrayRequests();
        [$seedOrder] = $this->orderAndVerification();
        $product = DigitalProduct::query()->findOrFail($seedOrder->digital_product_id)->load('creator');
        $account = CreatorPaymentMethod::query()->findOrFail($seedOrder->creator_payment_method_id);
        $unavailable = $account->replicate();
        $unavailable->account_fingerprint = hash('sha256', (string) Str::uuid());
        $unavailable->is_active = false;
        $unavailable->save();
        $before = \App\Storefront\Models\StorefrontOrder::query()->count();
        try {
            app(StorefrontCheckout::class)->create($product, null, ['email' => 'buyer@example.test'], $unavailable->id);
            $this->fail('An explicitly unavailable recipient was accepted.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
        }
        $this->assertSame($before, \App\Storefront\Models\StorefrontOrder::query()->count());
    }

    public function testInvalidExplicitAccountIdDoesNotFallBack(): void
    {
        \Illuminate\Support\Facades\Http::preventStrayRequests();
        [$seedOrder] = $this->orderAndVerification();
        $product = DigitalProduct::query()->findOrFail($seedOrder->digital_product_id)->load('creator');
        $before = \App\Storefront\Models\StorefrontOrder::query()->count();
        try {
            app(StorefrontCheckout::class)->create($product, null, ['email' => 'buyer@example.test'], 0);
            $this->fail('Checkout accepted an invalid recipient ID.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
        }
        $this->assertSame($before, \App\Storefront\Models\StorefrontOrder::query()->count());
    }

    public function testExplicitAccountFromAnotherCreatorOrWorkspaceIsRejected(): void
    {
        \Illuminate\Support\Facades\Http::preventStrayRequests();
        [$seedOrder] = $this->orderAndVerification();
        $product = DigitalProduct::query()->findOrFail($seedOrder->digital_product_id)->load('creator');
        $account = CreatorPaymentMethod::query()->findOrFail($seedOrder->creator_payment_method_id);
        $other = User::factory()->create();
        $otherWorkspace = (new CreateWorkspace())->createPersonalWorkspace($other);
        foreach ([['user_id' => $other->id, 'workspace_id' => $product->workspace_id], ['user_id' => $product->user_id, 'workspace_id' => $otherWorkspace->id]] as $scope) {
            $foreign = $account->replicate();
            $foreign->fill($scope);
            $foreign->account_fingerprint = hash('sha256', (string) Str::uuid());
            $foreign->save();
            $before = \App\Storefront\Models\StorefrontOrder::query()->count();
            try {
                app(StorefrontCheckout::class)->create($product, null, ['email' => 'buyer@example.test'], $foreign->id);
                $this->fail('Checkout accepted a recipient from another scope.');
            } catch (\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
                $this->assertSame(422, $exception->getStatusCode());
                $this->assertStringNotContainsString($foreign->account_number, $exception->getMessage());
            }
            $this->assertSame($before, \App\Storefront\Models\StorefrontOrder::query()->count());
        }
    }

    public function testCheckoutRevalidatesTheSelectedRecipientAfterAvailabilityChanges(): void
    {
        \Illuminate\Support\Facades\Http::preventStrayRequests();
        [$seedOrder] = $this->orderAndVerification();
        $product = DigitalProduct::query()->findOrFail($seedOrder->digital_product_id)->load('creator');
        $account = CreatorPaymentMethod::query()->findOrFail($seedOrder->creator_payment_method_id);
        $ordersBeforeRead = \App\Storefront\Models\StorefrontOrder::query()->count();
        $reservationsBeforeRead = DB::table('creator_verification_allowances')->count();
        $payload = (new \App\Storefront\Resources\PublicDigitalProductResource($product))->resolve(request());
        $this->assertSame($ordersBeforeRead, \App\Storefront\Models\StorefrontOrder::query()->count());
        $this->assertSame($reservationsBeforeRead, DB::table('creator_verification_allowances')->count());
        $this->assertTrue($payload['can_buy']);
        $this->assertStringNotContainsString($account->account_number, json_encode($payload));
        $before = \App\Storefront\Models\StorefrontOrder::query()->count();
        foreach ([['is_suspended' => true], ['is_active' => false], ['provider_registration_status' => 'pending']] as $change) {
            $account->update(['is_suspended' => false, 'is_active' => true, 'provider_registration_status' => 'registered', ...$change]);
            try {
                app(StorefrontCheckout::class)->create($product, null, ['email' => 'buyer@example.test'], $account->id);
                $this->fail('Checkout accepted an unavailable recipient.');
            } catch (\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
                $this->assertSame(422, $exception->getStatusCode());
            }
            $this->assertSame($before, \App\Storefront\Models\StorefrontOrder::query()->count());
        }
        $account->update(['provider_registration_status' => 'registered']);
        \App\Storefront\Models\DirectPaymentMethod::query()->where('code', $account->provider)->update(['checkout_enabled' => false]);
        try {
            app(StorefrontCheckout::class)->create($product, null, ['email' => 'buyer@example.test'], $account->id);
            $this->fail('Checkout accepted a disabled bank.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
        }
        $this->assertSame($before, \App\Storefront\Models\StorefrontOrder::query()->count());
    }

    public function testMatchedDirectPaymentFulfillsOnceWithoutCustodialLedger(): void
    {
        Queue::fake();
        [$order, $verification] = $this->orderAndVerification();
        $order->fresh()->update(['monetization_policy' => null, 'commission_bps' => 150]);
        $result = $this->matchedResult($verification);

        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));

        $order->refresh();
        $this->assertSame('paid', $order->status);
        $this->assertSame(150, $order->platform_fee_cents);
        $this->assertSame(10000, $order->creator_earnings_cents);
        $this->assertSame(1, CommissionAccrual::query()->where('storefront_order_id', $order->id)->count());
        $this->assertSame(1, $order->entitlements()->count());
        $this->assertSame(0, DigitalProductEarningsLedger::query()->where('storefront_order_id', $order->id)->count());
    }

    public function testWrongRecipientNeverFulfills(): void
    {
        Queue::fake();
        [$order, $verification] = $this->orderAndVerification();
        $result = $this->matchedResult($verification);
        $result['data'][0]['settlementAccountMatch']['matchedSettlementAccount'] = '9999999999999';

        $this->assertSame('mismatch', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertNotSame('paid', $order->fresh()->status);
        $this->assertSame(0, CommissionAccrual::query()->where('storefront_order_id', $order->id)->count());
    }

    public function testReconciliationNeverReopensAnAlreadyPaidOrder(): void
    {
        Queue::fake();
        \Illuminate\Support\Facades\Mail::fake();
        [$order, $verification] = $this->orderAndVerification();
        $order->fresh()->update(['status' => 'paid', 'paid_at' => now()]);
        $verification->update(['status' => 'verifying', 'created_at' => now()->subHours(25)]);
        $this->artisan('billing:reconcile-pending-verifications')->assertSuccessful();
        $this->assertSame('paid', $order->fresh()->status);
    }

    public function testCreatorSalesFiltersAreScopedAndMaskAccountSnapshots(): void
    {
        [$order] = $this->orderAndVerification();
        $order->fresh()->update(['status' => 'paid', 'payment_reference' => 'SYNTHETICSEARCH']);
        [$otherOrder] = $this->orderAndVerification();
        $otherOrder->fresh()->update(['status' => 'paid', 'payment_reference' => 'SYNTHETICSEARCHOTHER']);
        \Common\Workspaces\ActiveWorkspace::clearCache();
        $this->withSession(['_token' => 'test-token'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'test-token')->actingAs($order->creator);
        $this->getJson('/api/v1/storefront/direct-orders?status=paid&search=SYNTHETICSEARCH')->assertOk()->assertJsonFragment(['uuid' => $order->uuid, 'account_ending' => '6789'])->assertJsonMissing(['uuid' => $otherOrder->uuid])->assertJsonPath('totals.sales_count', 1)->assertDontSee('1000123456789');
        $this->getJson('/api/v1/storefront/direct-orders?status=manual_review')->assertOk()->assertJsonMissing(['uuid' => $order->uuid]);
        $this->getJson('/api/v1/storefront/direct-orders?status=invalid')->assertUnprocessable();
    }

    public function testCreatorSalesDateSearchAndPaginationFilters(): void
    {
        [$order] = $this->orderAndVerification();
        $order->fresh()->update(['status' => 'paid', 'payment_reference' => 'SEARCH-FIRST', 'created_at' => '2026-01-05 12:00:00']);
        for ($i = 0; $i < 26; $i++) {
            $copy = $order->fresh()->replicate();
            $copy->uuid = (string) Str::uuid();
            $copy->payment_reference = 'SEARCH-'.str_pad((string) $i, 4, '0', STR_PAD_LEFT);
            $copy->created_at = '2026-02-05 12:00:00';
            $copy->save();
        }
        \Common\Workspaces\ActiveWorkspace::clearCache();
        $this->withSession(['_token' => 'test-token'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'test-token')->actingAs($order->creator);
        $this->getJson('/api/v1/storefront/direct-orders?status=paid&search=SEARCH&from=2026-02-01&to=2026-02-28&page=2')->assertOk()->assertJsonPath('data.total', 26)->assertJsonPath('data.current_page', 2)->assertJsonCount(1, 'data.data')->assertJsonPath('totals.sales_count', 26)->assertJsonMissing(['uuid' => $order->uuid]);
        $this->getJson('/api/v1/storefront/direct-orders?from=2026-02-28&to=2026-02-01')->assertUnprocessable();
    }

    public function testAdminDirectOrderStatusFilterIsAuthorizedAndPaginated(): void
    {
        [$order] = $this->orderAndVerification();
        $order->fresh()->update(['status' => 'manual_review']);
        $admin = User::factory()->create();
        $admin->permissions()->attach(\Common\Permissions\Models\Permission::query()->firstOrCreate(['name' => 'admin.access']));
        $this->withSession(['_token' => 'test-token'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'test-token')->actingAs($admin);
        $this->getJson('/api/v1/admin/storefront/direct-orders?status=manual_review')->assertOk()->assertJsonFragment(['uuid' => $order->uuid])->assertJsonPath('data.per_page', 25);
        $this->getJson('/api/v1/admin/storefront/direct-orders?status=paid')->assertOk()->assertJsonMissing(['uuid' => $order->uuid]);
        $this->getJson('/api/v1/admin/storefront/direct-orders?status=unknown')->assertUnprocessable();
        foreach (['pending_payment', 'verifying', 'paid', 'fulfilled', 'failed_verification', 'manual_review'] as $status) {
            $order->fresh()->update(['status' => $status]);
            $this->getJson('/api/v1/admin/storefront/direct-orders?status='.$status)->assertOk()->assertJsonFragment(['uuid' => $order->uuid, 'status' => $status]);
        }
    }

    public function testTelebirrHttpCheckoutFromAdminSetupToFulfillment(): void
    {
        Queue::fake();
        config()->set('services.verify_et.api_key', 'synthetic-test-key');
        \Illuminate\Support\Facades\Http::preventStrayRequests();
        \Illuminate\Support\Facades\Storage::fake('local');
        [$seedOrder] = $this->orderAndVerification();
        $creator = $seedOrder->creator;
        $catalog = \App\Storefront\Models\DirectPaymentMethod::query()->where('code', 'telebirr')->firstOrFail();
        $admin = User::factory()->create();
        $admin->permissions()->attach(\Common\Permissions\Models\Permission::query()->firstOrCreate(['name' => 'admin.access']));
        $this->withSession(['_token' => 'test-token'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'test-token');
        $this->actingAs($admin)->patchJson('/api/v1/admin/storefront/payment-method-catalog/'.$catalog->id, ['creator_setup_enabled' => true, 'checkout_enabled' => true, 'operationally_suspended' => false])->assertOk();
        \Common\Workspaces\ActiveWorkspace::clearCache();
        $created = $this->actingAs($creator)->postJson('/api/v1/storefront/payment-methods', [
            'provider' => 'telebirr', 'account_number' => '0912345678', 'account_name' => 'Test Recipient',
            'proof' => \Illuminate\Http\UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf'),
        ])->assertCreated();
        $methodId = $created->json('data.id');
        $this->getJson('/api/v1/storefront/payment-methods')
            ->assertOk()->assertJsonFragment(['id' => $methodId, 'checkout_eligible' => false]);
        $this->actingAs($admin)->postJson('/api/v1/admin/storefront/payment-methods/'.$methodId.'/approve')->assertOk();
        $this->postJson('/api/v1/admin/storefront/payment-methods/'.$methodId.'/provider-registration')->assertOk();
        \Common\Workspaces\ActiveWorkspace::clearCache();
        $this->actingAs($creator)->postJson('/api/v1/storefront/payment-methods/'.$methodId.'/activate')->assertOk();
        $this->getJson('/api/v1/storefront/payment-methods')
            ->assertOk()->assertJsonFragment(['id' => $methodId, 'checkout_eligible' => true]);
        $checkout = $this->postJson('/api/v1/storefront/products/'.$seedOrder->digital_product_id.'/checkout', [
            'buyer_name' => 'Buyer', 'buyer_email' => 'buyer@example.test', 'creator_payment_method_id' => $methodId,
        ])->assertOk();
        $reference = 'SYNTHETIC123456';
        \Illuminate\Support\Facades\Http::fake(['verify.et/api/verify?*' => \Illuminate\Support\Facades\Http::response([
            'requestId' => 'synthetic-request', 'verification' => ['processingStatus' => 'completed'], 'data' => [[
                'bank' => 'telebirr', 'status' => 'success', 'verified' => true, 'amount' => 100, 'currency' => 'ETB',
                'transactionNumber' => $reference, 'settlementAccountMatch' => ['matched' => true, 'ambiguous' => false, 'matchConfidence' => 'high', 'candidateCount' => 1, 'matchedSettlementAccount' => '0912345678'],
            ]],
        ], 200)]);
        $transport = \Mockery::mock(\App\Payments\VerifyEt\VerifyEtHttp::class);
        $transport->shouldReceive('factory')->andReturn(\Illuminate\Support\Facades\Http::getFacadeRoot());
        app()->instance(\App\Payments\VerifyEt\VerifyEtHttp::class, $transport);
        $this->withHeader('X-Order-Access-Token', $checkout->json('access_token'))->postJson($checkout->json('reference_endpoint'), ['reference' => $reference])->assertOk()->assertJsonPath('status', 'paid');
        $this->assertSame(1, app(\App\Storefront\Services\CreatorVerificationAllowance::class)->usage($creator)['consumed']);
        $this->assertSame(0, CommissionAccrual::query()->where('creator_id', $creator->id)->count());
        \Illuminate\Support\Facades\Http::assertSent(fn ($request): bool => $request['bank'] === 'telebirr' && $request['transactionNumber'] === $reference && $request['settlementAccount'] === '0912345678');
    }

    public function testSixBanksFulfillOnlyWithMatchingProviderEvidence(): void
    {
        Queue::fake();
        foreach (['cbe', 'telebirr', 'cbebirr', 'boa', 'awash', 'dashen'] as $bank) {
            [$order, $verification] = $this->orderAndVerification();
            $order->fresh()->update(['payment_provider_snapshot' => $bank]);
            $verification->update(['bank_code' => $bank]);
            $result = $this->matchedResult($verification);
            $result['data'][0]['bank'] = $bank;
            $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result), $bank);
            $this->assertSame('paid', $order->fresh()->status, $bank);
            $this->assertSame(0, DigitalProductEarningsLedger::query()->where('storefront_order_id', $order->id)->count(), $bank);
        }
    }

    public function testHttpRejectsInvalidPaymentEvidenceAndDuplicateReferences(): void
    {
        Queue::fake();
        config()->set('services.verify_et.api_key', 'synthetic-test-key');
        \Illuminate\Support\Facades\Http::preventStrayRequests();
        [$seedOrder, $existing] = $this->orderAndVerification();
        $this->withSession(['_token' => 'test-token'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'test-token')->actingAs($seedOrder->creator);
        $transport = \Mockery::mock(\App\Payments\VerifyEt\VerifyEtHttp::class);
        $transport->shouldReceive('factory')->andReturn(\Illuminate\Support\Facades\Http::getFacadeRoot());
        app()->instance(\App\Payments\VerifyEt\VerifyEtHttp::class, $transport);
        foreach (['recipient', 'amount', 'currency', 'duplicate'] as $case) {
            $checkout = $this->postJson('/api/v1/storefront/products/'.$seedOrder->digital_product_id.'/checkout', ['buyer_name' => 'Buyer', 'buyer_email' => 'buyer@example.test', 'creator_payment_method_id' => $seedOrder->creator_payment_method_id])->assertOk();
            $reference = $case === 'duplicate' ? $existing->reference : 'SYNTHETIC'.strtoupper(Str::random(12));
            $item = ['bank' => 'cbe', 'status' => 'success', 'verified' => true, 'amount' => $case === 'amount' ? 101 : 100, 'currency' => 'ETB', 'receiptNumber' => $reference, 'settlementAccountMatch' => ['matched' => true, 'ambiguous' => false, 'matchConfidence' => 'high', 'candidateCount' => 1, 'matchedSettlementAccount' => $case === 'recipient' ? '9999999999999' : '1000123456789']];
            if ($case === 'currency') { unset($item['currency']); }
            \Illuminate\Support\Facades\Http::fake(['verify.et/api/verify?*' => \Illuminate\Support\Facades\Http::response(['requestId' => 'synthetic-'.$case, 'verification' => ['processingStatus' => 'completed'], 'data' => [$item]], 200)]);
            $response = $this->withHeader('X-Order-Access-Token', $checkout->json('access_token'))->postJson($checkout->json('reference_endpoint'), ['reference' => $reference, ...($case === 'duplicate' ? ['account_suffix' => '01234567'] : [])]);
            $response->assertUnprocessable();
            $this->assertNotSame('paid', \App\Storefront\Models\StorefrontOrder::query()->where('uuid', $checkout->json('order_id'))->value('status'), $case);
        }
    }

    public function testHttpCheckoutRejectsDisabledPaymentMethod(): void
    {
        [$order] = $this->orderAndVerification();
        $this->withSession(['_token' => 'test-token'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'test-token')->actingAs($order->creator);
        \App\Storefront\Models\DirectPaymentMethod::query()->where('code', 'cbe')->update(['checkout_enabled' => false]);
        $this->postJson('/api/v1/storefront/products/'.$order->digital_product_id.'/checkout', ['buyer_name' => 'Buyer', 'buyer_email' => 'buyer@example.test', 'creator_payment_method_id' => $order->creator_payment_method_id])->assertUnprocessable();
    }

    public function testAdminSuspensionControlsCreatorSetupAndBuyerCheckout(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        [$seed] = $this->orderAndVerification();
        $creator = $seed->creator;
        $method = CreatorPaymentMethod::query()->create(['workspace_id' => $seed->product->workspace_id, 'user_id' => $creator->id, 'provider' => 'telebirr', 'account_number' => '0912345678', 'account_fingerprint' => hash('sha256', Str::uuid()), 'account_name_raw' => 'Test Recipient', 'account_name_normalized' => 'test recipient', 'status' => 'approved', 'provider_registration_status' => 'registered', 'is_active' => true]);
        $catalog = \App\Storefront\Models\DirectPaymentMethod::query()->where('code', 'telebirr')->firstOrFail();
        $admin = User::factory()->create();
        $admin->permissions()->attach(\Common\Permissions\Models\Permission::query()->firstOrCreate(['name' => 'admin.access']));
        $this->withSession(['_token' => 'test-token'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'test-token');
        $this->actingAs($admin)->patchJson('/api/v1/admin/storefront/payment-method-catalog/'.$catalog->id, ['creator_setup_enabled' => true, 'checkout_enabled' => true, 'operationally_suspended' => true])->assertOk();
        \Common\Workspaces\ActiveWorkspace::clearCache();
        $this->actingAs($creator)->getJson('/api/v1/storefront/payment-methods')->assertOk()->assertJsonMissing(['code' => 'telebirr']);
        $this->postJson('/api/v1/storefront/payment-methods', ['provider' => 'telebirr', 'account_number' => '0912345679', 'account_name' => 'Test Recipient', 'proof' => \Illuminate\Http\UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf')])->assertUnprocessable();
        $checkout = ['buyer_name' => 'Buyer', 'buyer_email' => 'buyer@example.test', 'creator_payment_method_id' => $method->id];
        $this->postJson('/api/v1/storefront/products/'.$seed->digital_product_id.'/checkout', $checkout)->assertUnprocessable();
        $this->actingAs($admin)->patchJson('/api/v1/admin/storefront/payment-method-catalog/'.$catalog->id, ['operationally_suspended' => false])->assertOk();
        \Common\Workspaces\ActiveWorkspace::clearCache();
        $this->actingAs($creator)->postJson('/api/v1/storefront/products/'.$seed->digital_product_id.'/checkout', $checkout)->assertOk();
        $this->assertSame('1000123456789', $seed->fresh()->payment_account_snapshot);
    }

    public function testResubmittedAccountCannotBeSelectedAtCheckoutWhilePending(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        [$order] = $this->orderAndVerification();
        \Common\Workspaces\ActiveWorkspace::clearCache();
        $this->withSession(['_token' => 'test-token'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'test-token')->actingAs($order->creator);
        $this->postJson('/api/v1/storefront/payment-methods/'.$order->creator_payment_method_id.'/resubmit', [
            'account_number' => '1000123456789', 'account_name' => 'Updated Owner', 'proof' => \Illuminate\Http\UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf'),
        ])->assertOk();
        $this->postJson('/api/v1/storefront/products/'.$order->digital_product_id.'/checkout', [
            'buyer_name' => 'Buyer', 'buyer_email' => 'buyer@example.test', 'creator_payment_method_id' => $order->creator_payment_method_id,
        ])->assertUnprocessable();
        $this->assertSame('1000123456789', $order->fresh()->payment_account_snapshot);
    }

    public function testCbeHttpCheckoutFromAdminSetupToFulfillment(): void { $this->runBankHttpFlow('cbe'); }
    public function testCbeBirrHttpCheckoutFromAdminSetupToFulfillment(): void { $this->assertSellerCannotAddReceivingBank('cbebirr'); }
    public function testBoaHttpCheckoutFromAdminSetupToFulfillment(): void { $this->runBankHttpFlow('boa'); }
    public function testAwashHttpCheckoutFromAdminSetupToFulfillment(): void { $this->assertSellerCannotAddReceivingBank('awash'); }
    public function testDashenHttpCheckoutFromAdminSetupToFulfillment(): void { $this->assertSellerCannotAddReceivingBank('dashen'); }

    private function assertSellerCannotAddReceivingBank(string $bank): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        $creator = User::factory()->create();
        $admin = User::factory()->create();
        $admin->permissions()->attach(\Common\Permissions\Models\Permission::query()->firstOrCreate(['name' => 'admin.access']));
        $catalog = \App\Storefront\Models\DirectPaymentMethod::query()->where('code', $bank)->firstOrFail();
        $this->withSession(['_token' => 'test-token'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'test-token');
        $this->actingAs($admin)->patchJson('/api/v1/admin/storefront/payment-method-catalog/'.$catalog->id, [
            'creator_setup_enabled' => true,
            'checkout_enabled' => true,
            'operationally_suspended' => false,
        ])->assertUnprocessable();
        $this->actingAs($creator)->postJson('/api/v1/storefront/payment-methods', [
            'provider' => $bank,
            'account_number' => '0912345678',
            'account_name' => 'Test Recipient',
            'proof' => \Illuminate\Http\UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf'),
        ])->assertUnprocessable();
    }

    private function runBankHttpFlow(string $bank): void
    {
        Queue::fake();
        config()->set('services.verify_et.api_key', 'synthetic-test-key');
        \Illuminate\Support\Facades\Http::preventStrayRequests();
        \Illuminate\Support\Facades\Storage::fake('local');
        [$seedOrder] = $this->orderAndVerification();
        $creator = $seedOrder->creator;
        $catalog = \App\Storefront\Models\DirectPaymentMethod::query()->where('code', $bank)->firstOrFail();
        $admin = User::factory()->create();
        $admin->permissions()->attach(\Common\Permissions\Models\Permission::query()->firstOrCreate(['name' => 'admin.access']));
        $this->withSession(['_token' => 'test-token'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'test-token');
        $this->actingAs($admin)->patchJson('/api/v1/admin/storefront/payment-method-catalog/'.$catalog->id, ['creator_setup_enabled' => true, 'checkout_enabled' => true, 'operationally_suspended' => false])->assertOk();
        $account = match ($bank) { 'telebirr' => '0912345678', 'boa' => '1234567890', default => '1234567890123' };
        \Common\Workspaces\ActiveWorkspace::clearCache();
        $created = $this->actingAs($creator)->postJson('/api/v1/storefront/payment-methods', ['provider' => $bank, 'account_number' => $account, 'account_name' => 'Test Recipient', 'proof' => \Illuminate\Http\UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf')])->assertCreated();
        $methodId = $created->json('data.id');
        $this->actingAs($admin)->postJson('/api/v1/admin/storefront/payment-methods/'.$methodId.'/approve')->assertOk();
        $this->postJson('/api/v1/admin/storefront/payment-methods/'.$methodId.'/provider-registration')->assertOk();
        \Common\Workspaces\ActiveWorkspace::clearCache();
        $this->actingAs($creator)->postJson('/api/v1/storefront/payment-methods/'.$methodId.'/activate')->assertOk();
        $checkout = $this->postJson('/api/v1/storefront/products/'.$seedOrder->digital_product_id.'/checkout', ['buyer_name' => 'Buyer', 'buyer_email' => 'buyer@example.test', 'creator_payment_method_id' => $methodId])->assertOk();
        $reference = $bank === 'cbe' ? 'FT2600001234' : ($bank === 'telebirr' ? 'DET8FJGUJ4' : 'BOA123456789');
        $field = match ($bank) { 'cbe' => 'reference', 'telebirr' => 'transactionNumber', default => 'referenceNumber' };
        $input = match ($bank) { 'cbe' => ['account_suffix' => '01234567'], 'boa' => ['account_suffix' => '01234'], default => [] };
        $providerItem = ['bank' => $bank, 'status' => 'success', 'verified' => true, 'amount' => 100, 'currency' => 'ETB', 'settlementAccountMatch' => ['matched' => true, 'ambiguous' => false, 'matchConfidence' => 'high', 'candidateCount' => 1, 'matchedSettlementAccount' => $account]];
        $providerItem[$field] = $reference;
        \Illuminate\Support\Facades\Http::fake(['verify.et/api/verify?*' => \Illuminate\Support\Facades\Http::response(['requestId' => 'synthetic-request', 'verification' => ['processingStatus' => 'completed'], 'data' => [$providerItem]], 200)]);
        $transport = \Mockery::mock(\App\Payments\VerifyEt\VerifyEtHttp::class);
        $transport->shouldReceive('factory')->andReturn(\Illuminate\Support\Facades\Http::getFacadeRoot());
        app()->instance(\App\Payments\VerifyEt\VerifyEtHttp::class, $transport);
        $this->withHeader('X-Order-Access-Token', $checkout->json('access_token'))->postJson($checkout->json('reference_endpoint'), ['reference' => $reference, ...$input])->assertOk()->assertJsonPath('status', 'paid');
        \Illuminate\Support\Facades\Http::assertSent(fn ($request): bool => $request['bank'] === $bank && $request[$field] === $reference && $request['settlementAccount'] === $account && ($bank !== 'boa' || $request['accountSuffix'] === '01234') && ($bank !== 'cbe' || $request['accountSuffix'] === '01234567'));
    }

    public function testCompletedStatusResultCanFulfillWithCompleteEvidence(): void
    {
        Queue::fake();
        [$order, $verification] = $this->orderAndVerification();
        $item = $this->matchedResult($verification)['data'][0];
        $result = ['requestId' => 'req_status', '_http_status' => 200, 'data' => ['processingStatus' => 'completed', 'status' => 'success', 'verified' => true, 'result' => $item]];
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertSame('paid', $order->fresh()->status);
    }

    public function testQueuedVerificationReconcilesNestedResultWithoutResubmitting(): void
    {
        Queue::fake();
        [$order, $verification] = $this->orderAndVerification();
        $gateway = app(VerifyEtGateway::class);
        $this->assertSame('verifying', $gateway->processResult($verification, ['_http_status' => 202, 'requestId' => 'req_reconcile', 'data' => [], 'verification' => ['processingStatus' => 'queued']]));
        $this->assertNotSame('paid', $order->fresh()->status);
        $item = $this->matchedResult($verification)['data'][0];
        config()->set('services.verify_et.api_key', 'synthetic-test-key');
        \Illuminate\Support\Facades\Http::preventStrayRequests();
        \Illuminate\Support\Facades\Http::fake(['verify.et/api/verify/req_reconcile' => \Illuminate\Support\Facades\Http::response(['success' => true, 'data' => ['requestId' => 'req_reconcile', 'processingStatus' => 'completed', 'status' => 'success', 'verified' => true, 'result' => $item]], 200)]);
        $transport = \Mockery::mock(\App\Payments\VerifyEt\VerifyEtHttp::class);
        $transport->shouldReceive('factory')->andReturn(\Illuminate\Support\Facades\Http::getFacadeRoot());
        app()->instance(\App\Payments\VerifyEt\VerifyEtHttp::class, $transport);
        $this->assertSame('success', $gateway->reconcile($verification->fresh()));
        $this->assertSame('paid', $order->fresh()->status);
        $this->assertSame('success', $gateway->reconcile($verification->fresh()));
        $this->assertSame(0, CommissionAccrual::query()->where('storefront_order_id', $order->id)->count());
        $this->assertSame(1, app(\App\Storefront\Services\CreatorVerificationAllowance::class)->usage($order->creator)['consumed']);
        \Illuminate\Support\Facades\Http::assertSentCount(1);
    }

    public function testMultipleRecipientCandidatesCannotFulfill(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $result = $this->matchedResult($verification);
        $result['data'][0]['settlementAccountMatch']['candidateCount'] = 2;
        $this->assertNotSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertNotSame('paid', $order->fresh()->status);
    }

    public function testMaskedMatchedAccountCannotStandInForTheSelectedAccount(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $order->fresh()->update(['payment_account_snapshot' => '100016789']);
        $verification->update(['settlement_account' => '100016789']);
        $result = $this->matchedResult($verification);
        $result['data'][0]['settlementAccountMatch']['matchedSettlementAccount'] = '10001****6789';
        $this->assertSame('mismatch', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertNotSame('paid', $order->fresh()->status);
    }

    public function testIncorrectOrIncompleteProviderEvidenceNeverFulfills(): void
    {
        Queue::fake();
        foreach (['amount', 'currency', 'missing_match', 'ambiguous_match'] as $scenario) {
            [$order, $verification] = $this->orderAndVerification();
            $result = $this->matchedResult($verification);
            match ($scenario) {
                'amount' => $result['data'][0]['amount'] = '100.01',
                'currency' => $result['data'][0]['currency'] = 'USD',
                'missing_match' => $result['data'][0]['settlementAccountMatch'] = null,
                'ambiguous_match' => $result['data'][0]['settlementAccountMatch']['ambiguous'] = true,
            };

            $this->assertSame(in_array($scenario, ['missing_match', 'ambiguous_match'], true) ? 'manual_review' : 'mismatch', app(VerifyEtGateway::class)->processResult($verification, $result), $scenario);
            $this->assertSame(in_array($scenario, ['missing_match', 'ambiguous_match'], true) ? 'manual_review' : 'failed_verification', $order->fresh()->status, $scenario);
            $this->assertSame(0, $order->entitlements()->count(), $scenario);
        }
    }

    public function testQueuedVerificationCannotFulfillEvenIfAnItemIsIncluded(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $result = $this->matchedResult($verification);
        $result['_http_status'] = 202;
        $result['verification']['processingStatus'] = 'running';

        $this->assertSame('verifying', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertSame('pending_payment', $order->fresh()->status);
        $this->assertSame(0, CommissionAccrual::query()->where('storefront_order_id', $order->id)->count());
    }

    public function testQueuedResponseWithoutRequestIdRequiresReview(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $result = ['_http_status' => 202, 'data' => [], 'verification' => ['processingStatus' => 'queued']];
        $this->assertSame('manual_review', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertSame('manual_review', $order->fresh()->status);
    }

    public function testAuthenticatedCompleteWebhookIsEncryptedAndFulfillsTheCorrelatedOrder(): void
    {
        Queue::fake();
        [$order, $verification] = $this->orderAndVerification();
        $verification->update(['provider_request_id' => 'req_complete']);
        config()->set('services.verify_et.webhook_secret', 'whsec_synthetic');
        $eventId = (string) Str::uuid();
        $item = $this->matchedResult($verification)['data'][0];
        $item['processingStatus'] = 'completed';
        $body = json_encode(['id' => $eventId, 'event' => 'verification.completed', 'requestId' => 'req_complete', 'data' => $item], JSON_THROW_ON_ERROR);
        $timestamp = now()->toIso8601String();
        $this->call('POST', '/billing/verify-et/webhook', [], [], [], [
            'HTTP_X_WEBHOOK_TIMESTAMP' => $timestamp,
            'HTTP_X_WEBHOOK_EVENT_ID' => $eventId,
            'HTTP_X_WEBHOOK_SIGNATURE' => 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, 'whsec_synthetic'),
        ], $body)->assertNoContent();

        $delivery = VerifyEtWebhookDelivery::query()->where('event_id', $eventId)->firstOrFail();
        $stored = DB::table('verify_et_webhook_deliveries')->where('id', $delivery->id)->value('payload');
        $this->assertStringNotContainsString('1000123456789', $stored);
        $this->assertArrayNotHasKey('payload', $delivery->toArray());
        $job = new ProcessVerifyEtWebhook($delivery->id);
        $this->assertStringNotContainsString('1000123456789', serialize($job));
        $job->handle();

        $this->assertSame('success', $verification->fresh()->status);
        $this->assertSame('paid', $order->fresh()->status);
    }

    public function testDocumentedWebhookWithoutRecipientEvidenceRequiresReview(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $verification->update(['provider_request_id' => 'req_incomplete']);
        $item = $this->matchedResult($verification)['data'][0];
        unset($item['settlementAccountMatch']);
        $item['processingStatus'] = 'completed';
        $result = ['event' => 'verification.completed', 'requestId' => 'req_incomplete', 'data' => $item];

        $this->assertSame('manual_review', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertNotSame('paid', $order->fresh()->status);
    }

    public function testPendingSubmissionThenCompleteWebhookUsesTheSameRequest(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $queued = ['_http_status' => 202, 'requestId' => 'req_pending', 'data' => [], 'verification' => ['processingStatus' => 'queued']];
        $this->assertSame('verifying', app(VerifyEtGateway::class)->processResult($verification, $queued));
        $this->assertSame('req_pending', $verification->fresh()->provider_request_id);
        $item = $this->matchedResult($verification)['data'][0];
        $item['processingStatus'] = 'completed';
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, [
            'event' => 'verification.completed', 'requestId' => 'req_pending', 'data' => $item,
        ]));
        $this->assertSame('paid', $order->fresh()->status);
    }

    public function testWebhookForAnotherRequestCannotFulfillAnOrder(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $verification->update(['provider_request_id' => 'req_expected']);
        $item = $this->matchedResult($verification)['data'][0];
        $item['processingStatus'] = 'completed';
        $this->assertSame('manual_review', app(VerifyEtGateway::class)->processResult($verification, [
            'event' => 'verification.completed', 'requestId' => 'req_other', 'data' => $item,
        ]));
        $this->assertNotSame('paid', $order->fresh()->status);
    }

    public function testVerificationSerializationDoesNotExposeProviderEvidence(): void
    {
        [, $verification] = $this->orderAndVerification();
        $verification->update(['provider_result' => ['matchedSettlementAccount' => '1000123456789'], 'provider_input' => ['phone' => '0912345678']]);
        $json = json_encode($verification->fresh(), JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString('1000123456789', $json);
        $this->assertStringNotContainsString('0912345678', $json);
        $this->assertStringNotContainsString($verification->reference, $json);
        $raw = DB::table('direct_payment_verifications')->where('id', $verification->id)->first(['provider_input', 'provider_result']);
        $this->assertStringNotContainsString('0912345678', $raw->provider_input);
        $this->assertStringNotContainsString('1000123456789', $raw->provider_result);
        $this->assertSame('0912345678', $verification->fresh()->provider_input['phone']);
        $this->assertSame('1000123456789', $verification->fresh()->provider_result['matchedSettlementAccount']);
    }

    public function testLegacyProviderInputAndResultsAreEncryptedByThePreparedMigration(): void
    {
        [, $verification] = $this->orderAndVerification();
        DB::table('direct_payment_verifications')->where('id', $verification->id)->update([
            'provider_input' => json_encode(['phoneNumber' => '0912345678'], JSON_THROW_ON_ERROR),
            'provider_result' => json_encode(['matchedSettlementAccount' => '1000123456789'], JSON_THROW_ON_ERROR),
        ]);
        $migration = require database_path('migrations/2026_10_28_050549_encrypt_existing_verify_et_webhook_payloads.php');
        $migration->up();

        $raw = DB::table('direct_payment_verifications')->where('id', $verification->id)->first(['provider_input', 'provider_result']);
        $this->assertStringNotContainsString('0912345678', $raw->provider_input);
        $this->assertStringNotContainsString('1000123456789', $raw->provider_result);
        $this->assertSame('0912345678', $verification->fresh()->provider_input['phoneNumber']);
        $this->assertSame('1000123456789', $verification->fresh()->provider_result['matchedSettlementAccount']);
    }

    public function testConfirmedBeforeWithoutAnExistingClaimRequiresReview(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $result = $this->matchedResult($verification);
        $result['data'][0]['confirmationHistory'] = ['scope' => 'platform', 'confirmedBefore' => true, 'isFirstConfirmation' => false, 'confirmationCount' => 2];
        $this->assertSame('manual_review', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertNotSame('paid', $order->fresh()->status);
    }

    public function testCompletedAttemptCanBeRetriedAfterProviderReportsPriorConfirmation(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $result = $this->matchedResult($verification);
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $result['data'][0]['confirmationHistory'] = ['confirmedBefore' => true, 'isFirstConfirmation' => false, 'confirmationCount' => 2];
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertSame('paid', $order->fresh()->status);
        $this->assertSame(1, $order->entitlements()->count());
    }

    public function testPriorConfirmationCanProceedForTheSameLocallyClaimedAttempt(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $verification->update(['canonical_transaction_identity' => strtoupper($verification->reference), 'status' => 'verifying']);
        $result = $this->matchedResult($verification);
        $result['data'][0]['confirmationHistory'] = ['scope' => 'platform', 'confirmedBefore' => true, 'isFirstConfirmation' => false, 'confirmationCount' => 2];
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertSame('paid', $order->fresh()->status);
    }

    public function testTelebirrAndDashenProviderIdentifiersAreAccepted(): void
    {
        foreach (['telebirr' => 'transactionNumber', 'dashen' => 'referenceNumber'] as $bank => $field) {
            [$order, $verification] = $this->orderAndVerification();
            $order->fresh()->update(['payment_provider_snapshot' => $bank]);
            $verification->update(['bank_code' => $bank]);
            $result = $this->matchedResult($verification);
            $item = &$result['data'][0];
            $item['bank'] = $bank;
            unset($item['referenceNumber'], $item['receiptNumber']);
            $item[$field] = $verification->reference;
            $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result), $bank);
            $this->assertSame('paid', $order->fresh()->status, $bank);
        }
    }

    public function testCbeReceiptIdInReferenceNumberIsAccepted(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $verification->update(['reference' => 'syntheticReceiptId123']);
        $result = $this->matchedResult($verification);
        unset($result['data'][0]['receiptNumber']);
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertSame('paid', $order->fresh()->status);
    }

    public function testCbeLegacyFtReferenceWithoutReceiptIdIsFulfilled(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $result = $this->matchedResult($verification);
        unset($result['data'][0]['receiptNumber']);
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertSame('paid', $order->fresh()->status);
    }

    public function testConflictingTelebirrIdentifiersRequireReview(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $order->fresh()->update(['payment_provider_snapshot' => 'telebirr']);
        $verification->update(['bank_code' => 'telebirr']);
        $result = $this->matchedResult($verification);
        $result['data'][0]['bank'] = 'telebirr';
        $result['data'][0]['transactionNumber'] = $verification->reference;
        $result['data'][0]['referenceNumber'] = 'CONFLICTINGREFERENCE';
        $this->assertSame('manual_review', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertNotSame('paid', $order->fresh()->status);
    }

    public function testTelebirrLocalAndInternationalAccountFormsMatch(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $order->fresh()->update(['payment_provider_snapshot' => 'telebirr', 'payment_account_snapshot' => '0961664351']);
        $verification->update(['bank_code' => 'telebirr', 'settlement_account' => '0961664351']);
        $result = $this->matchedResult($verification);
        $result['data'][0]['bank'] = 'telebirr';
        $result['data'][0]['settlementAccountMatch']['matchedSettlementAccount'] = '+251961664351';
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertSame('paid', $order->fresh()->status);
    }

    public function testDashenSettlementKeepsLeadingZeroesAndRequiresTheSelectedAccount(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $order->fresh()->update(['payment_provider_snapshot' => 'dashen', 'payment_account_snapshot' => '0012862182001']);
        $verification->update(['bank_code' => 'dashen', 'settlement_account' => '0012862182001']);
        $result = $this->matchedResult($verification);
        $result['data'][0]['bank'] = 'dashen';
        unset($result['data'][0]['transactionNumber'], $result['data'][0]['receiptNumber']);
        $result['data'][0]['referenceNumber'] = $verification->reference;
        $result['data'][0]['settlementAccountMatch']['matchedSettlementAccount'] = '0012862182001';

        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertSame('0012862182001', $order->fresh()->payment_account_snapshot);
    }

    public function testDeactivatedAccountDoesNotInvalidateAnOrderRecipientSnapshot(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $order->creatorPaymentMethod->update(['is_active' => false]);

        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $this->matchedResult($verification)));
        $this->assertSame('paid', $order->fresh()->status);
    }

    public function testFraudSuspendedAccountCannotSettleAnOrder(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $order->creatorPaymentMethod->update(['is_suspended' => true, 'is_active' => false]);

        $this->assertSame('mismatch', app(VerifyEtGateway::class)->processResult($verification, $this->matchedResult($verification)));
        $this->assertNotSame('paid', $order->fresh()->status);
        $this->assertSame(0, $order->entitlements()->count());
    }

    public function testCanonicalPaymentCannotFulfillASecondOrder(): void
    {
        [$firstOrder, $first] = $this->orderAndVerification();
        [$secondOrder, $second] = $this->orderAndVerification();
        $second->update(['reference' => $first->reference . '-']);
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($first, $this->matchedResult($first)));
        $this->assertSame('mismatch', app(VerifyEtGateway::class)->processResult($second, $this->matchedResult($second)));
        $this->assertSame('paid', $firstOrder->fresh()->status);
        $this->assertNotSame('paid', $secondOrder->fresh()->status);
    }

    public function testCommissionRateIsLockedWhenTheBuyerStartsCheckout(): void
    {
        Queue::fake();
        [$order, $verification] = $this->orderAndVerification();
        $order = $order->fresh();
        $order->update(['monetization_policy' => null, 'commission_bps' => 150]);
        Product::query()->where('free', true)->firstOrFail()->update([
            'storefront_benefits' => ['commission_bps' => 0, 'max_products' => 5],
        ]);

        $this->assertSame(150, $order->commission_bps);
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $this->matchedResult($verification)));
        $this->assertSame(150, CommissionAccrual::query()->where('storefront_order_id', $order->id)->value('fee_cents'));
    }

    public function testStorefrontCheckoutUsesTheSelectedCreatorAccount(): void
    {
        [$existingOrder] = $this->orderAndVerification();
        $secondMethod = CreatorPaymentMethod::query()->create([
            'workspace_id' => $existingOrder->product->workspace_id,
            'user_id' => $existingOrder->creator_id,
            'provider' => 'telebirr',
            'account_number' => '0912345678',
            'account_fingerprint' => hash('sha256', 'second-account-' . Str::uuid()),
            'account_name_raw' => 'Abebe Kebede Wolde',
            'account_name_normalized' => 'abebe kebede wolde',
            'status' => 'approved',
            'provider_registration_status' => 'registered',
            'is_active' => true,
        ]);
        \App\Storefront\Models\DirectPaymentMethod::query()->where('code', 'telebirr')->update([
            'creator_setup_enabled' => true,
            'checkout_enabled' => true,
            'automated_verification_supported' => true,
            'recipient_matching_supported' => true,
            'operationally_suspended' => false,
        ]);

        $public = (new PublicDigitalProductResource($existingOrder->product->fresh()->load('creator')))
            ->toArray(Request::create('/'));
        $this->assertSame('direct', $public['payment_mode']);
        $this->assertCount(2, $public['receiving_accounts']);
        $this->assertEqualsCanonicalizing(
            ['cbe', 'telebirr'],
            $public['receiving_accounts']->pluck('provider')->all(),
        );

        $order = app(StorefrontCheckout::class)->create($existingOrder->product, null, [
            'name' => 'Buyer', 'email' => 'other-buyer@example.test',
        ], $secondMethod->id);

        $this->assertSame($secondMethod->id, $order->creator_payment_method_id);
        $this->assertSame('0912345678', $order->payment_account_snapshot);
    }

    public function testPaymentInstructionsRequireTheOrderTokenAndUseTheEncryptedSnapshot(): void
    {
        [$order] = $this->orderAndVerification();
        $token = $order->paymentAccessToken;
        $endpoint = '/api/v1/public/direct-orders/'.$order->uuid.'/payment-instructions';
        $this->getJson($endpoint)->assertForbidden();
        $this->withHeader('X-Order-Access-Token', 'incorrect')->getJson($endpoint)->assertForbidden();
        $order->creatorPaymentMethod->update(['account_number' => '1000999999999']);
        $this->withHeader('X-Order-Access-Token', $token)->getJson($endpoint)
            ->assertOk()->assertJsonPath('data.account_number', '1000123456789')
            ->assertHeader('Cache-Control', 'no-store, private');
        $this->assertNotSame('1000123456789', $order->getRawOriginal('payment_account_snapshot'));
        $order->creatorPaymentMethod->update(['is_active' => false]);
        $this->getJson($endpoint)->assertNotFound();
    }

    public function testPaymentInstructionsRejectExpiredAndOtherOrderTokens(): void
    {
        [$order] = $this->orderAndVerification();
        [$other] = $this->orderAndVerification();
        $endpoint = '/api/v1/public/direct-orders/'.$order->uuid.'/payment-instructions';
        $this->withHeader('X-Order-Access-Token', $other->paymentAccessToken)->getJson($endpoint)->assertForbidden();
        $order->fresh()->update(['payment_expires_at' => now()->subMinute()]);
        $this->withHeader('X-Order-Access-Token', $order->paymentAccessToken)->getJson($endpoint)->assertNotFound();
    }

    public function testBuyerCanRecheckExistingPendingVerificationWithoutSubmittingAnotherRequest(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $accessToken = $order->paymentAccessToken;
        $order->offsetUnset('paymentAccessToken');
        $verification->update(['status' => 'verifying', 'provider_request_id' => 'buyer-recheck-request']);
        $order->update(['status' => 'verifying']);
        config()->set('services.verify_et.api_key', 'synthetic-test-key');
        \Illuminate\Support\Facades\Http::preventStrayRequests();
        \Illuminate\Support\Facades\Http::fake([
            'verify.et/api/verify/buyer-recheck-request' => \Illuminate\Support\Facades\Http::response([
                'success' => true,
                'requestId' => 'buyer-recheck-request',
                'verification' => ['processingStatus' => 'queued'],
                'data' => [],
            ], 202),
        ]);
        $transport = \Mockery::mock(\App\Payments\VerifyEt\VerifyEtHttp::class);
        $transport->shouldReceive('factory')->andReturn(\Illuminate\Support\Facades\Http::getFacadeRoot());
        app()->instance(\App\Payments\VerifyEt\VerifyEtHttp::class, $transport);

        $endpoint = '/api/v1/public/direct-orders/'.$order->uuid;
        $this->withHeader('X-Order-Access-Token', $accessToken)
            ->postJson($endpoint.'/recheck')->assertOk()->assertJsonPath('status', 'verifying');
        \Illuminate\Support\Facades\Http::assertSentCount(1);
        \Illuminate\Support\Facades\Http::assertSent(fn ($request): bool => str_contains($request->url(), '/api/verify/buyer-recheck-request'));
    }

    public function testBuyerRecheckCannotSubmitOrRecheckWithoutAnExistingProviderRequest(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $accessToken = $order->paymentAccessToken;
        $order->offsetUnset('paymentAccessToken');
        $verification->update(['status' => 'pending', 'provider_request_id' => null]);
        $order->update(['status' => 'verifying']);

        $this->withHeader('X-Order-Access-Token', $accessToken)
            ->postJson('/api/v1/public/direct-orders/'.$order->uuid.'/recheck')
            ->assertOk()->assertJsonPath('status', 'verifying');
        $this->assertNull($verification->fresh()->provider_request_id);
    }

    public function testTenVerifiedSalesConsumeLifetimeAllowanceAndEleventhCheckoutIsBlocked(): void
    {
        Queue::fake();
        [$first, $firstVerification] = $this->orderAndVerification();
        $allowance = app(\App\Storefront\Services\CreatorVerificationAllowance::class);
        $this->assertSame(1, $allowance->usage($first->creator)['reserved']);
        for ($i = 0; $i < 10; $i++) {
            $order = $i === 0 ? $first : app(DirectStorefrontCheckout::class)->create($first->product, null, ['email' => 'buyer@example.test']);
            $verification = $i === 0 ? $firstVerification : DirectPaymentVerification::query()->create([
                'reference' => 'SYNTHETIC'.Str::upper(Str::random(18)), 'payable_type' => $order::class, 'payable_id' => $order->id,
                'bank_code' => 'cbe', 'settlement_account' => $order->payment_account_snapshot, 'amount_cents' => 10000, 'currency' => 'ETB',
            ]);
            $result = $this->matchedResult($verification);
            $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
            $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
            $this->assertSame(0, $order->fresh()->platform_fee_cents);
            $this->assertSame(0, CommissionAccrual::query()->where('storefront_order_id', $order->id)->count());
        }
        $this->assertSame(['consumed' => 10, 'reserved' => 0, 'remaining' => 0], $allowance->usage($first->creator));
        $this->withSession(['_token' => 'test-token'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'test-token')->actingAs($first->creator);
        $this->postJson('/api/v1/storefront/products/'.$first->digital_product_id.'/checkout', ['buyer_name' => 'Buyer', 'buyer_email' => 'buyer@example.test', 'creator_payment_method_id' => $first->creator_payment_method_id])->assertUnprocessable();
    }

    public function testPendingAndRejectedEvidenceNeverConsumesAnAllowance(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $gateway = app(VerifyEtGateway::class);
        $this->assertSame('verifying', $gateway->processResult($verification, ['_http_status' => 202, 'requestId' => 'pending-quota', 'verification' => ['processingStatus' => 'queued']]));
        $this->assertSame(['consumed' => 0, 'reserved' => 1, 'remaining' => 9], app(\App\Storefront\Services\CreatorVerificationAllowance::class)->usage($order->creator));
        $result = $this->matchedResult($verification);
        $result['requestId'] = 'pending-quota';
        $result['data'][0]['amount'] = 99;
        $this->assertSame('mismatch', $gateway->processResult($verification, $result));
        $this->assertSame(0, app(\App\Storefront\Services\CreatorVerificationAllowance::class)->usage($order->creator)['consumed']);
    }

    public function testAbandonedReservationIsReleasedButLateValidPaymentIsNotLost(): void
    {
        Queue::fake();
        [$order, $verification] = $this->orderAndVerification();
        $verification->delete();
        $order->fresh()->update(['payment_expires_at' => now()->subMinute()]);
        $allowance = app(\App\Storefront\Services\CreatorVerificationAllowance::class);
        $allowance->expireAbandoned();
        $this->assertSame('expired', $order->fresh()->status);
        $this->assertSame(10, $allowance->usage($order->creator)['remaining']);
        $verification = DirectPaymentVerification::query()->create([
            'reference' => 'LATE'.Str::upper(Str::random(18)), 'payable_type' => $order::class, 'payable_id' => $order->id,
            'bank_code' => 'cbe', 'settlement_account' => $order->payment_account_snapshot, 'amount_cents' => 10000, 'currency' => 'ETB',
        ]);
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $this->matchedResult($verification)));
        $this->assertSame('paid', $order->fresh()->status);
        $this->assertSame(1, $allowance->usage($order->creator)['consumed']);
        $this->assertNotNull(DB::table('creator_verification_allowances')->where('storefront_order_id', $order->id)->value('released_at'));
    }

    public function testProBypassesQuotaAndExpiryPreservesConsumedFreeSales(): void
    {
        Queue::fake();
        settings()->save(['billing.enable' => true]);
        [$order, $verification] = $this->orderAndVerification();
        $gateway = app(VerifyEtGateway::class);
        $gateway->processResult($verification, $this->matchedResult($verification));
        $creator = $order->creator;
        $plan = Product::query()->create(['name' => 'Pro', 'uuid' => (string) Str::uuid(), 'free' => false, 'is_default' => false]);
        $price = \Common\Billing\Models\Price::query()->create(['product_id' => $plan->id, 'currency' => 'ETB', 'amount' => 500, 'interval' => 'month', 'interval_count' => 1]);
        $subscription = \Common\Billing\Subscription::query()->create(['user_id' => $creator->id, 'product_id' => $plan->id, 'price_id' => $price->id, 'gateway_name' => 'verify_et', 'gateway_status' => 'active', 'renews_at' => now()->addMonth()]);
        $allowance = app(\App\Storefront\Services\CreatorVerificationAllowance::class);
        $this->assertTrue($allowance->isPro($creator));
        for ($i = 0; $i < 11; $i++) {
            $proOrder = app(DirectStorefrontCheckout::class)->create($order->product, null, ['email' => 'buyer@example.test']);
            $this->assertSame($allowance::PRO_POLICY, $proOrder->monetization_policy);
        }
        $this->assertSame(['consumed' => 1, 'reserved' => 0, 'remaining' => 9], $allowance->usage($creator));
        $subscription->update(['renews_at' => now()->subDays(8)]);
        app(\App\Payments\Commands\ProcessDirectSubscriptionRenewals::class)->handle();
        $this->assertFalse($allowance->isPro($creator));
        $freeOrder = app(DirectStorefrontCheckout::class)->create($order->product, null, ['email' => 'buyer@example.test']);
        $this->assertSame($allowance::FREE_POLICY, $freeOrder->monetization_policy);
        $this->assertSame(['consumed' => 1, 'reserved' => 1, 'remaining' => 8], $allowance->usage($creator));
    }

    public function testTenPendingCheckoutsReserveCapacityWithoutConsumption(): void
    {
        [$first] = $this->orderAndVerification();
        for ($i = 1; $i < 10; $i++) {
            app(DirectStorefrontCheckout::class)->create($first->product, null, ['email' => 'buyer@example.test']);
        }
        $this->assertSame(['consumed' => 0, 'reserved' => 10, 'remaining' => 0], app(\App\Storefront\Services\CreatorVerificationAllowance::class)->usage($first->creator));
        $count = \App\Storefront\Models\StorefrontOrder::query()->where('creator_id', $first->creator_id)->count();
        try {
            app(DirectStorefrontCheckout::class)->create($first->product, null, ['email' => 'buyer@example.test']);
            $this->fail('An eleventh reservation was accepted.');
        } catch (\Illuminate\Validation\ValidationException) {
            $this->assertSame($count, \App\Storefront\Models\StorefrontOrder::query()->where('creator_id', $first->creator_id)->count());
        }
    }

    public function testBuyerCancellationRequiresOrderTokenAndReleasesOnlyUnsubmittedPayments(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $token = $order->getAttribute('paymentAccessToken');
        $path = '/api/v1/public/direct-orders/'.$order->uuid.'/cancel';
        $this->postJson($path)->assertForbidden();
        $this->withHeader('X-Order-Access-Token', $token)->postJson($path)->assertConflict();
        $verification->delete();
        $this->postJson($path)->assertOk();
        $this->assertSame(10, app(\App\Storefront\Services\CreatorVerificationAllowance::class)->usage($order->creator)['remaining']);
        $this->assertSame('buyer_cancelled_before_reference', DB::table('creator_verification_allowances')->where('storefront_order_id', $order->id)->value('release_reason'));
    }

    public function testFreeProductDoesNotUseVerificationAllowance(): void
    {
        Queue::fake();
        [$seed] = $this->orderAndVerification();
        $seed->product->update(['price_cents' => 0]);
        $order = app(DirectStorefrontCheckout::class)->create($seed->product, null, ['email' => 'buyer@example.test']);
        $this->assertSame('paid', $order->fresh()->status);
        $this->assertFalse(DB::table('creator_verification_allowances')->where('storefront_order_id', $order->id)->exists());
        $this->assertSame(0, CommissionAccrual::query()->where('storefront_order_id', $order->id)->count());
    }

    public function testReceiptUrlIsNormalizedBeforeBankFormatChecks(): void
    {
        $normalized = app(ReceiptReference::class)->prepare(
            'cbe',
            '  https://mbreciept.cbe.com.et/URLTOKEN123456  ',
        );

        $this->assertSame('URLTOKEN123456', $normalized);
    }

    public function testMismatchAttemptIsCountedOnceAndLocksOnTheFifth(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $verification->update(['attempt' => 1, 'status' => 'mismatch']);
        $session = app(StorefrontVerificationSession::class);

        $session->recordMismatch($order, $verification);
        $session->recordMismatch($order->fresh(), $verification->fresh());

        $this->assertSame(1, $order->fresh()->verification_attempts);
        $this->assertSame('failed_verification', $order->fresh()->status);
        $this->assertSame('failed', $order->fresh()->statusLabel());

        $invoiceVerification = $verification->replicate();
        $invoiceVerification->payable_type = \App\Payments\Models\ProSubscriptionPayment::class;
        $session->recordMismatch($order->fresh(), $invoiceVerification);
        $this->assertSame(1, $order->fresh()->verification_attempts);

        for ($attempt = 2; $attempt <= 5; $attempt++) {
            $verification->update(['attempt' => $attempt]);
            $session->recordMismatch($order->fresh(), $verification->fresh());
        }

        $locked = $order->fresh();
        $this->assertSame(5, $locked->verification_attempts);
        $this->assertSame('expired', $locked->status);
        $this->assertSame('cancelled', $locked->statusLabel());
        $this->assertSame(0, $locked->attemptsRemaining());
    }

    public function testReconcileExpiresAbandonedVerifyingOrders(): void
    {
        [$order] = $this->orderAndVerification();
        $order->offsetUnset('paymentAccessToken');
        $order->update(['status' => 'verifying', 'payment_expires_at' => now()->subMinute()]);

        $this->artisan('billing:reconcile-pending-verifications')->assertSuccessful();

        $this->assertSame('expired', $order->fresh()->status);
    }

    public function testRecipientAccountNumberCannotBeSubmittedAsAReceiptReference(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $verification->delete();
        $token = $order->getAttribute('paymentAccessToken');

        $this->withHeader('X-Order-Access-Token', $token)
            ->postJson('/api/v1/public/direct-orders/'.$order->uuid.'/reference', [
                'reference' => $order->payment_account_snapshot,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reference');

        $order->refresh();
        $this->assertSame('pending_payment', $order->status);
        $this->assertSame(0, $order->verification_attempts);
        $this->assertFalse($order->directPaymentVerifications()->exists());
    }

    public function testBuyerCanSelectAnotherActiveReceivingAccountUntilPaymentCompletes(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $verification->delete();
        $token = $order->getAttribute('paymentAccessToken');
        $order->offsetUnset('paymentAccessToken');
        $other = \App\Storefront\Models\CreatorPaymentMethod::query()->create([
            'workspace_id' => $order->product->workspace_id,
            'user_id' => $order->creator_id,
            'provider' => 'telebirr',
            'account_number' => '0912345678',
            'account_fingerprint' => hash('sha256', 'telebirr-'.$order->id),
            'account_name_raw' => 'Abebe Kebede Wolde',
            'account_name_normalized' => 'abebe kebede wolde',
            'status' => 'approved',
            'provider_registration_status' => 'registered',
            'is_active' => true,
        ]);

        $this->withHeader('X-Order-Access-Token', $token)
            ->postJson('/api/v1/public/direct-orders/'.$order->uuid.'/select-account', ['receiving_account_id' => $other->id])
            ->assertOk()
            ->assertJsonPath('data.receiving_account_id', $other->id)
            ->assertJsonPath('data.status_label', 'pending');

        $order->refresh();
        $this->assertSame($other->id, $order->creator_payment_method_id);
        $this->assertSame('telebirr', $order->payment_provider_snapshot);
        $this->assertSame('0912345678', $order->payment_account_snapshot);
        $this->assertSame('Abebe Kebede Wolde', $order->payment_account_name_snapshot);

        $verification = DirectPaymentVerification::query()->create([
            'reference' => 'FT26' . Str::upper(Str::random(14)),
            'payable_type' => $order::class,
            'payable_id' => $order->id,
            'bank_code' => 'telebirr',
            'settlement_account' => '0912345678',
            'amount_cents' => 10000,
            'currency' => 'ETB',
            'status' => 'verifying',
        ]);

        $this->withHeader('X-Order-Access-Token', $token)
            ->postJson('/api/v1/public/direct-orders/'.$order->uuid.'/select-account', ['receiving_account_id' => $order->creator_payment_method_id])
            ->assertConflict();

        $order->update(['status' => 'paid']);
        $this->withHeader('X-Order-Access-Token', $token)
            ->postJson('/api/v1/public/direct-orders/'.$order->uuid.'/select-account', ['receiving_account_id' => $order->creator_payment_method_id])
            ->assertConflict();
    }

    public function testPaidSettlementShowsDeliveringUntilTheDeliveryJobFinishes(): void
    {
        Mail::fake();
        Queue::fake();
        \App\Storefront\Services\DirectStorefrontFulfillment::$runDeliveryInlineInTests = false;
        try {
        [$order, $verification] = $this->orderAndVerification();
        $token = $order->getAttribute('paymentAccessToken');

        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $this->matchedResult($verification)));

        $order->refresh();
        $this->assertSame('paid', $order->status);
        $this->assertSame('completed', $order->statusLabel());
        $this->assertSame('delivering', $order->delivery_status, (string) $order->delivery_error);
        $this->assertSame(0, $order->entitlements()->count());

        (new DeliverStorefrontOrder($order->id))->handle();

        $order->refresh();
        $this->assertSame('delivered', $order->delivery_status);
        $shown = $this->withHeader('X-Order-Access-Token', $token)
            ->getJson('/api/v1/public/direct-orders/'.$order->uuid)
            ->assertOk()
            ->assertJsonPath('data.status_label', 'completed')
            ->assertJsonPath('data.delivery_status', 'delivered');
        $this->assertStringContainsString('signature=', (string) $shown->json('data.downloads.0.url'));
        } finally {
            \App\Storefront\Services\DirectStorefrontFulfillment::$runDeliveryInlineInTests = true;
        }
    }

    public function testDeliveryFailureLeavesTheOrderPaid(): void
    {
        [$order] = $this->orderAndVerification();
        $order->offsetUnset('paymentAccessToken');
        $order->update([
            'status' => 'paid',
            'paid_at' => now(),
            'delivery_status' => 'delivering',
        ]);
        DownloadEntitlement::creating(function (): void {
            throw new \RuntimeException('delivery broke');
        });

        try {
            (new DeliverStorefrontOrder($order->id))->handle();
        } finally {
            DownloadEntitlement::flushEventListeners();
        }

        $order->refresh();
        $this->assertSame('paid', $order->status);
        $this->assertSame('failed', $order->delivery_status);
        $this->assertSame('delivery broke', $order->delivery_error);
    }

    public function testFalseReceiptReferenceReturnsMismatchAndDecrementsAttempts(): void
    {
        Notification::fake();
        $shapes = [
            'provider_not_found' => [
                'success' => false,
                'requestId' => 'req_missing',
                '_http_status' => 200,
                'error' => ['code' => 'not_found', 'retryable' => false],
                'data' => [],
            ],
            'status_not_found' => [
                'requestId' => 'req_status_missing',
                '_http_status' => 200,
                'verification' => ['processingStatus' => 'completed', 'status' => 'not_found'],
                'data' => [],
            ],
            'verification_not_successful' => [
                'requestId' => 'req_unsuccessful',
                '_http_status' => 200,
                'verification' => ['processingStatus' => 'completed', 'status' => 'failed'],
                'data' => [[
                    'bank' => 'cbe',
                    'status' => 'failed',
                    'verified' => false,
                    'amount' => 100,
                    'currency' => 'ETB',
                    'settlementAccountMatch' => [
                        'matched' => false,
                        'ambiguous' => false,
                        'reason' => 'verification_not_successful',
                    ],
                ]],
            ],
        ];

        foreach ($shapes as $name => $result) {
            [$order, $verification] = $this->orderAndVerification();
            $this->assertSame('mismatch', app(VerifyEtGateway::class)->processResult($verification, $result), $name);
            $order->refresh();
            $this->assertSame('failed_verification', $order->status, $name);
            $this->assertSame(1, $order->verification_attempts, $name);
            $this->assertSame('mismatch', $verification->fresh()->status, $name);
            $this->assertNotSame('manual_review', $order->status, $name);
        }

        [$order, $verification] = $this->orderAndVerification();
        $this->fakeProviderHttp(404, ['success' => false, 'error' => ['code' => 'not_found']]);

        $this->assertSame('mismatch', app(VerifyEtGateway::class)->submit($verification));
        $this->assertSame('failed_verification', $order->fresh()->status);
        $this->assertSame(1, $order->fresh()->verification_attempts);
        Notification::assertNotSentTo($order->creator, PaymentReviewNeededNotification::class);
    }

    public function testCandidateAccountMismatchReturnsMismatchWithoutManualReview(): void
    {
        Notification::fake();
        [$order, $verification] = $this->orderAndVerification();
        $result = $this->matchedResult($verification);
        $result['data'][0]['settlementAccountMatch'] = [
            'matched' => false,
            'ambiguous' => false,
            'candidateCount' => 0,
            'reason' => 'candidate_account_mismatch',
        ];

        $this->assertSame('mismatch', app(VerifyEtGateway::class)->processResult($verification, $result));
        $order->refresh();
        $this->assertSame('failed_verification', $order->status);
        $this->assertSame(1, $order->verification_attempts);
        $this->assertSame('candidate_account_mismatch', $verification->fresh()->latest_error_code);
        Notification::assertNotSentTo($order->creator, PaymentReviewNeededNotification::class);
    }

    public function testRateLimitedRequestStaysVerifyingWithoutDecrementingAttempts(): void
    {
        Notification::fake();
        [$order, $verification] = $this->orderAndVerification();
        $this->fakeProviderHttp(429, ['error' => ['code' => 'upstream_rate_limited']]);

        $this->assertSame('verifying', app(VerifyEtGateway::class)->submit($verification));
        $order->refresh();
        $verification->refresh();
        $this->assertSame('verifying', $verification->status);
        $this->assertSame('pending_payment', $order->status);
        $this->assertSame(0, (int) $order->verification_attempts);
        Notification::assertNotSentTo($order->creator, PaymentReviewNeededNotification::class);
    }

    public function testAmbiguousSettlementMatchHoldsForManualReview(): void
    {
        [$order, $verification] = $this->orderAndVerification();
        $result = $this->matchedResult($verification);
        $result['data'][0]['settlementAccountMatch'] = [
            'matched' => false,
            'ambiguous' => true,
            'candidateCount' => 2,
            'reason' => 'ambiguous_registered_accounts',
        ];

        $this->assertSame('manual_review', app(VerifyEtGateway::class)->processResult($verification, $result));
        $order->refresh();
        $this->assertSame('manual_review', $order->status);
        $this->assertSame(0, (int) $order->verification_attempts);
        $this->assertSame('manual_review', $verification->fresh()->status);
    }

    public function testManualReviewRejectsAnotherReference(): void
    {
        [$order] = $this->orderAndVerification();
        $token = $order->getAttribute('paymentAccessToken');
        $order->offsetUnset('paymentAccessToken');
        $order->update(['status' => 'manual_review']);

        $this->withHeader('X-Order-Access-Token', $token)
            ->postJson('/api/v1/public/direct-orders/'.$order->uuid.'/reference', ['reference' => 'URLTOKEN123456'])
            ->assertConflict();
    }

    /**
     * @param array<string, mixed> $body
     */
    private function fakeProviderHttp(int $status, array $body): void
    {
        config()->set('services.verify_et.api_key', 'synthetic-test-key');
        \Illuminate\Support\Facades\Http::preventStrayRequests();
        \Illuminate\Support\Facades\Http::fake([
            'verify.et/*' => \Illuminate\Support\Facades\Http::response($body, $status, ['Retry-After' => '0']),
        ]);
        $transport = \Mockery::mock(\App\Payments\VerifyEt\VerifyEtHttp::class);
        $transport->shouldReceive('factory')->andReturn(\Illuminate\Support\Facades\Http::getFacadeRoot());
        app()->instance(\App\Payments\VerifyEt\VerifyEtHttp::class, $transport);
    }

    private function orderAndVerification(): array
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
            'name' => 'guide.pdf', 'file_name' => Str::random(20),
            'file_size' => 1024, 'mime' => 'application/pdf',
            'extension' => 'pdf', 'type' => 'file',
            'workspace_id' => $workspace->id, 'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);
        CreatorPaymentMethod::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'provider' => 'cbe',
            'account_number' => '1000123456789',
            'account_fingerprint' => hash('sha256', 'test-account-' . $creator->id),
            'account_name_raw' => 'Abebe Kebede Wolde',
            'account_name_normalized' => 'abebe kebede wolde',
            'status' => 'approved',
            'provider_registration_status' => 'registered',
            'is_active' => true,
        ]);
        $order = app(DirectStorefrontCheckout::class)->create($product->load('creator'), null, [
            'name' => 'Buyer', 'email' => 'buyer@example.test',
        ]);
        $verification = DirectPaymentVerification::query()->create([
            'reference' => 'FT26' . Str::upper(Str::random(14)),
            'payable_type' => $order::class,
            'payable_id' => $order->id,
            'bank_code' => 'cbe',
            'settlement_account' => '1000123456789',
            'amount_cents' => 10000,
            'currency' => 'ETB',
        ]);

        return [$order, $verification];
    }

    private function matchedResult(DirectPaymentVerification $verification): array
    {
        return [
            'requestId' => 'req_' . Str::lower(Str::random(12)),
            'verification' => ['processingStatus' => 'completed', 'status' => 'success', 'verified' => true],
            'data' => [[
                'bank' => 'cbe',
                'status' => 'success',
                'verified' => true,
                'amount' => 100,
                'currency' => 'ETB',
                'referenceNumber' => $verification->reference,
                'receiptNumber' => $verification->reference,
                'settlementAccountMatch' => [
                    'matched' => true,
                    'ambiguous' => false,
                    'matchConfidence' => 'high',
                    'candidateCount' => 1,
                    'matchedSettlementAccount' => '1000123456789',
                ],
            ]],
        ];
    }
}
