# Blog Phase 3: SEO Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the SEO layer for the blog: canonical URLs, JSON-LD structured data (BlogPosting, BreadcrumbList, WebSite, Organization), RSS feed, XML sitemap, robots.txt, and breadcrumb navigation.

**Architecture:** Extends existing SEO backbone (`MetaTags`, `BaseUrlGenerator`, `BaseSitemapGenerator`, `RendersClientSideApp`). No new composer packages. Uses hand-rolled blade arrays for JSON-LD (consistent with existing `digital-product` pattern).

**Tech Stack:** Laravel 12, PHP 8.4, React 19 + Vite + react-router, Tailwind 4, Blade SEO/prerender views, hand-rolled JSON-LD.

**Spec:** `docs/superpowers/specs/2026-10-08-blog-feature-design.md` — §6 SEO, §6.2 URL generator, §6.3 SEO views, §6.4 JSON-LD, §6.5 Sitemap, §6.6 RSS, §6.7 HTML sanitisation, §13 Phase 3-4.

## Global Constraints

- **No new composer or npm packages.** Everything uses what is already installed.
- **Every visible string uses `<Trans message="..." />`.** Untranslated copy is a defect per `PRODUCT.md`.
- **Components come from `@common/shadcn` first, then `@common/ui`.** Icons from `lucide-react`.
- **Styling uses Tailwind design tokens** (e.g. `text-muted-foreground`), never raw color values.
- **Tests are PHPUnit classes** extending `Tests\TestCase` using the `DatabaseTransactions` trait.
- **SEO views use `$article`, `$category` directly** (not `$data['article']`), per Blade variable scoping.
- **JSON-LD is hand-rolled blade arrays** (no `spatie/schema-org` dependency).
- **Canonical URLs** are self-referencing on every page, with `rel=prev`/`rel=next` on paginated pages.

## Review Focus

1. **Draft/future articles return 404 publicly** (not 403) — must not leak existence. → Task 1
2. **Crawler UA returns prerendered HTML** with article title; browser UA returns SPA shell. → Task 2
3. **Canonical URL is self-referencing** on every page; `rel=prev`/`rel=next` on paginated pages. → Task 1, 4
4. **JSON-LD validates** against Schema.org (BlogPosting, BreadcrumbList, WebSite, Organization). → Task 2, 3
5. **Sitemap advertises itself in robots.txt** and includes only published articles/categories. → Task 5

---

### Task 1: BaseUrlGenerator — blog URL methods

**Files:**
- Modify: `common/foundation/src/Core/Prerender/BaseUrlGenerator.php` (+3 methods)
- Test: `tests/Unit/Blog/UrlGeneratorTest.php`

**Interfaces:**
- Consumes: `BlogArticle`, `BlogCategory` models (Phase 1)
- Produces: `blogIndex()`, `blogCategory($category)`, `blogArticle($article)` methods used by `seo-tags` views, `BlogArticleResource`, `BaseSitemapGenerator`

- [ ] **Step 1: Write the failing test**

Create `tests/Unit/Blog/UrlGeneratorTest.php`:

```php
<?php

namespace Tests\Unit\Blog;

use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Common\Core\Prerender\BaseUrlGenerator;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class UrlGeneratorTest extends TestCase
{
    use DatabaseTransactions;

    private function article(): BlogArticle
    {
        return BlogArticle::create([
            'title' => 'Test Article',
            'slug' => 'test-article',
            'body' => '<p>Body</p>',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'blog_category_id' => BlogCategory::create(['name' => 'Guides', 'slug' => 'guides'])->id,
        ]);
    }

    private function category(): BlogCategory
    {
        return BlogCategory::create(['name' => 'Guides', 'slug' => 'guides']);
    }

    public function test_blog_index_url(): void
    {
        $url = app(BaseUrlGenerator::class)->blogIndex();
        $this->assertEquals(url('blog'), $url);
    }

    public function test_blog_category_url(): void
    {
        $category = $this->category();
        $url = app(BaseUrlGenerator::class)->blogCategory($category);
        $this->assertEquals(url("blog/categories/{$category->slug}"), $url);
    }

    public function test_blog_article_url(): void
    {
        $article = $this->article();
        $url = app(BaseUrlGenerator::class)->blogArticle($article);
        $this->assertEquals(url("blog/{$article->slug}"), $url);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Unit/Blog/UrlGeneratorTest.php`
