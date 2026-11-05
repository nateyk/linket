<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\CreatorServices\Models\CreatorService;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Core\Rendering\CrawlerDetector;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * SF-13: the actual authenticated store Appearance save must reach every
 * published buyer surface and the /username?preview=1 frame. All records
 * are synthetic and rolled back; no external provider is contacted.
 */
class StorefrontAppearancePersistenceTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function test_saved_appearance_reaches_profile_preview_product_and_service_pages(): void
    {
        Http::fake();
        Queue::fake();

        [$creator, $store, $product, $service] = $this->publishedFixture();
        $initial = [
            'bgConfig' => [
                'backgroundImage' => 'linear-gradient(90deg, #56ab2f, #a8e063)',
                'color' => '#193452',
                'tint' => 12,
                'noise' => true,
            ],
            'btnConfig' => [
                'variant' => 'outline',
                'radius' => 'rounded-lg',
                'shadow' => 'strong',
                'color' => '#193452',
            ],
            'fontConfig' => ['family' => 'Inter'],
            'layout' => 'profile-sidebar',
        ];

        $save = $this->actingAs($creator)
            ->withSession(['_token' => 'synthetic-csrf'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'synthetic-csrf')
            ->postJson("/api/v1/stores/{$store->id}/appearance", ['config' => $initial]);

        $save->assertOk()->assertJsonPath(
            'data.appearance.config.bgConfig.color',
            '#193452',
        );
        $this->assertEquals($initial, $store->fresh()->appearance->config);

        $this->assertEveryPublishedSurfaceHasAppearance($store, $product, $service, $initial);

        // Changing Appearance is a fresh server save, not a preview-only
        // visual update: public URLs must stop receiving the old snapshot.
        $updated = [
            'bgConfig' => ['backgroundColor' => '#111827', 'color' => '#f8fafc'],
            'btnConfig' => [
                'variant' => 'solid',
                'radius' => 'rounded-sm',
                'shadow' => 'none',
                'color' => '#bcd5fc',
            ],
            'fontConfig' => ['family' => 'Oswald'],
            'layout' => 'profile-sidebar',
        ];
        $this->postJson("/api/v1/stores/{$store->id}/appearance", [
            'config' => $updated,
        ])->assertOk();

        $this->assertEquals($updated, $store->fresh()->appearance->config);
        $this->assertEveryPublishedSurfaceHasAppearance($store, $product, $service, $updated);
        Http::assertNothingSent();
    }

    public function test_another_creator_cannot_overwrite_store_appearance(): void
    {
        [$owner, $store] = $this->publishedFixture();
        $stranger = $this->creator();
        ActiveWorkspace::clearCache();

        $this->actingAs($stranger)
            ->withSession(['_token' => 'synthetic-csrf'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'synthetic-csrf')
            ->postJson("/api/v1/stores/{$store->id}/appearance", [
                'config' => [
                    'bgConfig' => ['backgroundColor' => '#ff0000'],
                ],
            ])->assertForbidden();

        $this->assertFalse($store->fresh()->appearance()->exists());
        $this->assertNotSame($owner->id, $stranger->id);
    }

    private function assertEveryPublishedSurfaceHasAppearance(
        Biolink $store,
        DigitalProduct $product,
        CreatorService $service,
        array $expected,
    ): void {
        $slug = $store->back_half;
        $routes = [
            "/{$slug}" => 'linkeablePage',
            "/{$slug}?preview=1" => 'linkeablePage',
            "/{$slug}/products/{$product->id}" => 'digitalProductPage',
            "/{$slug}/services/{$service->slug}" => 'servicePage',
        ];
        foreach ($routes as $path => $loader) {
            $html = $this->withHeader(
                'User-Agent',
                'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
            )->get($path)->assertOk()->getContent();

            $data = $this->bootstrapLoader($html, $loader);
            $this->assertTrue(
                $this->containsAppearance($data, $expected),
                "{$path} did not contain the same saved storefront Appearance.",
            );
        }
    }

    private function bootstrapLoader(string $html, string $loader): mixed
    {
        $this->assertSame(
            1,
            preg_match('/window\.bootstrapData = (.*?);\s*<\/script>/s', $html, $matches),
            'The published page must carry a SPA bootstrap payload.',
        );
        $data = json_decode(trim($matches[1]), true);
        $this->assertSame(JSON_ERROR_NONE, json_last_error());
        $this->assertArrayHasKey($loader, $data['loaders'] ?? []);

        return $data['loaders'][$loader];
    }

    private function containsAppearance(mixed $node, array $expected): bool
    {
        if (!is_array($node)) {
            return false;
        }
        foreach ($node as $key => $value) {
            if ($key === 'appearance' && is_array($value)) {
                $saved = $value['config'] ?? $value;
                if ($saved == $expected) {
                    return true;
                }
            }
            if (is_array($value) && $this->containsAppearance($value, $expected)) {
                return true;
            }
        }
        return false;
    }

    private function publishedFixture(): array
    {
        $owner = $this->creator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($owner);
        $store = Biolink::query()->create([
            'back_half' => Str::lower(Str::random(12)),
            'name' => 'Synthetic Appearance Store',
            'user_id' => $owner->id,
            'workspace_id' => $workspace->id,
        ]);
        $file = FileEntry::query()->create([
            'name' => 'appearance-qa.pdf',
            'file_name' => 'appearance-qa.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $owner->id,
        ]);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $owner->id,
            'title' => 'Appearance QA Resource',
            'price_cents' => 0,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);
        $product->files()->attach($file->id);
        $product->biolinks()->attach($store->id);

        $service = CreatorService::query()->create([
            'store_id' => $store->id,
            'workspace_id' => $workspace->id,
            'user_id' => $owner->id,
            'title' => 'Appearance QA Service',
            'slug' => 'appearance-qa-service',
            'status' => 'published',
            'currency' => 'ETB',
            'description' => '<p>Synthetic logo service</p>',
        ]);
        ActiveWorkspace::clearCache();

        return [$owner, $store, $product, $service];
    }

    private function creator(): User
    {
        $id = Str::lower(Str::random(12));
        return User::query()->forceCreate([
            'name' => 'Creator '.$id,
            'username' => $id,
            'email' => "{$id}@example.test",
            'password' => bcrypt('not-used'),
            'email_verified_at' => now(),
        ]);
    }
}
