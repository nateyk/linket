<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Common\Permissions\Models\Permission;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminProductStatisticsTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    private function createAdmin(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'Admin '.Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $user->permissions()->attach(
            Permission::query()->firstOrCreate(['name' => 'admin']),
        );

        return $user;
    }

    private function creatorContext(): array
    {
        $creator = User::query()->forceCreate([
            'name' => 'Creator '.Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        if (!Workspace::query()->where('owner_id', $creator->id)->where('is_personal', true)->exists()) {
            (new CreateWorkspace())->createPersonalWorkspace($creator);
        }
        ActiveWorkspace::clearCache();

        return [$creator, $creator->workspaces()->first()];
    }

    private function product(Workspace $workspace, User $creator, array $attributes = []): DigitalProduct
    {
        return DigitalProduct::query()->create(array_merge([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Product '.Str::random(6),
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ], $attributes));
    }

    private function createOrder(DigitalProduct $product, User $creator, string $status): StorefrontOrder
    {
        return StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'currency' => $product->currency,
            'gross_amount_cents' => 1000,
            'commission_bps' => 1000,
            'platform_fee_cents' => 100,
            'creator_earnings_cents' => 900,
            'status' => $status,
            'paid_at' => $status === 'paid' ? now() : null,
        ]);
    }

    public function testAdminCanFetchProductStatistics(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);
        $product->views()->create(['ip_hash' => str_repeat('a', 64), 'created_at' => now()]);
        $product->views()->create(['ip_hash' => str_repeat('b', 64), 'created_at' => now()]);
        $this->createOrder($product, $creator, 'paid');

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}/statistics");

        $response->assertOk();
        $response->assertJsonStructure([
            'period' => ['from', 'to'],
            'kpis' => ['sales_count', 'gross_cents', 'creator_earnings_cents', 'views_count', 'conversion_pct'],
            'sales_series' => [],
            'views_series' => [],
            'top_countries' => [],
            'top_referrers' => [],
        ]);
        $this->assertSame(2, $response->json('kpis.views_count'));
        $this->assertSame(1, $response->json('kpis.sales_count'));
        $this->assertSame(1000, $response->json('kpis.gross_cents'));
    }

    public function testNonAdminCannotFetchProductStatistics(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);

        $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/admin/digital-products/{$product->id}/statistics")
            ->assertForbidden();
    }
}