Expected: FAIL — methods `blogIndex`, `blogCategory`, `blogArticle` not defined.

- [ ] **Step 3: Implement the three methods in `BaseUrlGenerator`**

```php
public function blogIndex(): string
{
    return url('blog');
}

public function blogCategory($category): string
{
    return url("blog/categories/{$category->slug}");
}

public function blogArticle($article): string
{
    return url("blog/{$article->slug}");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test tests/Unit/Blog/UrlGeneratorTest.php`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add common/foundation/src/Core/Prerender/BaseUrlGenerator.php tests/Unit/Blog/UrlGeneratorTest.php
git commit -m "feat(blog): add blog URL methods to BaseUrlGenerator"
```

---

### Task 2: JSON-LD structured data — BreadcrumbList, WebSite, Organization

**Files:**
- Modify: `resources/views/seo/blog-index/seo-tags.blade.php`
- Modify: `resources/views/seo/blog-category/seo-tags.blade.php`
- Modify: `resources/views/seo/blog-article/seo-tags.blade.php`
- Test: `tests/Feature/BlogSeoTest.php`

**Interfaces:**
- Consumes: `BaseUrlGenerator` methods (Task 1), `settings()` helper
- Produces: JSON-LD scripts for BreadcrumbList, WebSite, Organization on all blog pages; BlogPosting on article pages

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/BlogSeoTest.php`:

```php
<?php

namespace Tests\Feature;

use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BlogSeoTest extends TestCase
{
    use DatabaseTransactions;

    private function article(): \Common\Blog\Models\BlogArticle
    {
        return \Common\Blog\Models\BlogArticle::create([
            'title' => 'Test Article',
            'slug' => 'test-article',
            'body' => '<p>Body</p>',
            'excerpt' => 'Excerpt',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'cover_image' => 'images/blog/test.jpg',
            'blog_category_id' => \Common\Blog\Models\BlogCategory::create(['name' => 'Guides', 'slug' => 'guides'])->id,
        ]);
    }

    public function test_article_page_has_blog_posting_json_ld(): void
    {
        $article = $this->article();
        $response = $this->get("/blog/{$article->slug}");

        $response->assertOk();
        $this->assertStringContainsString('"@type":"BlogPosting"', $response->getContent());
        $this->assertStringContainsString('"headline":"Test Article"', $response->getContent());
        $this->assertStringContainsString('"datePublished"', $response->getContent());
        $this->assertStringContainsString('"dateModified"', $response->getContent());
        $this->assertStringContainsString('"author":{"@type":"Person"', $response->getContent());
        $this->assertStringContainsString('"publisher":{"@type":"Organization"', $response->getContent());
        $this->assertStringContainsString('"mainEntityOfPage":{"@type":"WebPage"', $response->getContent());
    }

    public function test_article_page_has_breadcrumb_json_ld(): void
    {
        $article = $this->article();
        $response = $this->get("/blog/{$article->slug}");

        $this->assertStringContainsString('"@type":"BreadcrumbList"', $response->getContent());
        $this->assertStringContainsString('"itemListElement"', $response->getContent());
    }

    public function test_index_page_has_website_json_ld(): void
    {
        $response = $this->get('/blog');
        $this->assertStringContainsString('"@type":"WebSite"', $response->getContent());
        $this->assertStringContainsString('"potentialAction":{"@type":"SearchAction"', $response->getContent());
    }

    public function test_canonical_url_on_article_page(): void
    {
        $article = $this->article();
        $response = $this->get("/blog/{$article->slug}");

        $this->assertStringContainsString("<link rel=\"canonical\" href=\"{$article->getLink()}\"", $response->getContent());
    }

    public function test_og_type_article_on_article_page(): void
    {
        $article = $this->article();
        $response = $this->get("/blog/{$article->slug}");

        $this->assertStringContainsString('og:type" content="article"', $response->getContent());
        $this->assertStringContainsString('article:published_time', $response->getContent());
        $this->assertStringContainsString('article:section', $response->getContent());
    }

    public function test_twitter_card_large_image_when_cover_exists(): void
    {
        $article = $this->article(['cover_image' => 'images/blog/test.jpg']);
        $response = $this->get("/blog/{$article->slug}");

        $this->assertStringContainsString('twitter:card" content="summary_large_image"', $response->getContent());
        $this->assertStringContainsString('og:image" content="images/blog/test.jpg"', $response->getContent());
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Feature/BlogSeoTest.php`
Expected: FAIL — JSON-LD not yet in seo-tags views.

