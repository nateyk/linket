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
            ->withSession(['_token' => 'test'])
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

    private function stateful(): static
    {
        return $this->withHeader('Referer', 'http://localhost');
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
}