<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Resources\DigitalProductResource;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductPlacementTest extends TestCase
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

    /**
     * Regression: biolink_ids must be present even when the biolinks
     * relation was not eager-loaded. The product form treats a missing key
     * as "no placement" (?? []) and would wipe placement on next save.
     */
    public function test_biolink_ids_present_without_eager_load(): void
    {
        [$creator, $workspace, $product, $biolink] = $this->placedProduct();
        ActiveWorkspace::clearCache();

        $fresh = DigitalProduct::query()->find($product->id);
        $this->assertFalse($fresh->relationLoaded('biolinks'));

        $array = (new DigitalProductResource($fresh))->toArray(request());

        $this->assertArrayHasKey('biolink_ids', $array);
        $this->assertSame([$biolink->id], $array['biolink_ids']);
    }

    public function test_biolink_ids_match_when_eager_loaded(): void
    {
        [$creator, $workspace, $product, $biolink] = $this->placedProduct();
        ActiveWorkspace::clearCache();

        $loaded = DigitalProduct::query()->with('biolinks')->find($product->id);

        $array = (new DigitalProductResource($loaded))->toArray(request());

        $this->assertArrayHasKey('biolink_ids', $array);
        $this->assertSame([$biolink->id], $array['biolink_ids']);
    }

    public function test_empty_placement_returns_empty_array_not_missing_key(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();

        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Unplaced',
            'price_cents' => 0,
            'currency' => 'ETB',
            'status' => 'draft',
            'type' => 'digital',
        ]);

        $fresh = DigitalProduct::query()->find($product->id);
        $array = (new DigitalProductResource($fresh))->toArray(request());

        $this->assertArrayHasKey('biolink_ids', $array);
        $this->assertSame([], $array['biolink_ids']);
    }

    public function test_show_endpoint_includes_biolink_ids(): void
    {
        [$creator, $workspace, $product, $biolink] = $this->placedProduct();
        ActiveWorkspace::clearCache();

        $response = $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/digital-products/{$product->id}?workspace_id={$workspace->id}");

        $response->assertOk();
        $response->assertJsonPath('data.biolink_ids', [$biolink->id]);
    }

    /**
     * @return array{User, mixed, DigitalProduct, Biolink}
     */
    private function placedProduct(): array
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);

        $biolink = Biolink::query()->create([
            'back_half' => Str::random(8),
            'name' => 'Test Storefront',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);

        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Placed Product',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'draft',
            'type' => 'digital',
        ]);

        $product->biolinks()->attach($biolink->id);

        return [$creator, $workspace, $product, $biolink];
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
}