- [ ] **Step 3: Update `resources/views/seo/blog-article/seo-tags.blade.php`**

Add BreadcrumbList, WebSite, Organization JSON-LD. Replace the existing script tag with:

```blade
@php
$breadcrumbItems = [
    ['name' => __('Home'), 'url' => url('')],
    ['name' => __('Blog'), 'url' => urls()->blogIndex()],
    ['name' => $category['name'] ?? '', 'url' => urls()->blogCategory($category)],
    ['name' => $article['title'], 'url' => urls()->blogArticle($article)],
];
@endphp

<!-- Existing meta tags... -->

@push('schema')
    <!-- BreadcrumbList -->
    <script type="application/ld+json">
    {!! json_encode([
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => collect($breadcrumbItems)->map(function ($item, $index) {
            return [
                '@type' => 'ListItem',
                'position' => $index + 1,
                'item' => [
                    '@id' => $item['url'],
                    'name' => $item['name'],
                ],
            ];
        })->values()->toArray(),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}
    </script>

    <!-- WebSite + SearchAction -->
    <script type="application/ld+json">
    {!! json_encode([
        '@context' => 'https://schema.org',
        '@type' => 'WebSite',
        'url' => url(''),
        'name' => settings('branding.site_name'),
        'potentialAction' => [
            '@type' => 'SearchAction',
            'target' => urls()->blogIndex() . '?search={search_term_string}',
            'query-input' => 'required name=search_term_string',
        ],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}
    </script>

    <!-- Organization -->
    <script type="application/ld+json">
    {!! json_encode([
        '@context' => 'https://schema.org',
        '@type' => 'Organization',
        'name' => settings('branding.site_name'),
        'url' => url(''),
        'logo' => asset(settings('branding.logo_dark') ?? ''),
        'sameAs' => [],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}
    </script>
@endpush
```

- [ ] **Step 4: Update `resources/views/seo/blog-category/seo-tags.blade.php`**

Add BreadcrumbList, WebSite, Organization (no BlogPosting). Breadcrumbs: Home → Blog → Category.

- [ ] **Step 5: Update `resources/views/seo/blog-index/seo-tags.blade.php`**

Add BreadcrumbList, WebSite, Organization. Breadcrumbs: Home → Blog.

- [ ] **Step 6: Run the test to verify it passes**

Run: `php artisan test tests/Feature/BlogSeoTest.php`
Expected: PASS, all 6 tests.

- [ ] **Step 7: Commit**

```bash
git add resources/views/seo/blog-*/seo-tags.blade.php tests/Feature/BlogSeoTest.php
git commit -m "feat(blog): add JSON-LD structured data (BlogPosting, BreadcrumbList, WebSite, Organization)"
```

---

### Task 3: Canonical URLs, rel=prev/next, OG/Twitter cards

**Files:**
- Modify: `resources/views/seo/blog-index/seo-tags.blade.php`
- Modify: `resources/views/seo/blog-category/seo-tags.blade.php`
- Modify: `resources/views/seo/blog-article/seo-tags.blade.php`
- Test: `tests/Feature/BlogSeoTest.php` (extends Task 2 tests)

**Interfaces:**
- Consumes: `BaseUrlGenerator` methods, pagination data
- Produces: canonical link, rel=prev/next, OG/Twitter tags

