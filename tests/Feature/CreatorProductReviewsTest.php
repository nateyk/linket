<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductReview;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class CreatorProductReviewsTest extends TestCase
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

    private function makeReview(DigitalProduct $product, array $attributes = []): ProductReview
    {
        $review = ProductReview::unguarded(fn() => $product->addReview(array_merge([
            'review' => 'Nice product '.Str::random(4),
            'approved' => true,
            'ratings' => ['overall' => 4],
        ], $attributes)));

        $model = ProductReview::query()->findOrFail($review->getKey());
        // addReview persists via the base Review model, which drops custom
        // fields like title/buyer_email/buyer_name — persist them here.
        $model->update($attributes);

        return $model;
    }

    public function testOwnerCanFetchProductReviews(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createProduct($creator, $workspace);
        $this->makeReview($product, ['title' => 'Great']);

        $response = $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/digital-products/{$product->id}/reviews?per_page=100");

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                '*' => ['id', 'stars', 'title', 'review', 'buyer_name', 'created_at'],
            ],
        ]);
        $this->assertSame(1, count($response->json('data')));
        $this->assertSame('Great', $response->json('data.0.title'));
    }

    public function testOtherCreatorCannotFetchProductReviews(): void
    {
        $owner = $this->createCreator();
        $ownerWorkspace = (new CreateWorkspace())->createPersonalWorkspace($owner);
        ActiveWorkspace::clearCache();
        $product = $this->createProduct($owner, $ownerWorkspace);

        $other = $this->createCreator();
        $otherWorkspace = (new CreateWorkspace())->createPersonalWorkspace($other);
        ActiveWorkspace::clearCache();

        $this->stateful()->actingAs($other)
            ->getJson("/api/v1/digital-products/{$product->id}/reviews?workspace_id={$otherWorkspace->id}")
            ->assertForbidden();
    }

    public function testGuestCannotFetchProductReviews(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $product = $this->createProduct($creator, $workspace);

        $this->getJson("/api/v1/digital-products/{$product->id}/reviews")
            ->assertUnauthorized();
    }
}