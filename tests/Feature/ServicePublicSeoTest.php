<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\CreatorServices\Models\CreatorService;
use App\Models\User;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ServicePublicSeoTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function test_crawler_gets_prerendered_service_page(): void
    {
        [$store, $service] = $this->visibleService();
        ActiveWorkspace::clearCache();

        $response = $this->get("/{$store->back_half}/services/{$service->slug}?_escaped_fragment_=");

        $response->assertOk();
        $response->assertSee('<h1>Brand identity sprint</h1>', false);
        $response->assertSee('rel="canonical"', false);
        $response->assertSee('twitter:title', false);
        $response->assertSee('application/ld+json', false);

        $schema = $this->decodeJsonLd($response->getContent());

        $this->assertSame('https://schema.org', $schema['@context']);
        $this->assertSame('Service', $schema['@type']);
        $this->assertSame('Brand identity sprint', $schema['name']);
        // The cover the creator set must reach the crawler, not just the app.
        $this->assertNotEmpty($schema['image']);
        $this->assertStringEndsWith('.jpg', $schema['image']);
    }

    public function test_crawler_meta_description_has_no_html_tags(): void
    {
        [$store, $service] = $this->visibleService(
            '<p>Great <strong>identity</strong> work.</p>',
            shortDescription: null,
        );
        ActiveWorkspace::clearCache();

        $response = $this->get("/{$store->back_half}/services/{$service->slug}?_escaped_fragment_=");

        $response->assertOk();
        $response->assertSee('content="Great identity work."', false);
        $response->assertDontSee('&lt;p&gt;', false);
    }

    public function test_the_old_services_list_url_redirects_for_crawlers_too(): void
    {
        [$store, $service] = $this->visibleService();
        ActiveWorkspace::clearCache();

        // The list is a storefront tab, not an indexable page of its own, so
        // crawlers are sent to that tab instead of a page that no longer
        // exists.
        $this->get("/{$store->back_half}/services?_escaped_fragment_=")
            ->assertRedirect("/{$store->back_half}?section=services");
    }

    public function test_non_crawler_gets_spa_shell_not_prerender(): void
    {
        [$store, $service] = $this->visibleService();
        ActiveWorkspace::clearCache();

        $response = $this->get("/{$store->back_half}/services/{$service->slug}");

        $response->assertOk();
        $response->assertSee('og:title', false);
        $response->assertDontSee('<h1>Brand identity sprint</h1>', false);
    }

    private function decodeJsonLd(string $html): mixed
    {
        $matched = preg_match(
            '#<script type="application/ld\+json">(.*?)</script>#s',
            $html,
            $matches,
        );

        $this->assertSame(
            1,
            $matched,
            'Expected exactly one application/ld+json block in the prerendered page.',
        );

        $decoded = json_decode(trim($matches[1]), true);

        $this->assertSame(
            JSON_ERROR_NONE,
            json_last_error(),
            'The application/ld+json block must contain valid JSON: '.json_last_error_msg(),
        );

        return $decoded;
    }

    /**
     * @return array{Biolink, CreatorService}
     */
    private function visibleService(
        string $description = '<p>Brand work.</p>',
        string $status = 'published',
        ?string $shortDescription = 'A week-long identity sprint.',
    ): array {
        $token = Str::lower(Str::random(12));

        $creator = User::query()->forceCreate([
            'name' => 'Creator '.$token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);

        $store = Biolink::query()->create([
            'back_half' => Str::random(8),
            'name' => 'Test Storefront',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);

        $cover = FileEntry::query()->create([
            'name' => 'cover.jpg',
            'file_name' => Str::random(20).'.jpg',
            'file_size' => 2048,
            'mime' => 'image/jpeg',
            'extension' => 'jpg',
            'type' => 'image',
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
            'public' => true,
        ]);

        // A deterministic URL keeps the JSON-LD assertion stable.
        FileEntry::query()->whereKey($cover->id)->update(['path' => 'https://cdn.test/cover.jpg']);

        $service = CreatorService::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'store_id' => $store->id,
            'title' => 'Brand identity sprint',
            'slug' => 'brand-identity-sprint',
            'short_description' => $shortDescription,
            'description' => $description,
            'currency' => 'ETB',
            'status' => $status,
            'cover_file_entry_id' => $cover->id,
        ]);

        return [$store, $service];
    }
}