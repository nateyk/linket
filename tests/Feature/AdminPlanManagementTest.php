<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\Models\ProSubscriptionPayment;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\CreatorVerificationAllowance;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Common\Workspaces\Actions\CreateWorkspace;
use Tests\TestCase;

class AdminPlanManagementTest extends TestCase
{
    use DatabaseTransactions;

    public function testAdminUpdatesFreeAllowanceAndHistoryRemainsIntact(): void
    {
        $admin = $this->createAdmin();
        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id, 'user_id' => $creator->id, 'title' => 'Historical sale',
            'price_cents' => 10000, 'currency' => 'ETB', 'status' => 'approved',
        ]);
        $free = $this->freePlan();
        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(), 'digital_product_id' => $product->id, 'creator_id' => $creator->id,
            'currency' => 'ETB', 'gross_amount_cents' => 10000, 'commission_bps' => 0,
            'platform_fee_percent' => 0, 'platform_fee_cents' => 0, 'creator_earnings_cents' => 10000,
            'status' => 'paid', 'payment_gateway' => 'verify_et', 'monetization_policy' => CreatorVerificationAllowance::FREE_POLICY,
        ]);
        \Illuminate\Support\Facades\DB::table('creator_verification_allowances')->insert([
            'creator_id' => $creator->id, 'storefront_order_id' => $order->id, 'status' => 'consumed',
            'consumed_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->stateful()->actingAs($admin)->putJson("/api/v1/billing/products/{$free->id}", [
            'name' => $free->name,
            'free' => true,
            'is_default' => true,
            'active' => true,
            'storefront_benefits' => [...($free->storefront_benefits ?? []), 'free_verified_sales' => 15, 'commission_bps' => 0],
        ])->assertOk()->assertJsonPath('data.storefront_benefits.free_verified_sales', 15);

        $this->assertSame(['consumed' => 1, 'reserved' => 0, 'remaining' => 14], app(CreatorVerificationAllowance::class)->usage($creator));
        $this->assertDatabaseHas('creator_verification_allowances', ['storefront_order_id' => $order->id, 'status' => 'consumed']);
        $this->assertDatabaseHas('plan_change_audits', ['product_id' => $free->id, 'actor_id' => $admin->id]);
    }

    public function testPlanSubscriberAndAuditEndpointsRequirePlanManagementPermission(): void
    {
        $admin = $this->createAdmin();
        $creator = User::factory()->create();
        $pro = $this->proPlan();
        $price = Price::query()->where('product_id', $pro->id)->firstOrFail();
        Subscription::query()->create([
            'user_id' => $creator->id, 'product_id' => $pro->id, 'price_id' => $price->id,
            'gateway_name' => 'verify_et', 'gateway_status' => 'active', 'renews_at' => now()->addMonth(),
        ]);

        $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/billing/products/{$pro->id}/subscribers")
            ->assertOk()->assertJsonPath('data.total', 1)->assertJsonPath('data.data.0.user.id', $creator->id);
        $this->getJson("/api/v1/admin/billing/products/{$pro->id}/audit")->assertOk();

        $this->stateful()->actingAs(User::factory()->create())
            ->getJson("/api/v1/admin/billing/products/{$pro->id}/subscribers")->assertForbidden();
    }

    public function testUnauthorizedUserCannotManageOrArchivePlans(): void
    {
        $free = $this->freePlan();

        $this->stateful()->actingAs(User::factory()->create())
            ->putJson("/api/v1/billing/products/{$free->id}", ['name' => 'Changed'])
            ->assertForbidden();

        $this->stateful()->actingAs($this->createAdmin())
            ->deleteJson("/api/v1/billing/products/{$free->id}")
            ->assertUnprocessable();
    }

    public function testPendingProPaymentSnapshotsItsPriceAndNewCheckoutUsesTheUpdatedPrice(): void
    {
        config()->set('services.verify_et.enabled', true);
        config()->set('services.verify_et.corporate_account', '1000123456789');
        $creator = User::factory()->create();
        $pro = $this->proPlan();
        $price = Price::query()->where('product_id', $pro->id)->firstOrFail();
        $this->stateful()->actingAs($creator);

        $pending = $this->postJson('/api/v1/billing/direct/pro')->assertOk()->json();
        $this->assertSame(50000, $pending['amount_cents']);
        $this->stateful()->actingAs($this->createAdmin())->putJson("/api/v1/billing/products/{$pro->id}", [
            'name' => $pro->name,
            'free' => false,
            'active' => true,
            'recommended' => true,
            'hidden' => false,
            'is_default' => false,
            'position' => $pro->position,
            'trial_period_days' => 0,
            'feature_list' => $pro->feature_list,
            'storefront_benefits' => $pro->storefront_benefits,
            'prices' => [[
                'id' => $price->id,
                'amount' => 700,
                'currency' => 'ETB',
                'interval' => 'month',
                'interval_count' => 1,
            ]],
        ])->assertOk();

        $pendingPayment = ProSubscriptionPayment::query()->where('uuid', $pending['payment_id'])->firstOrFail();
        $this->assertSame(50000, $pendingPayment->amount_cents);
        $this->assertSame($price->id, $pendingPayment->price_id);
        $this->assertNotNull($price->fresh());
        $this->assertDatabaseHas('prices', ['product_id' => $pro->id, 'amount' => 700, 'default' => true]);
        $this->stateful()->actingAs($creator);
        $this->postJson('/api/v1/billing/direct/pro')->assertOk()->assertJsonPath('payment_id', $pending['payment_id'])->assertJsonPath('amount_cents', 50000);
        $pendingPayment->update(['status' => 'paid']);
        $this->postJson('/api/v1/billing/direct/pro')->assertOk()->assertJsonPath('amount_cents', 70000);
    }

    private function freePlan(): Product
    {
        $plan = Product::query()->where('system_key', 'free')->first()
            ?? Product::query()->where('free', true)->first();
        if (!$plan) {
            return Product::query()->create([
                'uuid' => (string) Str::uuid(), 'name' => 'Free', 'free' => true, 'is_default' => true,
                'active' => true, 'system_key' => 'free', 'storefront_benefits' => ['free_verified_sales' => 10, 'commission_bps' => 0],
            ]);
        }
        $plan->update(['system_key' => 'free', 'name' => 'Free', 'free' => true, 'is_default' => true, 'active' => true,
            'storefront_benefits' => ['free_verified_sales' => 10, 'commission_bps' => 0]]);
        return $plan;
    }

    private function proPlan(): Product
    {
        $plan = Product::query()->where('system_key', 'pro')->first();
        if (!$plan) {
            $plan = Product::query()->create([
                'uuid' => (string) Str::uuid(), 'name' => 'Pro', 'free' => false, 'active' => true,
                'system_key' => 'pro', 'storefront_benefits' => ['free_verified_sales' => 0, 'commission_bps' => 0],
            ]);
        }
        $plan->update(['active' => true]);
        if (!Price::query()->where('product_id', $plan->id)->where('currency', 'ETB')->where('interval', 'month')->where('interval_count', 1)->exists()) {
            Price::query()->create(['product_id' => $plan->id, 'amount' => 500, 'currency' => 'ETB', 'interval' => 'month', 'interval_count' => 1, 'default' => true]);
        }
        return $plan;
    }

    private function createAdmin(): User
    {
        $admin = User::factory()->create();
        $admin->permissions()->attach(Permission::query()->firstOrCreate(['name' => 'subscriptions.update']));
        return $admin;
    }

    private function stateful(): static
    {
        return $this->withSession(['_token' => 'plan-test-token'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'plan-test-token');
    }
}
