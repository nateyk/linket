<?php

namespace Tests\Feature;

use App\Models\User;
use App\Stores\Models\Store;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductReview;
use Common\Permissions\Models\Permission;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminProductReviewsTest extends TestCase
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

    private function product(Workspace $workspace, User $creator): DigitalProduct
    {
        return DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Product '.Str::random(6),
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);
    }

    private function createReview(DigitalProduct $product, array $attributes = []): ProductReview
    {
        $review = ProductReview::unguarded(fn() => $product->addReview(array_merge([
            'review' => 'A solid product '.Str::random(4),
            'approved' => true,
            'ratings' => ['overall' => 5],
        ], $attributes)));

        $model = ProductReview::query()->findOrFail($review->getKey());
        // addReview persists via the base Review model, which drops custom
        // fields like title/buyer_email/buyer_name — persist them here.
        $model->update($attributes);

        return $model;
    }

    public function testAdminCanFetchProductReviews(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);
        $this->createReview($product, ['title' => 'Loved it', 'buyer_name' => 'Beza']);
        $this->createReview($product, ['review' => 'Not for me', 'approved' => false]);

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}/reviews");

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id', 'stars', 'title', 'review', 'buyer_name', 'buyer_email',
                    'approved', 'hidden_at', 'hidden_reason', 'created_at',
                    'product' => ['id', 'title'],
                ],
            ],
        ]);
        $this->assertSame(2, count($response->json('data')));
        $this->assertSame($product->id, $response->json('data.0.product.id'));
    }

    public function testAdminCanSearchProductReviews(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);
        $this->createReview($product, ['buyer_email' => 'first@example.test']);
        $this->createReview($product, ['buyer_email' => 'second@example.test']);

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}/reviews?search=first%40example.test");

        $response->assertOk();
        $this->assertSame(1, count($response->json('data')));
        $this->assertSame('first@example.test', $response->json('data.0.buyer_email'));
    }

    public function testAdminCanFilterReviewsByStatus(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);
        $this->createReview($product, ['approved' => true]);
        $this->createReview($product, ['approved' => false]);

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}/reviews?status=hidden");

        $response->assertOk();
        $this->assertSame(1, count($response->json('data')));
        $this->assertFalse($response->json('data.0.approved'));
    }

    public function testAdminCanHideUnhideAndDeleteReview(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);
        $review = $this->createReview($product);

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/digital-products/reviews/{$review->id}/hide", ['reason' => 'Spam'])
            ->assertOk();

        $hidden = $review->fresh();
        $this->assertFalse($hidden->approved);
        $this->assertNotNull($hidden->hidden_at);
        $this->assertSame($admin->id, $hidden->hidden_by);
        $this->assertSame('Spam', $hidden->hidden_reason);

        $this->stateful()->actingAs($admin)
            ->postJson("/api/v1/admin/digital-products/reviews/{$review->id}/unhide")
            ->assertOk();

        $restored = $review->fresh();
        $this->assertTrue($restored->approved);
        $this->assertNull($restored->hidden_at);
        $this->assertNull($restored->hidden_reason);

        $this->stateful()->actingAs($admin)
            ->deleteJson("/api/v1/admin/digital-products/reviews/{$review->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('reviews', ['id' => $review->id]);
    }

    public function testNonAdminCannotAccessAdminReviews(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);
        $review = $this->createReview($product);

        $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/admin/digital-products/{$product->id}/reviews")
            ->assertForbidden();

        $this->stateful()->actingAs($creator)
            ->postJson("/api/v1/admin/digital-products/reviews/{$review->id}/hide")
            ->assertForbidden();

        $this->stateful()->actingAs($creator)
            ->deleteJson("/api/v1/admin/digital-products/reviews/{$review->id}")
            ->assertForbidden();
    }

    public function testGuestCannotAccessAdminReviews(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);

        $this->getJson("/api/v1/admin/digital-products/{$product->id}/reviews")
            ->assertUnauthorized();
    }

    public function testReviewsIndexIncludesPublicUrlFromPrimaryStore(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);
        $store = Store::factory()->create(['user_id' => $creator->id, 'workspace_id' => $workspace->id]);
        $product->stores()->attach($store->id);
        $this->createReview($product);

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}/reviews");

        $response->assertOk();
        $this->assertSame(
            rtrim((string) $store->short_url, '/')."/products/{$product->id}",
            $response->json('product.public_url'),
        );
    }
}