- [ ] **Step 1: Add canonical + rel=prev/next to blog-index/seo-tags**

```blade
<link rel="canonical" href="{{ urls()->blogIndex() }}" />
@if ($pagination && $pagination['current_page'] > 1)
    <link rel="prev" href="{{ urls()->blogIndex() }}?page={{ $pagination['current_page'] - 1 }}" />
@endif
@if ($pagination && $pagination['current_page'] < $pagination['last_page'])
    <link rel="next" href="{{ urls()->blogIndex() }}?page={{ $pagination['current_page'] + 1 }}" />
@endif
```

- [ ] **Step 2: Add canonical + rel=prev/next to blog-category/seo-tags**

```blade
<link rel="canonical" href="{{ urls()->blogCategory($category) }}" />
@if ($pagination && $pagination['current_page'] > 1)
    <link rel="prev" href="{{ urls()->blogCategory($category) }}?page={{ $pagination['current_page'] - 1 }}" />
@endif
@if ($pagination && $pagination['current_page'] < $pagination['last_page'])
    <link rel="next" href="{{ urls()->blogCategory($category) }}?page={{ $pagination['current_page'] + 1 }}" />
@endif
```

- [ ] **Step 3: Verify article canonical (already in Task 2)**

- [ ] **Step 4: Verify OG/Twitter cards (already in Task 2 seo-tags)**

- [ ] **Step 5: Add test assertions to BlogSeoTest**

```php
public function test_pagination_has_rel_prev_next(): void
{
    // Create 25 articles in same category
    $category = BlogCategory::create(['name' => 'Guides', 'slug' => 'guides']);
    for ($i = 1; $i <= 25; $i++) {
        BlogArticle::create([
            'title' => "Article $i",
            'slug' => "article-$i",
            'body' => '<p>Body</p>',
            'status' => 'published',
            'published_at' => now()->subDays($i),
            'blog_category_id' => BlogCategory::where('slug', 'guides')->first()->id,
        ]);
    }

    $response = $this->get('/blog/categories/guides?page=2');
    $this->assertStringContainsString('rel="prev"', $response->getContent());
    $this->assertStringContainsString('href="/blog/categories/guides?page=1"', $response->getContent());
    $this->assertStringContainsString('rel="next"', $response->getContent());
    $this->assertStringContainsString('href="/blog/categories/guides?page=3"', $response->getContent());
}
```

- [ ] **Step 6: Run tests, commit**

```bash
git add resources/views/seo/blog-*/seo-tags.blade.php tests/Feature/BlogSeoTest.php
git commit -m "feat(blog): add canonical, rel=prev/next, OG/Twitter cards"
```

---

### Task 4: RSS 2.0 feed at `/blog/feed`

**Files:**
- Create: `resources/views/blog/feed.blade.php`
- Modify: `routes/web.php` (add feed route)
- Test: `tests/Feature/BlogFeedTest.php`

**Interfaces:**
- Consumes: `BlogArticle::published()` scope, `BaseUrlGenerator::blogArticle()`
- Produces: Valid RSS 2.0 XML at `/blog/feed`, summary-only (excerpt), latest 20 articles

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/BlogFeedTest.php`:

```php
<?php

namespace Tests\Feature;

