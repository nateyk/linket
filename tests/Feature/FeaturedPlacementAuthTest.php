<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Storefront\DigitalProductVisibility;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class FeaturedPlacementAuthTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    /**
     * syncForBiolink must enforce the same workspace rule as sync().
     * Previously it attached any product IDs with no validation at all.
     */
    public function test_sync_for_biolink_rejects_foreign_workspace_product(): void
    {
        [$owner, $workspace, $biolink] = $this->setupStorefront();
        $outsider = $this->createCreator();
        $otherWorkspace = (new CreateWorkspace())->createPersonalWorkspace($outsider);
        $foreignProduct = $this->createProduct($outsider, $otherWorkspace);
        ActiveWorkspace::clearCache();
        $this->actingAs($owner);

        try {
            app(DigitalProductVisibility::class)->syncForBiolink($biolink, [$foreignProduct->id]);

            $this->fail('Expected placement of a foreign-workspace product to be rejected.');
        } catch (HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
        }

        $this->assertSame([], $this->pivotIds($biolink->fresh()));
    }

    public function test_sync_for_biolink_rejects_caller_without_update_permission(): void
    {
        [$owner, $workspace, $biolink] = $this->setupStorefront();
        $product = $this->createProduct($owner, $workspace);
        ActiveWorkspace::clearCache();

        $stranger = $this->createCreator();
        $this->actingAs($stranger);

        try {
            app(DigitalProductVisibility::class)->syncForBiolink($biolink, [$product->id]);

            $this->fail('Expected placement by a stranger to be rejected.');
        } catch (AuthorizationException $exception) {
            $this->assertTrue(true);
        }

        $this->assertSame([], $this->pivotIds($biolink->fresh()));
    }

    public function test_sync_for_biolink_accepts_owned_product(): void
    {
        [$owner, $workspace, $biolink] = $this->setupStorefront();
        $product = $this->createProduct($owner, $workspace);
        ActiveWorkspace::clearCache();
        $this->actingAs($owner);

        app(DigitalProductVisibility::class)->syncForBiolink($biolink, [$product->id]);

        $this->assertSame([$product->id], $this->pivotIds($biolink->fresh()));
    }

    /**
     * @return array{User, mixed, Biolink}
     */
    private function setupStorefront(): array
    {
        $owner = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($owner);

        $biolink = Biolink::query()->create([
            'back_half' => Str::random(8),
            'name' => 'Test Storefront',
            'user_id' => $owner->id,
            'workspace_id' => $workspace->id,
        ]);

        return [$owner, $workspace, $biolink];
    }

    /** @return int[] */
    private function pivotIds(Biolink $biolink): array
    {
        return $biolink->digitalProducts()->pluck('digital_products.id')->all();
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

    private function createProduct(User $owner, $workspace): DigitalProduct
    {
        return DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $owner->id,
            'title' => 'Product '.Str::random(6),
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);
    }
}
