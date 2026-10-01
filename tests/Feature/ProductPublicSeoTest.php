<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductPublicSeoTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function test_crawler_gets_prerendered_product_page(): void
    {
        [$biolink, $product] = $this->visibleProduct();
        ActiveWorkspace::clearCache();

        $response = $this->get("/{$biolink->back_half}/products/{$product->id}?_escaped_fragment_=");

        $response->assertOk();
        $response->assertSee('<h1>Test Guide</h1>', false);
        $response->assertSee('rel="canonical"', false);
        $response->assertSee('twitter:title', false);
        $response->assertSee('application/ld+json', false);

        $schema = $this->decodeJsonLd($response->getContent());

        $this->assertIsArray($schema, 'The application/ld+json block must decode to an object.');
        $this->assertArrayHasKey(
            '@context',
            $schema,
            'The JSON-LD @context key must survive Blade compilation intact.',
        );
        $this->assertSame('https://schema.org', $schema['@context']);
        $this->assertSame('Product', $schema['@type']);
        $this->assertSame('Test Guide', $schema['name']);
        $this->assertArrayHasKey('offers', $schema);
        $this->assertSame('Offer', $schema['offers']['@type']);
        $this->assertSame('10.00', $schema['offers']['price']);
    }

    public function test_crawler_meta_description_has_no_html_tags(): void
    {
        [$biolink, $product] = $this->visibleProduct('<p>Great <strong>guide</strong></p>');
        ActiveWorkspace::clearCache();

        $response = $this->get("/{$biolink->back_half}/products/{$product->id}?_escaped_fragment_=");

        $response->assertOk();
        $response->assertSee('content="Great guide"', false);
        $response->assertDontSee('&lt;p&gt;', false);
    }

    public function test_non_crawler_gets_spa_shell_not_prerender(): void
    {
        [$biolink, $product] = $this->visibleProduct();
        ActiveWorkspace::clearCache();

        $response = $this->get("/{$biolink->back_half}/products/{$product->id}");

        $response->assertOk();
        $response->assertSee('og:title', false);
        $response->assertDontSee('<h1>Test Guide</h1>', false);
    }

    public function test_draft_product_page_404s_for_crawlers(): void
    {
        [$biolink, $product] = $this->visibleProduct('<p>hi</p>', 'draft');
        ActiveWorkspace::clearCache();

        $this->get("/{$biolink->back_half}/products/{$product->id}?_escaped_fragment_=")->assertNotFound();
    }

    /**
     * Decode the first <script type="application/ld+json"> block of a response.
     *
     * @return mixed  whatever the JSON-LD block decodes to; callers assert on it.
     */
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
     * @return array{Biolink, DigitalProduct}
     */
    private function visibleProduct(string $description = '<p>hi</p>', string $status = 'approved'): array
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
            'title' => 'Test Guide',
            'description' => $description,
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => $status,
            'approved_at' => $status === 'approved' ? now() : null,
            'type' => 'digital',
        ]);

        $file = FileEntry::query()->create([
            'name' => 'download.pdf',
            'file_name' => Str::random(20),
            'file_size' => 1024,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);
        $product->biolinks()->attach($biolink->id);

        return [$biolink, $product];
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