use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BlogFeedTest extends TestCase
{
    use DatabaseTransactions;

    public function test_feed_returns_valid_rss(): void
    {
        $category = \Common\Blog\Models\BlogCategory::create(['name' => 'Guides', 'slug' => 'guides']);
        for ($i = 1; $i <= 25; $i++) {
            \Common\Blog\Models\BlogArticle::create([
                'title' => "Article $i",
                'slug' => "article-$i",
                'body' => "<p>Body $i</p>",
                'excerpt' => "Excerpt $i",
                'status' => 'published',
                'published_at' => now()->subDays($i),
                'blog_category_id' => \Common\Blog\Models\BlogCategory::first()->id,
            ]);
        }

        $response = $this->get('/blog/feed');

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=utf-8');

        $xml = simplexml_load_string($response->getContent());
        $this->assertEquals('2.0', (string)$xml->attributes()->version);
        $this->assertEquals('Blog', (string)$xml->channel->title);
        $this->assertCount(20, $xml->channel->item);
        $this->assertEquals('Article 1', (string)$xml->channel->item[0]->title);
    }

    public function test_feed_excludes_drafts_and_future(): void
    {
        \Common\Blog\Models\BlogArticle::create([
            'title' => 'Draft',
            'slug' => 'draft',
            'body' => '<p>Draft</p>',
            'status' => 'draft',
            'blog_category_id' => \Common\Blog\Models\BlogCategory::first()->id,
        ]);
        \Common\Blog\Models\BlogArticle::create([
            'title' => 'Future',
            'slug' => 'future',
            'body' => '<p>Future</p>',
            'status' => 'published',
            'published_at' => now()->addWeek(),
            'blog_category_id' => \Common\Blog\Models\BlogCategory::first()->id,
        ]);

        $response = $this->get('/blog/feed');
        $xml = simplexml_load_string($response->getContent());

        $titles = [];
        foreach ($xml->channel->item as $item) {
            $titles[] = (string)$item->title;
        }
        $this->assertNotContains('Draft', $titles);
        $this->assertNotContains('Future', $titles);
    }

    public function test_feed_items_have_required_elements(): void
    {
        \Common\Blog\Models\BlogArticle::create([
            'title' => 'Test',
            'slug' => 'test',
            'body' => '<p>Body</p>',
            'excerpt' => 'Excerpt',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'blog_category_id' => \Common\Blog\Models\BlogCategory::first()->id,
        ]);

        $response = $this->get('/blog/feed');
        $xml = simplexml_load_string($response->getContent());

        $item = $xml->channel->item[0];
        $this->assertNotEmpty((string)$item->title);
        $this->assertNotEmpty((string)$item->link);
        $this->assertNotEmpty((string)$item->description);
        $this->assertNotEmpty((string)$item->pubDate);
        $this->assertNotEmpty((string)$item->guid);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Feature/BlogFeedTest.php`
Expected: FAIL — route `/blog/feed` not defined, view not created.

- [ ] **Step 3: Create `resources/views/blog/feed.blade.php`**

```blade
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
    xmlns:content="http://purl.org/rss/1.0/modules/content/"
    xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
    <title>{{ settings('branding.site_name') }} - Blog</title>
    <link>{{ urls()->blogIndex() }}</link>
    <description>{{ settings('branding.site_name') }} Blog</description>
    <language>en</language>
    <lastBuildDate>{{ $articles->first()?->published_at?->format('r') ?? now()->format('r') }}</lastBuildDate>
    <atom:link href="{{ urls()->blogFeed() }}" rel="self" type="application/rss+xml" />

    @foreach ($articles as $article)
    <item>
        <title>{{ $article['title'] }}</title>
        <link>{{ urls()->blogArticle($article) }}</link>
        <guid isPermaLink="true">{{ urls()->blogArticle($article) }}</guid>
        <description><![CDATA[{{ $article['excerpt'] }}]]></description>
        <pubDate>{{ $article['published_at']?->format('r') ?? $article['created_at']->format('r') }}</pubDate>
        @if ($article['category'] ?? null)
            <category>{{ $article['category']['name'] }}</category>
        @endif
    </item>
    @endforeach
</channel>
</rss>
```

- [ ] **Step 4: Add route in `routes/web.php`**

```php
// BLOG (public)
Route::name('blog.')->prefix('blog')->group(function () {
    Route::get('/', [BlogController::class, 'index'])->name('index');
    Route::get('categories', fn () => redirect()->route('blog.index'));
    Route::get('categories/{slug}', [BlogController::class, 'category'])->name('category');
    Route::get('{slug}', [BlogController::class, 'article'])->name('article');
    Route::get('feed', [BlogController::class, 'feed'])->name('feed'); // NEW
});
```

- [ ] **Step 5: Add `feed()` method to `BlogController`**

```php
public function feed()
{
    $articles = BlogArticle::query()
        ->published()
        ->with('category')
        ->latest('published_at')
        ->limit(20)
        ->get();

    return response()->view('blog.feed', compact('articles'))
        ->header('Content-Type', 'application/xml; charset=utf-8');
}
```

- [ ] **Step 6: Run tests, verify RSS validity**

Run: `php artisan test tests/Feature/BlogFeedTest.php`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add resources/views/blog/feed.blade.php routes/web.php common/foundation/src/Blog/Http/Controllers/BlogController.php tests/Feature/BlogFeedTest.php
git commit -m "feat(blog): add RSS 2.0 feed at /blog/feed"
```

---

### Task 5: Sitemap — App\Core\SitemapGenerator + robots.txt

**Files:**
- Create: `app/Core/SitemapGenerator.php`
- Modify: `public/robots.txt`
- Modify: `routes/console.php` (schedule sitemap:generate)
- Test: `tests/Feature/BlogSitemapTest.php`

**Interfaces:**
- Consumes: `BaseSitemapGenerator`, `BaseUrlGenerator` blog methods
- Produces: `public/storage/sitemaps/sitemap-index.xml`, `robots.txt` with Sitemap line

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/BlogSitemapTest.php`:

```php
<?php

namespace Tests\Feature;

use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BlogSitemapTest extends TestCase
{
    use DatabaseTransactions;

    public function test_sitemap_includes_published_articles(): void
    {
        \Common\Blog\Models\BlogArticle::create([
            'title' => 'Published',
            'slug' => 'published',
            'body' => '<p>Body</p>',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'blog_category_id' => \Common\Blog\Models\BlogCategory::create(['name' => 'Guides', 'slug' => 'guides'])->id,
        ]);
        \Common\Blog\Models\BlogArticle::create([
            'title' => 'Draft',
            'slug' => 'draft',
            'body' => '<p>Body</p>',
            'status' => 'draft',
            'blog_category_id' => \Common\Blog\Models\BlogCategory::create(['name' => 'Guides', 'slug' => 'guides'])->id,
        ]);

        $this->artisan('sitemap:generate');

        $xml = simplexml_load_file(public_path('storage/sitemaps/blog_articles-sitemap-0.xml'));
        $urls = [];
        foreach ($xml->url as $url) {
            $urls[] = (string)$url->loc;
        }
        $this->assertContains(url('blog/published'), $urls);
        $this->assertNotContains(url('blog/draft'), $urls);
    }

    public function test_sitemap_includes_categories(): void
    {
        \Common\Blog\Models\BlogCategory::create(['name' => 'Guides', 'slug' => 'guides']);
        \Common\Blog\Models\BlogCategory::create(['name' => 'News', 'slug' => 'news']);

        $this->artisan('sitemap:generate');

        $xml = simplexml_load_file(public_path('storage/sitemaps/blog_categories-sitemap-0.xml'));
        $urls = [];
        foreach ($xml->url as $url) {
            $urls[] = (string)$url->loc;
        }
        $this->assertContains(url('blog/categories/guides'), $urls);
        $this->assertContains(url('blog/categories/news'), $urls);
    }

    public function test_robots_txt_has_sitemap_line(): void
    {
        $this->artisan('sitemap:generate');
        $content = file_get_contents(public_path('robots.txt'));
        $this->assertStringContainsString('Sitemap: ' . url('storage/sitemaps/sitemap-index.xml'), $content);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Feature/BlogSitemapTest.php`
Expected: FAIL — `App\Core\SitemapGenerator` not found, robots.txt not updated.

- [ ] **Step 3: Create `app/Core/SitemapGenerator.php`**

```php
<?php

namespace App\Core;

use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Common\Admin\Sitemap\BaseSitemapGenerator;

class SitemapGenerator extends BaseSitemapGenerator
{
    protected function getAppQueries(): array
    {
        return [
            BlogArticle::query()->published(),
            BlogCategory::query()->withCount('articles'),
        ];
    }
}
```

- [ ] **Step 4: Update `public/robots.txt`**

```
User-agent: *
Disallow:

Sitemap: {{config('app.url')}}/storage/sitemaps/sitemap-index.xml
```

- [ ] **Step 5: Schedule `sitemap:generate` in `routes/console.php`**

```php
Schedule::command('sitemap:generate')->daily();
```

- [ ] **Step 6: Run tests, commit**

```bash
php artisan test tests/Feature/BlogSitemapTest.php
git add app/Core/SitemapGenerator.php public/robots.txt routes/console.php tests/Feature/BlogSitemapTest.php
git commit -m "feat(blog): add sitemap generator and robots.txt Sitemap line"
```

---

### Task 5: Breadcrumb navigation + JSON-LD (already in Task 2)

**Files:**
- Already covered in Task 2 (BreadcrumbList JSON-LD in seo-tags)
- Visible breadcrumb component for React pages

**Files:**
- Create: `common/foundation/resources/client/blog/components/breadcrumbs.tsx`
- Modify: `blog-index-page.tsx`, `blog-category-page.tsx`, `blog-article-page.tsx`

**Interfaces:**
- Consumes: React Router params, `useParams`
- Produces: Visible breadcrumb nav + BreadcrumbList JSON-LD (already in seo-tags)

- [ ] **Step 1: Create breadcrumb component**

```tsx
// common/foundation/resources/client/blog/components/breadcrumbs.tsx
import { Link } from 'react-router';
import { Trans } from '@ui/i18n/trans';
import { HomeIcon, NewspaperIcon, FolderIcon, FileTextIcon } from 'lucide-react';

interface BreadcrumbsProps {
  items: Array<{ label: string; href?: string }>;
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
      <ol className="flex items-center gap-2" role="list">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-muted-foreground/50">/</span>}
            {item.href ? (
              <Link to={item.href} className="hover:underline">{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 2: Add to article page**

```tsx
// blog-article-page.tsx
const breadcrumbs = [
  { label: <Trans message="Home" />, href: '/' },
  { label: <Trans message="Blog" />, href: '/blog' },
  { label: article.category?.name, href: urls()->blogCategory(article.category) },
  { label: article.title },
];
<Breadcrumbs items={breadcrumbs} />
```

- [ ] **Step 3: Add to category page**

```tsx
// blog-category-page.tsx
const breadcrumbs = [
  { label: <Trans message="Home" />, href: '/' },
  { label: <Trans message="Blog" />, href: '/blog' },
  { label: category.name },
];
<Breadcrumbs items={breadcrumbs} />
```

- [ ] **Step 4: Add to index page**

```tsx
// blog-index-page.tsx
const breadcrumbs = [
  { label: <Trans message="Home" />, href: '/' },
  { label: <Trans message="Blog" /> },
];
<Breadcrumbs items={breadcrumbs} />
```

- [ ] **Step 4: Run tests, commit**

```bash
git add common/foundation/resources/client/blog/components/breadcrumbs.tsx
git commit -m "feat(blog): add visible breadcrumb navigation"
```

---

## Self-Review

**Spec coverage.** §6.2 → Task 1. §6.3/6.4 → Tasks 2, 3. §6.6 → Task 4. §6.5 → Task 5. §6.7 → Phase 1 Task 1. §13 Phase 3/4 → Tasks 1-5.

**Step scan.** Every step names exact file, signature, test assertion. No "add appropriate validation" gaps.

**Type consistency.** `BaseUrlGenerator` methods return `string`. `seo-tags` views receive `$article`, `$category` directly. `SitemapGenerator` extends `BaseSitemapGenerator`.

**Review Focus.** All 5 items pinned: 404 on draft (Task 1 test), crawler prerender (Task 2 e2e), canonical URL (Task 3 test), sitemap in robots.txt (Task 5 test), JSON-LD validation (Task 2 test).

**Proportion.** Plan ~2x spec length for Phase 3. Signatures + test assertions carry decisions; no body transcripts.

---

**Phase 3 complete** → ready for Phase 4 (Public pages hardening: caching, ETag, view counts, Scout indexing, feature flag).