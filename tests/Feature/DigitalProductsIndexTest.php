<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class DigitalProductsIndexTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();

        parent::tearDown();
    }

    public function testIndexIncludesOnlyPaidOrdersInProductSalesAggregates(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Creator toolkit',
            'price_cents' => 5000,
            'currency' => 'ETB',
            'status' => 'approved',
        ]);

        $this->createOrder($product, $creator, 'paid', 5000);
        $this->createOrder($product, $creator, 'paid', 7500);
        $this->createOrder($product, $creator, 'pending', 9000);

        ActiveWorkspace::clearCache();

        $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/items?workspace_id={$workspace->id}")
            ->assertOk()
            ->assertJsonPath('data.0.sales_count', 2)
            ->assertJsonPath('data.0.gross_revenue_cents', 12500)
            ->assertJsonPath('meta.total', 1);
    }

    private function createCreator(): User
    {
        $token = Str::lower(Str::random(12));

        return User::query()->forceCreate([
            'name' => 'Creator ' . $token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }

    private function stateful(): static
    {
        return $this->withHeader('Referer', 'http://localhost');
    }

    private function createOrder(
        DigitalProduct $product,
        User $creator,
        string $status,
        int $grossAmountCents,
    ): StorefrontOrder {
        return StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'currency' => $product->currency,
            'gross_amount_cents' => $grossAmountCents,
            'commission_bps' => 1000,
            'platform_fee_cents' => (int) round($grossAmountCents * 0.1),
            'creator_earnings_cents' => (int) round($grossAmountCents * 0.9),
            'status' => $status,
            'paid_at' => $status === 'paid' ? now() : null,
        ]);
    }
}
