<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\ChapaGateway;
use App\Payments\Models\PaymentTransaction;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\StorefrontBenefits;
use App\Storefront\StorefrontCheckout;
use Common\Billing\Models\Product;
use Common\Files\FileEntry;
use Common\Permissions\Models\Permission;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class EntitlementSystemTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('storefront.currency', 'ETB');
        config()->set('storefront.payout_hold_days', 0);
        settings()->save(['billing.enable' => true]);

        if (!Product::where('is_default', true)->exists()) {
            $existing = Product::where('free', true)->first();
            if ($existing) {
                $existing->update(['is_default' => true]);
            } else {
                Product::create([
                    'name' => 'Free',
                    'uuid' => Str::uuid(),
                    'free' => true,
                    'is_default' => true,
                    'position' => 1,
                    'storefront_benefits' => config('storefront.default_benefits'),
                ]);
            }
        }
    }

    public function testStorefrontBenefitsReturnsAllEntitlementKeys(): void
    {
        $creator = $this->createCreator();
        $benefits = app(StorefrontBenefits::class)->forCreator($creator);

        $this->assertArrayHasKey('platform_fee_percent', $benefits);
        $this->assertArrayHasKey('commission_bps', $benefits);
        $this->assertArrayHasKey('max_products', $benefits);
        $this->assertArrayHasKey('max_free_products', $benefits);
        $this->assertArrayHasKey('max_paid_products', $benefits);
        $this->assertArrayHasKey('max_upload_bytes', $benefits);
        $this->assertArrayHasKey('max_storefronts', $benefits);
        $this->assertArrayHasKey('max_workspaces', $benefits);
        $this->assertArrayHasKey('tracking_pixels_enabled', $benefits);
        $this->assertArrayHasKey('advanced_analytics_enabled', $benefits);
    }

    public function testDefaultPlanIsResolvedWhenNoSubscription(): void
    {
        $creator = $this->createCreator();

        $plan = $creator->getSubscriptionProduct();

        $this->assertNotNull($plan);
        $this->assertTrue($plan->free || $plan->is_default);
    }

    public function testPaidProductLimitEnforcedViaHttp(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();

        $plan = $creator->getSubscriptionProduct();
        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'max_paid_products' => 1,
            'platform_fee_percent' => 5.0,
        ])]);

        DigitalProduct::query()->create([
            'uuid' => Str::uuid(),
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Existing Paid Product',
            'price_cents' => 500,
            'currency' => 'ETB',
            'status' => 'draft',
        ]);

        $file = FileEntry::query()->create([
            'name' => 'test.pdf',
            'file_name' => 'test.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);

        $response = $this->stateful()->actingAs($creator)
            ->post('/api/v1/digital-products', [
                'title' => 'Over Limit Product',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ]);

        $response->assertStatus(422);
    }

    public function testProductUpdateReChecksPaidLimitWhenPriceChanges(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();

        $plan = $creator->getSubscriptionProduct();
        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'max_free_products' => 1,
            'max_paid_products' => 1,
        ])]);
        $creator->refresh();

        $file = FileEntry::query()->create([
            'name' => 'test.pdf',
            'file_name' => 'test.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);

        DigitalProduct::query()->create([
            'uuid' => Str::uuid(),
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Existing Paid',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'draft',
        ]);
        $freeProduct = DigitalProduct::query()->create([
            'uuid' => Str::uuid(),
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Existing Free',
            'price_cents' => 0,
            'currency' => 'ETB',
            'status' => 'draft',
        ]);

        $response = $this->stateful()->actingAs($creator)
            ->put("/api/v1/digital-products/{$freeProduct->id}", [
                'title' => 'Existing Free',
                'price_cents' => 1500,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ]);

        $response->assertStatus(422);

        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'max_paid_products' => 2,
        ])]);
        $creator->refresh();

        $response = $this->stateful()->actingAs($creator)
            ->put("/api/v1/digital-products/{$freeProduct->id}", [
                'title' => 'Existing Free',
                'price_cents' => 1500,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ]);

        $response->assertStatus(200);
    }

    public function testStorefrontLimitEnforcedOnBiolinkCreationViaHttp(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();

        $plan = $creator->getSubscriptionProduct();
        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'max_storefronts' => 1,
        ])]);
        $creator->refresh();

        \App\Biolinks\Models\Biolink::query()->create([
            'back_half' => Str::random(5),
            'name' => 'First Storefront',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);

        $response = $this->stateful()->actingAs($creator)
            ->post('/api/v1/biolinks', [
                'name' => 'Second Storefront',
            ]);

        $response->assertStatus(422);
    }

    public function testTrackingPixelsBlockedWhenDisabled(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();

        $plan = $creator->getSubscriptionProduct();
        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'tracking_pixels_enabled' => false,
        ])]);
        $creator->refresh();

        $response = $this->stateful()->actingAs($creator)
            ->post('/api/v1/tp', [
                'name' => 'Test Pixel',
                'type' => 'facebook',
                'pixel_id' => '123456',
            ]);

        $response->assertStatus(403);
    }

    public function testPlatformFeePercentSnapshotOnOrder(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();

        $plan = $creator->getSubscriptionProduct();
        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'platform_fee_percent' => 5.0,
            'commission_bps' => 500,
        ])]);
        $creator->refresh();

        $product = DigitalProduct::query()->create([
            'uuid' => Str::uuid(),
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Test Product',
            'price_cents' => 10000,
            'currency' => 'ETB',
            'status' => 'approved',
        ]);

        $mockGateway = $this->getMockBuilder(ChapaGateway::class)
            ->disableOriginalConstructor()
            ->getMock();
        $mockGateway->method('createTransaction')->willReturn(
            new PaymentTransaction([
                'tx_ref' => 'test_tx_ref',
                'checkout_url' => 'https://checkout.chapa.com/test',
            ]),
        );
        app()->instance(ChapaGateway::class, $mockGateway);

        $checkout = app(StorefrontCheckout::class);
        $order = $checkout->create($product, null, ['name' => 'Buyer', 'email' => 'buyer@test.com']);

        $this->assertSame(5.0, (float) $order->platform_fee_percent);
        $this->assertSame(500, $order->platform_fee_cents);
        $this->assertSame(9500, $order->creator_earnings_cents);

        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'platform_fee_percent' => 0.0,
            'commission_bps' => 0,
        ])]);
        $creator->refresh();

        $order->refresh();
        $this->assertSame(5.0, (float) $order->platform_fee_percent);
        $this->assertSame(500, $order->commission_bps);
        $this->assertSame(10000, $order->gross_amount_cents);
        $this->assertSame(500, $order->platform_fee_cents);
        $this->assertSame(9500, $order->creator_earnings_cents);
    }

    public function testFeeMathUsesIntegerBasisPoints(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();

        $plan = $creator->getSubscriptionProduct();
        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'commission_bps' => 337,
        ])]);
        $creator->refresh();

        $product = DigitalProduct::query()->create([
            'uuid' => Str::uuid(),
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Fee Math Product',
            'price_cents' => 10000,
            'currency' => 'ETB',
            'status' => 'approved',
        ]);

        $mockGateway = $this->getMockBuilder(ChapaGateway::class)
            ->disableOriginalConstructor()
            ->getMock();
        $mockGateway->method('createTransaction')->willReturn(
            new PaymentTransaction([
                'tx_ref' => 'test_tx_ref',
                'checkout_url' => 'https://checkout.chapa.com/test',
            ]),
        );
        app()->instance(ChapaGateway::class, $mockGateway);

        $order = app(StorefrontCheckout::class)->create(
            $product,
            null,
            ['name' => 'Buyer', 'email' => 'buyer@test.com'],
        );

        $this->assertSame(337, $order->commission_bps);
        $this->assertSame(337, $order->platform_fee_cents);
        $this->assertSame(9663, $order->creator_earnings_cents);
        $this->assertSame(3.37, (float) $order->platform_fee_percent);
    }

    public function testAdminConfigChangeDrivesBackend(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();

        $plan = $creator->getSubscriptionProduct();
        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'max_paid_products' => 2,
            'platform_fee_percent' => 4.0,
            'commission_bps' => 400,
        ])]);
        $creator->refresh();

        $benefits = app(StorefrontBenefits::class)->forCreator($creator);
        $this->assertSame(4.0, $benefits['platform_fee_percent']);
        $this->assertSame(2, $benefits['max_paid_products']);
    }

    public function testUsageApiReturnsCommerceMetrics(): void
    {
        $creator = $this->createCreator();
        $plan = $creator->getSubscriptionProduct();
        $plan->update([
            'storefront_benefits' => array_merge(
                $plan->storefront_benefits ?? [],
                [
                    'max_free_products' => 5,
                    'max_paid_products' => 5,
                    'max_upload_bytes' => 1073741824,
                    'max_storefronts' => 1,
                    'max_workspaces' => 1,
                ],
            ),
        ]);
        $creator->refresh();

        $response = $this->stateful()->actingAs($creator)
            ->get('/api/v1/usage');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertArrayHasKey('digital_products', $data);
        $this->assertArrayHasKey('free_products', $data);
        $this->assertArrayHasKey('paid_products', $data);
        $this->assertArrayHasKey('storage', $data);
        $this->assertArrayHasKey('storefronts', $data);
        $this->assertArrayHasKey('workspaces', $data);
        $response
            ->assertJsonPath('data.free_products.total', 5)
            ->assertJsonPath('data.paid_products.total', 5)
            ->assertJsonPath('data.storage.total', 1073741824)
            ->assertJsonPath('data.storefronts.total', 1)
            ->assertJsonPath('data.workspaces.used', 1)
            ->assertJsonPath('data.workspaces.total', 1);
    }

    public function testIsDefaultPlanResolvesWithoutSubscription(): void
    {
        $creator = $this->createCreator();

        $plan = $creator->getSubscriptionProduct();

        $this->assertNotNull($plan);
        $this->assertTrue($plan->is_default || $plan->free);
    }

    public function testEntitlementsServiceResolvesPlanLimitsAndFees(): void
    {
        $creator = $this->createCreator();
        $entitlements = app(\App\Entitlements\Entitlements::class);

        $plan = $entitlements->planFor($creator);
        $this->assertNotNull($plan);
        $this->assertTrue($plan->is_default || $plan->free);

        $this->assertIsInt($entitlements->limit($creator, 'max_free_products'));
        $this->assertSame(
            (int) config('storefront.default_benefits.commission_bps'),
            $entitlements->feeBps($creator),
        );
        $this->assertIsBool($entitlements->enabled($creator, 'tracking_pixels_enabled'));
        $this->assertSame(
            (int) config('storefront.default_benefits.max_upload_bytes'),
            $entitlements->limit($creator, 'max_upload_bytes'),
        );
    }

    public function testPlanWithoutBenefitsFallsBackToDefaultPlanBenefits(): void
    {
        $creator = $this->createCreator();
        $defaultPlan = $creator->getSubscriptionProduct();
        $noBenefitsPlan = \Common\Billing\Models\Product::create([
            'name' => 'No Benefits',
            'uuid' => Str::uuid(),
            'free' => false,
            'position' => 99,
            'storefront_benefits' => [],
        ]);

        $benefits = app(\App\Entitlements\Entitlements::class)->benefitsFor($noBenefitsPlan);

        $this->assertSame(
            (int) $defaultPlan->storefront_benefits['commission_bps'],
            $benefits['commission_bps'],
        );
    }

    public function testFormatBytes(): void
    {
        $this->assertSame('1 GB', \App\Entitlements\Entitlements::formatBytes(1073741824));
        $this->assertSame('25 GB', \App\Entitlements\Entitlements::formatBytes(26843545600));
        $this->assertSame('5 MB', \App\Entitlements\Entitlements::formatBytes(5242880));
        $this->assertSame('1.5 GB', \App\Entitlements\Entitlements::formatBytes(1610612736));
    }

    public function testDefaultPlanCannotBeDeleted(): void
    {
        $admin = $this->createAdmin();
        $defaultPlan = Product::create([
            'name' => 'Default Cannot Delete',
            'uuid' => Str::uuid(),
            'free' => true,
            'position' => 51,
            'is_default' => true,
        ]);

        $response = $this->stateful()->actingAs($admin)
            ->delete("/api/v1/billing/products/{$defaultPlan->id}");

        $response->assertStatus(422);
    }

    public function testDefaultPlanCannotBeDisabled(): void
    {
        $admin = $this->createAdmin();
        $defaultPlan = Product::where('is_default', true)->first();

        $response = $this->stateful()->actingAs($admin)
            ->put("/api/v1/billing/products/{$defaultPlan->id}", [
                'name' => $defaultPlan->name,
                'is_default' => true,
                'active' => false,
            ]);

        $response->assertStatus(422);
    }

    public function testUploadTimeStorageQuotaEnforced(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();

        $role = \Common\Roles\Models\Role::where('default', true)->first();
        $creator->roles()->attach($role->id);

        $plan = $creator->getSubscriptionProduct();
        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'max_upload_bytes' => 200,
        ])]);

        $file = \Illuminate\Http\UploadedFile::fake()->create('file.pdf', 1);

        $response = $this->stateful()->actingAs($creator)
            ->post('/api/v1/file-entries', [
                'file' => $file,
                'workspaceId' => $workspace->id,
                'uploadType' => 'digitalProductFiles',
            ]);

        $response->assertStatus(422);

        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'max_upload_bytes' => 1073741824,
        ])]);

        $file2 = \Illuminate\Http\UploadedFile::fake()->createWithContent(
            'file2.pdf',
            "%PDF-1.4\n% Linket test PDF",
        );

        $response = $this->stateful()->actingAs($creator)
            ->post('/api/v1/file-entries', [
                'file' => $file2,
                'workspaceId' => $workspace->id,
                'uploadType' => 'digitalProductFiles',
            ]);

        $response->assertStatus(200);
    }

    public function testPricingFeaturesDerivedFromPlanBenefits(): void
    {
        $plan = Product::where('is_default', true)->first();

        $resource = new \Common\Billing\Products\ProductResource($plan);
        $data = $resource->toArray(request());

        $this->assertIsArray($data['pricing_features']);
        $this->assertContains('5 free products', $data['pricing_features']);
        $this->assertContains('5 paid products', $data['pricing_features']);
        $this->assertContains('1 GB storage', $data['pricing_features']);
        $this->assertContains('5% Linket transaction fee', $data['pricing_features']);
    }

    public function testMarkingNewDefaultPlanClearsOldDefault(): void
    {
        $admin = $this->createAdmin();
        $defaultPlan = Product::where('is_default', true)->first();
        // free = true avoids gateway sync (SyncProductOnEnabledGateways) in the test env
        $newPlan = Product::create([
            'name' => 'New Default',
            'uuid' => Str::uuid(),
            'free' => true,
            'position' => 50,
        ]);

        $response = $this->stateful()->actingAs($admin)
            ->put("/api/v1/billing/products/{$newPlan->id}", [
                'name' => 'New Default',
                'is_default' => true,
            ]);

        $response->assertStatus(200);
        $this->assertSame(1, Product::where('is_default', true)->count());
        $this->assertFalse($defaultPlan->fresh()->is_default);
    }

    public function testPixelExecutionSkippedWhenPlanDoesNotEnableTrackingPixels(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();

        $plan = $creator->getSubscriptionProduct();
        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'tracking_pixels_enabled' => false,
        ])]);
        $creator->refresh();

        $link = \App\Links\Models\Link::query()->create([
            'type' => 'direct',
            'back_half' => Str::random(6),
            'long_url' => 'https://example.com/redirect-target',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);
        $pixel = \App\TrackingPixels\Models\TrackingPixel::query()->create([
            'name' => 'Test Pixel',
            'type' => 'facebook',
            'pixel_id' => '123456',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);
        $link->pixels()->attach($pixel->id);

        $response = $this->get('/' . $link->back_half);

        $response->assertStatus(301);
        $this->assertStringNotContainsString('facebook.com', $response->getContent() ?? '');

        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'tracking_pixels_enabled' => true,
        ])]);
        $creator->refresh();

        $response = $this->get('/' . $link->back_half);
        $this->assertStringContainsString('facebook.com', $response->getContent() ?? '');
    }

    private function createAdmin(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'Admin ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $user->permissions()->attach(
            Permission::query()->firstOrCreate(['name' => 'admin']),
        );

        return $user;
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    private function createCreator(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'Creator ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        if (!Workspace::query()->where('owner_id', $user->id)->where('is_personal', true)->exists()) {
            (new CreateWorkspace())->createPersonalWorkspace($user);
        }

        return $user;
    }
    public function testConfigDrivenLimitChangeAppliesImmediately(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();

        $plan = $creator->getSubscriptionProduct();
        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'max_paid_products' => 2,
        ])]);
        $creator->refresh();

        $file = FileEntry::query()->create([
            'name' => 'test.pdf',
            'file_name' => 'test.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);

        foreach ([1000, 2000] as $price) {
            DigitalProduct::query()->create([
                'uuid' => Str::uuid(),
                'workspace_id' => $workspace->id,
                'user_id' => $creator->id,
                'title' => "Product $price",
                'price_cents' => $price,
                'currency' => 'ETB',
                'status' => 'draft',
            ]);
        }

        $response = $this->stateful()->actingAs($creator)
            ->post('/api/v1/digital-products', [
                'title' => 'Third Product',
                'price_cents' => 3000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ]);
        $response->assertStatus(422);

        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'max_paid_products' => 3,
        ])]);
        $creator->refresh();

        $response = $this->stateful()->actingAs($creator)
            ->post('/api/v1/digital-products', [
                'title' => 'Third Product',
                'price_cents' => 3000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ]);
        $response->assertStatus(201);

        $response = $this->stateful()->actingAs($creator)
            ->post('/api/v1/digital-products', [
                'title' => 'Fourth Product',
                'price_cents' => 4000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ]);
        $response->assertStatus(422);
    }

    public function testDowngradeFallsBackToDefaultPlanDataIntact(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $freePlan = Product::where('is_default', true)->first();

        $proPlan = Product::create([
            'name' => 'Pro Test',
            'uuid' => Str::uuid(),
            'free' => false,
            'position' => 3,
            'storefront_benefits' => [
                'platform_fee_percent' => 0.0,
                'commission_bps' => 0,
                'max_products' => null,
                'max_free_products' => null,
                'max_paid_products' => null,
                'max_upload_bytes' => null,
                'max_storefronts' => null,
                'max_workspaces' => null,
                'tracking_pixels_enabled' => true,
            ],
        ]);
        $subscription = \Common\Billing\Subscription::query()->create([
            'user_id' => $creator->id,
            'product_id' => $proPlan->id,
            'price_id' => \Common\Billing\Models\Price::query()->create([
                'product_id' => $proPlan->id,
                'amount' => 5000,
                'currency' => 'ETB',
                'interval' => 'month',
                'interval_count' => 1,
            ])->id,
            'gateway_name' => 'none',
            'gateway_status' => 'active',
            'renews_at' => now()->addDays(30),
            'ends_at' => null,
        ]);
        $creator->refresh();

        // over free limits while on Pro (free plan allows 5 paid products)
        foreach ([1000, 2000, 3000, 4000, 5000, 6000] as $price) {
            DigitalProduct::query()->create([
                'uuid' => Str::uuid(),
                'workspace_id' => $workspace->id,
                'user_id' => $creator->id,
                'title' => "Pro Product $price",
                'price_cents' => $price,
                'currency' => 'ETB',
                'status' => 'approved',
            ]);
        }
        \App\Biolinks\Models\Biolink::query()->create([
            'back_half' => Str::random(5),
            'name' => 'Second Storefront',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);

        // expire subscription
        $subscription->update(['ends_at' => now()->subDay(), 'renews_at' => null]);
        $creator->refresh();

        // effective plan falls back to default
        $this->assertSame($freePlan->id, $creator->getSubscriptionProduct()->id);

        // data intact
        $this->assertSame(
            6,
            DigitalProduct::where('workspace_id', $workspace->id)->count(),
        );

        // no new resources allowed
        $file = FileEntry::query()->create([
            'name' => 'test.pdf',
            'file_name' => 'test.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $response = $this->stateful()->actingAs($creator)
            ->post('/api/v1/digital-products', [
                'title' => 'Downgrade Product',
                'price_cents' => 5000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ]);
        $response->assertStatus(422);

        // upgrade restores immediately
        $subscription->update(['ends_at' => null]);
        $creator->refresh();
        $response = $this->stateful()->actingAs($creator)
            ->post('/api/v1/digital-products', [
                'title' => 'Upgraded Product',
                'price_cents' => 5000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ]);
        $response->assertStatus(201);
    }

}
