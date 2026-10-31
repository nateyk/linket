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

    public function testIndexSupportsSearchStatusFilterAndPagination(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        DigitalProduct::query()->create([
            'workspace_id' => $workspace->id, 'user_id' => $creator->id,
            'title' => 'Amharic workbook', 'price_cents' => 2000, 'currency' => 'ETB', 'status' => 'approved',
        ]);
        DigitalProduct::query()->create([
            'workspace_id' => $workspace->id, 'user_id' => $creator->id,
            'title' => 'Draft notes', 'price_cents' => 0, 'currency' => 'ETB', 'status' => 'draft',
        ]);
        DigitalProduct::query()->create([
            'workspace_id' => $workspace->id, 'user_id' => $creator->id,
            'title' => 'Rejected guide', 'price_cents' => 1500, 'currency' => 'ETB', 'status' => 'rejected',
            'rejection_reason' => 'Missing cover image',
        ]);

        ActiveWorkspace::clearCache();
        $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/items?workspace_id={$workspace->id}&search=workbook&status=approved&per_page=1")
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Amharic workbook')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('meta.per_page', 1);

        $this->getJson("/api/v1/items?workspace_id={$workspace->id}&status=rejected")
            ->assertOk()
            ->assertJsonPath('data.0.rejection_reason', 'Missing cover image')
            ->assertJsonCount(1, 'data');
    }

    public function testDuplicateCreatesDraftCopyWithoutCopyingOrders(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id, 'user_id' => $creator->id,
            'title' => 'Original product', 'price_cents' => 3000, 'currency' => 'ETB', 'status' => 'approved',
            'description' => 'Original description',
        ]);
        $this->createOrder($product, $creator, 'paid', 3000);
        ActiveWorkspace::clearCache();

        $response = $this->stateful()->actingAs($creator)
            ->postJson("/api/v1/items/{$product->id}/duplicate?workspace_id={$workspace->id}")
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.title', 'Original product (copy)');

        $copyId = $response->json('data.id');
        $this->assertNotSame($product->id, $copyId);
        $this->assertSame(0, DigitalProduct::query()->findOrFail($copyId)->orders()->where('status', 'paid')->count());
        $this->assertSame(1, $product->fresh()->orders()->where('status', 'paid')->count());
    }

    public function testArchiveAndUnarchiveUpdatePublicationStatus(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id, 'user_id' => $creator->id,
            'title' => 'Live product', 'price_cents' => 1000, 'currency' => 'ETB', 'status' => 'approved',
            'approved_at' => now(),
        ]);
        ActiveWorkspace::clearCache();

        $this->stateful()->actingAs($creator)
            ->postJson("/api/v1/items/{$product->id}/archive?workspace_id={$workspace->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');

        $this->postJson("/api/v1/items/{$product->id}/unarchive?workspace_id={$workspace->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'draft');
    }

    public function testProductsWithPaidOrdersCannotBeDeletedAndKeepOrdersIntact(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id, 'user_id' => $creator->id,
            'title' => 'Sold product', 'price_cents' => 4000, 'currency' => 'ETB', 'status' => 'approved',
        ]);
        $order = $this->createOrder($product, $creator, 'paid', 4000);
        ActiveWorkspace::clearCache();

        $this->stateful()->actingAs($creator)
            ->deleteJson("/api/v1/items/{$product->id}?workspace_id={$workspace->id}")
            ->assertStatus(409);

        $this->assertNotNull($product->fresh());
        $this->assertDatabaseHas('storefront_orders', ['id' => $order->id, 'status' => 'paid']);
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
