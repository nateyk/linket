<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class CreatorProductStatisticsTest extends TestCase
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

    private function createCreator(): User
    {
        $token = Str::lower(Str::random(12));

        return User::query()->forceCreate([
            'name' => 'Creator '.$token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }

    private function createProduct(User $creator, $workspace): DigitalProduct
    {
        return DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Product '.Str::random(6),
            'price_cents' => 5000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);
    }

    public function testOwnerCanFetchProductStatistics(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createProduct($creator, $workspace);
        $product->views()->create(['ip_hash' => str_repeat('a', 64), 'created_at' => now()]);
        $product->views()->create(['ip_hash' => str_repeat('b', 64), 'created_at' => now()]);
        StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'currency' => 'ETB',
            'gross_amount_cents' => 5000,
            'commission_bps' => 1000,
            'platform_fee_percent' => 10.0,
            'platform_fee_cents' => 500,
            'creator_earnings_cents' => 4500,
            'status' => 'paid',
            'paid_at' => now(),
            'buyer_country' => 'ET',
        ]);

        $response = $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/digital-products/{$product->id}/statistics?workspace_id={$workspace->id}");

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
        $this->assertSame(5000, $response->json('kpis.gross_cents'));
        $this->assertSame(4500, $response->json('kpis.creator_earnings_cents'));
        $this->assertSame(50, $response->json('kpis.conversion_pct'));
    }

    public function testOtherCreatorCannotFetchProductStatistics(): void
    {
        $owner = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($owner);
        ActiveWorkspace::clearCache();
        $product = $this->createProduct($owner, $workspace);

        $other = $this->createCreator();
        $otherWorkspace = (new CreateWorkspace())->createPersonalWorkspace($other);
        ActiveWorkspace::clearCache();

        $this->stateful()->actingAs($other)
            ->getJson("/api/v1/digital-products/{$product->id}/statistics?workspace_id={$otherWorkspace->id}")
            ->assertForbidden();
    }

    public function testMissingProductReturns404(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();

        $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/digital-products/999999999/statistics?workspace_id={$workspace->id}")
            ->assertNotFound();
    }

    public function testInvalidPeriodReturns422(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createProduct($creator, $workspace);

        $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/digital-products/{$product->id}/statistics?workspace_id={$workspace->id}&from=2026-10-31&to=2026-09-01")
            ->assertStatus(422);
    }

    public function testGuestCannotFetchProductStatistics(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createProduct($creator, $workspace);

        $this->getJson("/api/v1/digital-products/{$product->id}/statistics?workspace_id={$workspace->id}")
            ->assertUnauthorized();
    }
}