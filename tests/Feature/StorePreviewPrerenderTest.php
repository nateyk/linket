<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Models\User;
use Common\Core\Rendering\CrawlerDetector;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The store editor frames the public page with ?preview=1. A crawler user
 * agent on that URL must still get the SPA shell — the prerender exists for
 * search/social scrapers, not for the editor's own phone preview — while the
 * loader data stays byte-identical to a regular visit (A-20).
 */
class StorePreviewPrerenderTest extends TestCase
{
    use DatabaseTransactions;

    private const PREVIEW_MARKER = '<h1>Prerender Marker Store</h1>';

    private ?string $originalUserAgent = null;

    protected function tearDown(): void
    {
        if ($this->originalUserAgent !== null) {
            $_SERVER['HTTP_USER_AGENT'] = $this->originalUserAgent;
        } else {
            unset($_SERVER['HTTP_USER_AGENT']);
        }
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function test_crawler_without_preview_still_gets_the_prerendered_page(): void
    {
        $biolink = $this->previewBiolink();
        ActiveWorkspace::clearCache();

        $response = $this->withCrawlerAgent("/{$biolink->back_half}");

        $response->assertOk();
        $response->assertSee(self::PREVIEW_MARKER, false);
    }

    public function test_headless_chrome_with_preview_param_gets_the_spa_shell(): void
    {
        $biolink = $this->previewBiolink();
        ActiveWorkspace::clearCache();

        // HeadlessChrome matches CrawlerDetect's "headless" pattern, so
        // without the preview check this would (wrongly) serve the prerender.
        $response = $this->withCrawlerAgent("/{$biolink->back_half}?preview=1");

        $response->assertOk();
        $response->assertDontSee(self::PREVIEW_MARKER, false);
        $response->assertSee('window.bootstrapData', false);
    }

    public function test_preview_param_sends_the_same_loader_data_as_a_regular_visit(): void
    {
        $biolink = $this->previewBiolink();
        ActiveWorkspace::clearCache();

        // A regular browser visit: not a crawler, so this is the SPA shell
        // even before the fix.
        $normal = $this->withBrowserAgent("/{$biolink->back_half}")->assertOk();

        // Crawler UA + preview=1: must also be the SPA shell (red before the
        // fix), carrying exactly the same page data.
        $preview = $this->withCrawlerAgent("/{$biolink->back_half}?preview=1")->assertOk();
        $preview->assertDontSee(self::PREVIEW_MARKER, false);

        $this->assertSame(
            $this->bootstrapLoader($normal->getContent()),
            $this->bootstrapLoader($preview->getContent()),
            'preview=1 may change only the render strategy, never the data sent to the client.',
        );
    }

    private function previewBiolink(): Biolink
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);

        return Biolink::query()->create([
            'back_half' => Str::random(8),
            'name' => 'Prerender Marker Store',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);
    }

    /**
     * CrawlerDetect reads the PHP global, not the Symfony request bag, so a
     * crawler test must set both the request header and $_SERVER.
     */
    private function withCrawlerAgent(string $uri)
    {
        return $this->withUserAgent(
            $uri,
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        );
    }

    private function withBrowserAgent(string $uri)
    {
        return $this->withUserAgent(
            $uri,
            'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
        );
    }

    private function withUserAgent(string $uri, string $userAgent)
    {
        $this->originalUserAgent ??= $_SERVER['HTTP_USER_AGENT'] ?? null;
        $_SERVER['HTTP_USER_AGENT'] = $userAgent;

        // A test's requests share one container, so CrawlerDetector's
        // memoized result would leak from the previous request. Production
        // gives every request a fresh detector — reset only that singleton.
        $this->app->instance(CrawlerDetector::class, new CrawlerDetector());

        return $this->withHeader('User-Agent', $userAgent)->get($uri);
    }

    /**
     * The `loaders.linkeablePage` payload embedded as window.bootstrapData
     * in the SPA shell.
     */
    private function bootstrapLoader(string $html): mixed
    {
        $this->assertSame(
            1,
            preg_match('/window\.bootstrapData = (.*?);\s*<\/script>/s', $html, $matches),
            'Expected exactly one window.bootstrapData block in the SPA shell.',
        );

        $decoded = json_decode(trim($matches[1]), true);
        $this->assertSame(
            JSON_ERROR_NONE,
            json_last_error(),
            'window.bootstrapData must contain valid JSON: '.json_last_error_msg(),
        );

        return $decoded['loaders']['linkeablePage'] ?? null;
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
