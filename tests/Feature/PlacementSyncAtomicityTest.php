<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Storefront\DigitalProductVisibility;
use App\Storefront\Models\DigitalProduct;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class PlacementSyncAtomicityTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    /**
     * A failed placement sync must leave both the pivot and the derived
     * shop-widget config untouched. Mid-write database failures are covered
     * structurally by the transaction in DigitalProductVisibility (not
     * deterministically reproducible in a feature test); this pins the
     * observable no-partial-write contract on the reproducible path and
     * guards against validation ever moving after the writes.
     */
    public function test_failed_sync_leaves_pivot_and_widget_untouched(): void
    {
        $owner = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($owner);
        $storefront = $this->createBiolink($owner, $workspace);
        $product = $this->createProduct($owner, $workspace);
        ActiveWorkspace::clearCache();
        $this->actingAs($owner);

        app(DigitalProductVisibility::class)->sync($product, [$storefront->id]);

        $this->assertSame([$storefront->id], $this->pivotIds($product));
        $this->assertSame([$product->id], $this->widgetProductIds($storefront));

        $outsider = $this->createCreator();
        $otherWorkspace = (new CreateWorkspace())->createPersonalWorkspace($outsider);
        $foreignStorefront = $this->createBiolink($outsider, $otherWorkspace);

        try {
            app(DigitalProductVisibility::class)->sync(
                $product->fresh(),
                [$storefront->id, $foreignStorefront->id],
            );

            $this->fail('Expected placement on a foreign storefront to be rejected.');
        } catch (HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
        }

        $this->assertSame([$storefront->id], $this->pivotIds($product->fresh()));
        $this->assertSame([$product->id], $this->widgetProductIds($storefront->fresh()));
    }

    /** @return int[] */
    private function pivotIds(DigitalProduct $product): array
    {
        return $product->biolinks()->pluck('biolinks.id')->all();
    }

    /** @return int[] */
    private function widgetProductIds(Biolink $storefront): array
    {
        $widget = $storefront->widgets()->where('type', 'shop')->first();

        $this->assertNotNull($widget);

        return array_map('intval', $widget->config['product_ids'] ?? []);
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

    private function createBiolink(User $owner, $workspace): Biolink
    {
        return Biolink::query()->create([
            'back_half' => Str::random(8),
            'name' => 'Test Storefront',
            'user_id' => $owner->id,
            'workspace_id' => $workspace->id,
        ]);
    }

    private function createProduct(User $owner, $workspace): DigitalProduct
    {
        return DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $owner->id,
            'title' => 'Placed Product',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'approved',
            'type' => 'digital',
        ]);
    }
}
