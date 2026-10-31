<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DigitalProduct;
use App\Stores\Models\Store;
use Common\Permissions\Models\Permission;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminCreatorManagementTest extends TestCase
{
    use DatabaseTransactions;

    private function stateful(): static
    {
        $csrfToken = 'admin-creator-management';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    public function test_admin_overview_and_creator_directory_use_real_data(): void
    {
        $creator = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
        Store::factory()->create([
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
            'name' => 'Creator Store',
        ]);
        $admin = $this->createAdmin();

        $this->stateful()->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/storefront/creators/overview')
            ->assertOk()
            ->assertJson(fn ($json) => $json->where('data.total_creators', fn ($count) => $count >= 1)->etc());

        $this->stateful()->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/storefront/creators?search='.$creator->email)
            ->assertOk()
            ->assertJsonPath('data.data.0.email', $creator->email)
            ->assertJsonStructure(['data' => ['data', 'current_page']]);
    }

    public function test_admin_show_includes_subscription_receiving_accounts_and_disputes_context(): void
    {
        $creator = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
        Store::factory()->create([
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
            'name' => 'Detail Store',
        ]);
        DigitalProduct::query()->create([
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
            'title' => 'Sample Product',
            'status' => 'draft',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'type' => 'digital',
        ]);
        CreatorPaymentMethod::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'provider' => 'cbe',
            'account_number' => '1000123456789',
            'account_fingerprint' => hash_hmac('sha256', 'cbe:1000123456789', (string) config('app.key')),
            'account_name_raw' => 'Owner',
            'account_name_normalized' => 'owner',
            'status' => 'pending',
            'provider_registration_status' => 'pending',
        ]);
        $admin = $this->createAdmin();

        $this->stateful()->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/storefront/creators/'.$creator->id)
            ->assertOk()
            ->assertJsonPath('data.profile.email', $creator->email)
            ->assertJsonPath('data.products.0.title', 'Sample Product')
            ->assertJsonPath('data.receiving_accounts.0.provider', 'cbe')
            ->assertJsonPath('data.receiving_accounts.0.account_masked', '•••• 6789')
            ->assertJsonPath('data.receiving_accounts.0.checkout_eligible', false)
            ->assertJsonPath('data.links.receiving_accounts', '/admin/financial/withdrawal-methods')
            ->assertJsonStructure(['data' => ['verified_sales', 'subscription_payments', 'audit', 'pending_orders_count', 'sales_total']]);

        $this->stateful()->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/storefront/creators?attention=1')
            ->assertOk()
            ->assertJsonPath('data.data.0.pending_receiving_accounts_count', 1)
            ->assertJsonPath('data.data.0.needs_attention', true);

        $this->stateful()->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/storefront/creators/'.$creator->id.'/sales')
            ->assertOk()
            ->assertJsonStructure(['data' => ['data', 'current_page', 'last_page']]);
    }

    public function test_non_admin_cannot_access_creator_management(): void
    {
        $creator = $this->createUser();
        $this->stateful()->actingAs($creator, 'sanctum')->getJson('/api/v1/admin/storefront/creators/overview')->assertForbidden();
    }

    public function test_admin_overview_and_directory_expose_expiring_expired_and_pending_renewal_subscriptions(): void
    {
        settings()->save(['billing.enable' => true]);
        $plan = \Common\Billing\Models\Product::query()->where('system_key', 'pro')->firstOrFail();
        $price = \Common\Billing\Models\Price::query()->where('product_id', $plan->id)->where('currency', 'ETB')->where('interval', 'month')->firstOrFail();

        $expiring = $this->createUser();
        $expired = $this->createUser();
        $pendingRenewal = $this->createUser();
        foreach ([$expiring, $expired, $pendingRenewal] as $creator) {
            Store::factory()->create([
                'user_id' => $creator->id,
                'workspace_id' => app(CreateWorkspace::class)->createPersonalWorkspace($creator)->id,
                'name' => 'Store '.$creator->id,
            ]);
        }

        \Common\Billing\Subscription::query()->create([
            'user_id' => $expiring->id, 'product_id' => $plan->id, 'price_id' => $price->id,
            'gateway_name' => 'verify_et', 'gateway_status' => 'active', 'renews_at' => now()->addDays(3),
        ]);
        \Common\Billing\Subscription::query()->create([
            'user_id' => $expired->id, 'product_id' => $plan->id, 'price_id' => $price->id,
            'gateway_name' => 'verify_et', 'gateway_status' => 'expired', 'ends_at' => now()->subDay(), 'renews_at' => null,
        ]);
        \Common\Billing\Subscription::query()->create([
            'user_id' => $pendingRenewal->id, 'product_id' => $plan->id, 'price_id' => $price->id,
            'gateway_name' => 'verify_et', 'gateway_status' => 'past_due', 'renews_at' => now()->subDay(),
        ]);

        $admin = $this->createAdmin();
        $this->stateful()->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/storefront/creators/overview')
            ->assertOk()
            ->assertJson(fn ($json) => $json
                ->where('data.expiring_subscriptions', fn ($count) => $count >= 1)
                ->where('data.expired_subscriptions', fn ($count) => $count >= 1)
                ->where('data.pending_renewal_subscriptions', fn ($count) => $count >= 1)
                ->etc());

        $this->stateful()->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/storefront/creators?subscription=expiring')
            ->assertOk()
            ->assertJsonFragment(['email' => $expiring->email]);
        $this->stateful()->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/storefront/creators?subscription=expired')
            ->assertOk()
            ->assertJsonFragment(['email' => $expired->email]);
        $this->stateful()->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/storefront/creators?subscription=pending_renewal')
            ->assertOk()
            ->assertJsonFragment(['email' => $pendingRenewal->email]);
    }

    private function createAdmin(): User
    {
        $admin = $this->createUser();
        $admin->permissions()->attach(Permission::query()->firstOrCreate(['name' => 'admin.access']));

        return $admin;
    }

    private function createUser(): User
    {
        $token = Str::lower(Str::random(10));

        return User::query()->forceCreate([
            'name' => 'User '.$token,
            'username' => $token,
            'email' => $token.'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }
}
