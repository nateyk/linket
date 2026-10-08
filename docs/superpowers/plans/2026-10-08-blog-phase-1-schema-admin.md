# Blog — Phase 1: Schema, Models, Admin CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `blog_categories` and `blog_articles` tables with `BlogArticle`/`BlogCategory` models, a working admin CRUD UI, and the comment permissions that the existing `Common\Comments` policy requires.

**Architecture:** Backend in `common/foundation/src/Blog/` (mirroring `Common\Help/`). Admin UI in `common/foundation/resources/client/admin/blog/` following the existing `admin/custom-pages/` datatable + form-dialog pattern. No public routes yet — this phase is invisible to visitors.

**Tech Stack:** Laravel 12, PHP 8.4, Pest 3 (PHPUnit class style with `DatabaseTransactions`), React 19 + Vite, react-query, TanStack Table, TipTap editor (`@common/article-editor/`), Tailwind 4 design tokens, shadcn/Base UI components.

**Spec:** `docs/superpowers/specs/2026-10-08-blog-feature-design.md` — §4 Architecture, §5 Data model, §7 Comments, §8 Admin, §14 Files.

## Global Constraints

- **No new composer or npm packages.** Everything uses what is already installed.
- **Every visible string uses `<Trans message="..." />`.** Untranslated copy is a defect per `PRODUCT.md`.
- **Components come from `@common/shadcn` first, then `@common/ui`.** Icons from `lucide-react`.
- **Styling uses Tailwind design tokens** (e.g. `text-muted-foreground`), never raw color values.
- **Admin authorization uses `Gate::authorize('admin.access')`** — the convention in `Common\Help\Http\Controllers\AdminHelpArticleController`. Do **not** invent `admin/blog.*` permissions.
- **Tests are PHPUnit classes** extending `Tests\TestCase` using the `DatabaseTransactions` trait, in `tests/Unit/<Area>/` or `tests/Feature/`. Not Pest `test()` functions.
- **Slug is generated once on create and never auto-regenerated on title edit.** Retitling must not change a URL.
- **`body` is sanitised server-side with `ezyang/htmlpurifier`** (already installed) on write.
- **Never modify `Common\Comments`, `comments` table, `BaseSitemapGenerator`, `MetaTags`, or `help_*` tables** in this phase.
- Admin API routes live in `routes/api.php` inside the `v1` group under the `optionalAuth:sanctum` + `verified` + `verifyApiAccess` middleware block, named `blog.` — mirroring the existing help block's placement.

## Review Focus

These are input classes the spec implies that no stated requirement covers. Each gets a test in the task that owns the code.

1. **A title that transliterates to an empty slug** (e.g. an emoji-only or CJK-only title) must still produce a usable, unique slug — never an empty string or a duplicate. → Task 2
2. **`body` containing `<script>`, `onerror=`, or `javascript:` URLs** must be stripped server-side on save, not merely hidden client-side. → Task 1
3. **An article whose `body_text` is empty** must store `reading_time_minutes` of at least 1, never 0 or null, so the UI never renders "0 min read". → Task 1
4. **A regular user (not holding `admin`)** must be able to create a comment once the permissions land — this is the whole point of Task 5 and it silently fails if the permission is added to config but not to the default `Users` role. → Task 5
5. **Deleting a category that still has articles** must cascade-delete them (the FK says `cascadeOnDelete`) and the admin UI must warn first, so an admin cannot silently destroy published articles. → Task 4

---

### Task 1: Blog tables and sanitisation

**Files:**
- Create: `database/migrations/2026_10_08_000003_create_blog_categories_table.php`
- Create: `database/migrations/2026_10_08_000004_create_blog_articles_table.php`
- Create: `common/foundation/src/Blog/Actions/SanitizeBlogHtml.php`
- Test: `tests/Unit/Blog/SanitizeBlogHtmlTest.php`
- Test: `tests/Unit/Blog/BlogArticleModelTest.php`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `Common\Blog\Actions\SanitizeBlogHtml::execute(?string $html): string` — strips unsafe markup, returns safe HTML string.
  - Tables `blog_categories`, `blog_articles` with the columns in spec §5.1/§5.2.

- [ ] **Step 1: Write the failing sanitisation test**

Create `tests/Unit/Blog/SanitizeBlogHtmlTest.php`:

```php
<?php

namespace Tests\Unit\Blog;

use Common\Blog\Actions\SanitizeBlogHtml;
use Tests\TestCase;

class SanitizeBlogHtmlTest extends TestCase
{
    public function test_script_tags_are_stripped(): void
    {
        $result = app(SanitizeBlogHtml::class)->execute(
            '<p>Hello</p><script>alert(1)</script>'
        );

        $this->assertStringContainsString('<p>Hello</p>', $result);
        $this->assertStringNotContainsString('<script', $result);
        $this->assertStringNotContainsString('alert(1)', $result);
    }

    public function test_event_handler_attributes_are_stripped(): void
    {
        $result = app(SanitizeBlogHtml::class)->execute(
            '<p onclick="steal()">Text</p><img src="x" onerror="steal()">'
        );

        $this->assertStringNotContainsString('onclick', $result);
        $this->assertStringNotContainsString('onerror', $result);
    }

    public function test_javascript_urls_are_stripped(): void
    {
        $result = app(SanitizeBlogHtml::class)->execute(
            '<a href="javascript:alert(1)">click</a>'
        );

        $this->assertStringNotContainsString('javascript:', $result);
    }

    public function test_safe_formatting_is_preserved(): void
    {
        $html = '<h2>Title</h2><p><strong>Bold</strong> and <em>italic</em></p><ul><li>item</li></ul>';

        $this->assertSame($html, app(SanitizeBlogHtml::class)->execute($html));
    }

    public function test_null_input_returns_empty_string(): void
    {
        $this->assertSame('', app(SanitizeBlogHtml::class)->execute(null));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Unit/Blog/SanitizeBlogHtmlTest.php`
Expected: FAIL — class `Common\Blog\Actions\SanitizeBlogHtml` not found.

- [ ] **Step 3: Implement `SanitizeBlogHtml` in `common/foundation/src/Blog/Actions/SanitizeBlogHtml.php`**

Use `ezyang/htmlpurifier`. Configure with `HTML.Allowed` covering the TipTap output set: `p,br,strong,em,u,s,h1,h2,h3,h4,blockquote,ul,ol,li,a[href|title|target|rel],img[src|alt|title|width|height],code,pre,hr,table,thead,tbody,tr,th,td,sub,sup`. Set `URI.AllowedSchemes` to `http,https,mailto,tel` so `javascript:` cannot survive, and `HTML.TargetBlank`/`Attr.AllowedFrameTargets` so `target="_blank"` links get `rel="noopener"`.

Cache the purifier instance in a private property — building one is expensive and this runs on every article save.

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test tests/Unit/Blog/SanitizeBlogHtmlTest.php`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the failing migration/model test**

Create `tests/Unit/Blog/BlogArticleModelTest.php`:

```php
<?php

namespace Tests\Unit\Blog;

use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BlogArticleModelTest extends TestCase
{
    use DatabaseTransactions;

    private function category(): BlogCategory
    {
        return BlogCategory::create(['name' => 'Guides']);
    }

    private function article(array $overrides = []): BlogArticle
    {
        return BlogArticle::create(array_merge([
            'title' => 'How to start',
            'body' => '<p>Body</p>',
            'blog_category_id' => $this->category()->id,
        ], $overrides));
    }

    public function test_reading_time_is_computed_from_body_text(): void
    {
        $words = implode(' ', array_fill(0, 400, 'word'));
        $article = $this->article(['body' => "<p>{$words}</p>"]);

        $this->assertSame(2, $article->fresh()->reading_time_minutes);
    }

    public function test_reading_time_is_never_zero_for_empty_body(): void
    {
        $article = $this->article(['body' => '']);

        $this->assertSame(1, $article->fresh()->reading_time_minutes);
    }

    public function test_body_text_is_stripped_of_markup(): void
    {
        $article = $this->article(['body' => '<h2>Hi</h2><p>There</p>']);

        $this->assertSame('Hi There', trim($article->fresh()->body_text));
    }

    public function test_body_is_sanitised_on_save(): void
    {
        $article = $this->article(['body' => '<p>ok</p><script>alert(1)</script>']);

        $this->assertStringNotContainsString('<script', $article->fresh()->body);
    }

    public function test_published_scope_excludes_drafts(): void
    {
        $draft = $this->article(['status' => 'draft']);

        $this->assertFalse(BlogArticle::published()->get()->contains($draft));
    }

    public function test_published_scope_excludes_future_articles(): void
    {
        $future = $this->article([
            'status' => 'published',
            'published_at' => now()->addWeek(),
        ]);

        $this->assertFalse(BlogArticle::published()->get()->contains($future));
    }

    public function test_published_scope_includes_published_articles(): void
    {
        $live = $this->article([
            'status' => 'published',
            'published_at' => now()->subDay(),
        ]);

        $this->assertTrue(BlogArticle::published()->get()->contains($live));
    }

    public function test_deleting_a_category_cascades_to_its_articles(): void
    {
        $category = $this->category();
        $article = BlogArticle::create([
            'title' => 'Doomed',
            'body' => '<p>x</p>',
            'blog_category_id' => $category->id,
        ]);

        $category->delete();

        $this->assertNull(BlogArticle::find($article->id));
    }
}
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `php artisan test tests/Unit/Blog/BlogArticleModelTest.php`
Expected: FAIL — class `Common\Blog\Models\BlogArticle` not found.

- [ ] **Step 7: Write the two migrations**

`database/migrations/2026_10_08_000003_create_blog_categories_table.php` — anonymous class migration returning `new class extends Migration`, matching the style of `2026_10_08_000001_create_help_categories_table.php`. Columns per spec §5.1: `id()`, `name` string, `slug` string unique, `description` text nullable, `views` unsignedBigInteger default 0, `sort_id` bigInteger default 0, `timestamps()`. `down()` drops `blog_categories`.

`database/migrations/2026_10_08_000004_create_blog_articles_table.php` — columns per spec §5.2: `id()`, `blog_category_id` foreignId constrained to `blog_categories` with `cascadeOnDelete()`, `author_id` foreignId nullable constrained to `users` with `nullOnDelete()`, `title` string, `slug` string unique, `excerpt` text nullable, `body` longText, `body_text` longText nullable, `cover_image` string nullable, `meta_title` string nullable, `meta_description` string nullable, `status` enum with values `draft`/`published` default `draft`, `published_at` timestamp nullable, `reading_time_minutes` unsignedSmallInteger default 1, `views` unsignedBigInteger default 0, `timestamps()`.

Add `$table->index(['status', 'published_at'])`.

- [ ] **Step 8: Implement `BlogCategory` in `common/foundation/src/Blog/Models/BlogCategory.php`**

`class BlogCategory extends Model` with `$fillable = ['name', 'slug', 'description', 'views', 'sort_id']`, `const MODEL_TYPE = 'blogCategory'`, `articles(): HasMany` returning `$this->hasMany(BlogArticle::class, 'blog_category_id')`.

Slug generation on `creating` only (Task 2 supplies the transliterating trait).

- [ ] **Step 9: Implement `BlogArticle` in `common/foundation/src/Blog/Models/BlogArticle.php`**

`class BlogArticle extends Model` with `$fillable` covering every column in §5.2 except `views` and `reading_time_minutes` (derived).

A `static::saving` hook that, when `body` is dirty:

```php
$safe = app(SanitizeBlogHtml::class)->execute($article->body);
$article->body = $safe;
$article->body_text = trim(preg_replace('/\s+/', ' ', strip_tags($safe)));
$article->reading_time_minutes = max(1, (int) ceil(str_word_count($article->body_text) / 200));
```

`str_word_count` on whitespace-collapsed plain text gives 400 words → 2 minutes at 200 wpm, which is what the test asserts.

Add `const MODEL_TYPE = 'blogArticle'`, `category(): BelongsTo`, `author(): BelongsTo` to `App\Models\User` via `author_id`, `comments()` is **not** added here — the shared polymorphic `comments` table handles it in Phase 2 via the morph map.

Add `scopePublished(Builder $q): Builder` filtering `status = 'published'` and `published_at <= now()`.

Add `use Searchable` and a `toSearchableArray()` returning `id`, `title`, `excerpt`, `body_text` — **not** `body`, per spec §10 (indexing markup pollutes relevance).

- [ ] **Step 10: Run the migrations and verify tests pass**

Run: `php artisan migrate` then `php artisan test tests/Unit/Blog/`
Expected: PASS, all tests including the 5 sanitisation and 8 model tests.

Note: the DB must be reachable. If `php artisan migrate` fails with `getaddrinfo for db failed`, the docker/ddev service is not running — start it and retry rather than working around it.

- [ ] **Step 11: Commit**

```bash
git add database/migrations/2026_10_08_000003_create_blog_categories_table.php \
        database/migrations/2026_10_08_000004_create_blog_articles_table.php \
        common/foundation/src/Blog/ \
        tests/Unit/Blog/
git commit -m "feat(blog): add blog tables, models, and html sanitisation"
```

---

### Task 2: Transliterating slug generation

**Files:**
- Create: `common/foundation/src/Blog/Models/Concerns/GeneratesBlogSlugs.php`
- Test: `tests/Unit/Blog/BlogSlugTest.php`

**Interfaces:**
- Consumes: `BlogArticle`, `BlogCategory` from Task 1.
- Produces: trait `Common\Blog\Models\Concerns\GeneratesBlogSlugs` with `static function generateUniqueBlogSlug(string $source, string $column, ?int $ignoreId = null): string` and `static function transliterate(string $value): string`.

- [ ] **Step 1: Write the failing test**

Create `tests/Unit/Blog/BlogSlugTest.php`:

```php
<?php

namespace Tests\Unit\Blog;

use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BlogSlugTest extends TestCase
{
    use DatabaseTransactions;

    public function test_duplicate_titles_produce_unique_slugs(): void
    {
        $category = BlogCategory::create(['name' => 'Guides']);

        $a = BlogArticle::create(['title' => 'How to start', 'body' => '<p>x</p>', 'blog_category_id' => $category->id]);
        $b = BlogArticle::create(['title' => 'How to start', 'body' => '<p>x</p>', 'blog_category_id' => $category->id]);

        $this->assertSame('how-to-start', $a->slug);
        $this->assertNotEquals($a->slug, $b->slug);
    }

    public function test_duplicate_category_names_produce_unique_slugs(): void
    {
        $a = BlogCategory::create(['name' => 'Getting Started']);
        $b = BlogCategory::create(['name' => 'Getting Started']);

        $this->assertSame('getting-started', $a->slug);
        $this->assertNotEquals($a->slug, $b->slug);
    }

    public function test_umlauts_are_transliterated(): void
    {
        $article = BlogArticle::create([
            'title' => 'Größe und Maß',
            'body' => '<p>x</p>',
            'blog_category_id' => BlogCategory::create(['name' => 'General'])->id,
        ]);

        $this->assertSame('groesse-und-mass', $article->slug);
    }

    public function test_sharp_s_becomes_ss(): void
    {
        $article = BlogArticle::create([
            'title' => 'Straße',
            'body' => '<p>x</p>',
            'blog_category_id' => BlogCategory::create(['name' => 'General'])->id,
        ]);

        $this->assertSame('strasse', $article->slug);
    }

    public function test_non_latin_title_still_produces_a_usable_slug(): void
    {
        $article = BlogArticle::create([
            'title' => '日本語',
            'body' => '<p>x</p>',
            'blog_category_id' => BlogCategory::create(['name' => 'General'])->id,
        ]);

        $this->assertNotSame('', $article->slug);
        $this->assertMatchesRegularExpression('/^[a-z0-9-]+$/', $article->slug);
    }

    public function test_emoji_only_title_still_produces_a_usable_slug(): void
    {
        $article = BlogArticle::create([
            'title' => '🎉🎉🎉',
            'body' => '<p>x</p>',
            'blog_category_id' => BlogCategory::create(['name' => 'General'])->id,
        ]);

        $this->assertNotSame('', $article->slug);
    }

    public function test_slug_survives_a_title_edit(): void
    {
        $article = BlogArticle::create([
            'title' => 'Original title',
            'body' => '<p>x</p>',
            'blog_category_id' => BlogCategory::create(['name' => 'General'])->id,
        ]);
        $original = $article->slug;

        $article->update(['title' => 'Completely different title']);

        $this->assertSame($original, $article->fresh()->slug);
    }

    public function test_explicit_slug_is_respected(): void
    {
        $article = BlogArticle::create([
            'title' => 'Anything',
            'slug' => 'my-custom-slug',
            'body' => '<p>x</p>',
            'blog_category_id' => BlogCategory::create(['name' => 'General'])->id,
        ]);

        $this->assertSame('my-custom-slug', $article->slug);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Unit/Blog/BlogSlugTest.php`
Expected: FAIL — the umlaut, ß, CJK, and emoji cases fail, because bare `Str::slug` drops those characters and the current model has no transliteration.

- [ ] **Step 3: Implement the trait in `common/foundation/src/Blog/Models/Concerns/GeneratesBlogSlugs.php`**

`transliterate(string $value): string` — apply a `strtr`-style character map **before** `Str::slug`, porting the marketbob reference's `App\Methods\SlugTranslation` table: `ä→ae, ö→oe, ü→ue, Ä→Ae, Ö→Oe, Ü→Ue, ß→ss, ẞ→SS, æ→ae, Æ→AE, œ→oe, Œ→OE, ø→o, Ø→O, å→a, Å→A, đ→d, Đ→D, ł→l, Ł→L, þ→th, Þ→Th, ð→d, Ð→D, İ→i, ı→i, Ő→o, ő→o, Ű→u, ű→u`. Then `mb_strtolower`, then `Str::slug($value, '-')`.

`generateUniqueBlogSlug(string $source, string $column, ?int $ignoreId = null): string` — slug `$source`, and **if the result is empty, fall back to `'article-' . substr(md5($source . microtime()), 0, 8)`** so CJK and emoji titles still get a stable unique slug (this is what Review Focus item 1 pins). Then append `-2`, `-3`, … while a row exists with that slug, excluding `$ignoreId`.

- [ ] **Step 4: Wire the trait into both models' `creating` hooks only**

In `BlogArticle::booted()` and `BlogCategory::booted()`, add `static::creating(...)` that sets `slug` from `title`/`name` when empty. Add the trait to both models. **Do not add an `updating` hook** — spec §5.3 forbids auto-regenerating the slug on title edit, and the test pins that.

- [ ] **Step 5: Run the test to verify it passes**

Run: `php artisan test tests/Unit/Blog/BlogSlugTest.php`
Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add common/foundation/src/Blog/Models/Concerns/GeneratesBlogSlugs.php \
        common/foundation/src/Blog/Models/ tests/Unit/Blog/BlogSlugTest.php
git commit -m "feat(blog): add transliterating slug generation"
```

---

### Task 3: Admin article and category API

**Files:**
- Create: `common/foundation/src/Blog/Http/Controllers/AdminBlogArticleController.php`
- Create: `common/foundation/src/Blog/Http/Controllers/AdminBlogCategoryController.php`
- Create: `common/foundation/src/Blog/Http/Resources/BlogArticleResource.php`
- Create: `common/foundation/src/Blog/Http/Resources/BlogCategoryResource.php`
- Create: `common/foundation/src/Blog/Http/Requests/StoreBlogArticleRequest.php`
- Create: `common/foundation/src/Blog/Http/Requests/UpdateBlogArticleRequest.php`
- Create: `common/foundation/src/Blog/Http/Requests/StoreBlogCategoryRequest.php`
- Modify: `routes/api.php` — add the `blog` admin group inside the authenticated middleware block
- Test: `tests/Feature/AdminBlogArticleApiTest.php`
- Test: `tests/Feature/AdminBlogCategoryApiTest.php`

**Interfaces:**
- Consumes: `BlogArticle`, `BlogCategory` (Task 1).
- Produces, all under route name prefix `blog.`:
  - `GET /api/v1/blog/admin/articles` — `index`, paginated, accepts `search`, `status`, `category` filters.
  - `POST /api/v1/blog/admin/articles` — `store`.
  - `GET /api/v1/blog/admin/articles/{id}` — `show`.
  - `PUT /api/v1/blog/admin/articles/{id}` — `update`.
  - `DELETE /api/v1/blog/admin/articles/{id}` — `destroy`.
  - `POST /api/v1/blog/admin/articles/sort` — reserved, not built this phase.
  - `GET/POST/PUT/DELETE /api/v1/blog/admin/categories[...]` — `index`, `store`, `update`, `destroy`.
  - `BlogArticleResource::toArray()` returns keys `id`, `title`, `slug`, `excerpt`, `body`, `cover_image`, `meta_title`, `meta_description`, `status`, `published_at` (ISO-8601 or null), `reading_time_minutes`, `views`, `blog_category_id`, `category` (`{id, name, slug}`), `author` (`{id, name}` or null), `created_at`, `updated_at`.
  - `BlogCategoryResource::toArray()` returns `id`, `name`, `slug`, `description`, `views`, `sort_id`, `articles_count`.

- [ ] **Step 1: Write the failing article API test**

Create `tests/Feature/AdminBlogArticleApiTest.php`, modelled on `tests/Feature/AdminProductReviewsTest.php`. It needs a `stateful()` helper returning `$this->withSession(['_token' => 'test-csrf-token'])->withHeader('Referer', config('app.url'))->withHeader('X-CSRF-TOKEN', 'test-csrf-token')`, and a `createAdmin(): User` helper that `forceCreate`s a user with `email_verified_at => now()` and attaches the `admin` and `admin.access` permissions.

Tests:

```php
public function test_guests_cannot_list_articles(): void
{
    $this->getJson('/api/v1/blog/admin/articles')->assertForbidden();
}

public function test_non_admin_cannot_list_articles(): void
{
    $this->actingAs($this->createUser())->getJson('/api/v1/blog/admin/articles')->assertForbidden();
}

public function test_admin_can_create_an_article(): void
{
    $category = BlogCategory::create(['name' => 'Guides']);

    $response = $this->actingAs($this->createAdmin())
        ->postJson('/api/v1/blog/admin/articles', [
            'title' => 'First post',
            'body' => '<p>Hello</p>',
            'blog_category_id' => $category->id,
        ]);

    $response->assertCreated()
        ->assertJsonPath('article.title', 'First post')
        ->assertJsonPath('article.status', 'draft');
}

public function test_creating_an_article_sanitises_the_body(): void
{
    $category = BlogCategory::create(['name' => 'Guides']);

    $response = $this->actingAs($this->createAdmin())
        ->postJson('/api/v1/blog/admin/articles', [
            'title' => 'XSS',
            'body' => '<p>ok</p><script>alert(1)</script>',
            'blog_category_id' => $category->id,
        ]);

    $this->assertStringNotContainsString('<script', $response->json('article.body'));
}

public function test_publishing_requires_a_valid_date(): void
{
    $category = BlogCategory::create(['name' => 'Guides']);

    $this->actingAs($this->createAdmin())
        ->postJson('/api/v1/blog/admin/articles', [
            'title' => 'Bad date',
            'body' => '<p>x</p>',
            'blog_category_id' => $category->id,
            'status' => 'published',
            'published_at' => 'not-a-date',
        ])
        ->assertJsonValidationErrors('published_at');
}

public function test_creating_an_article_requires_a_real_category(): void
{
    $this->actingAs($this->createAdmin())
        ->postJson('/api/v1/blog/admin/articles', [
            'title' => 'Orphan',
            'body' => '<p>x</p>',
            'blog_category_id' => 999999,
        ])
        ->assertJsonValidationErrors('blog_category_id');
}

public function test_admin_can_update_an_article(): void
{
    $article = $this->createArticle();

    $this->actingAs($this->createAdmin())
        ->putJson("/api/v1/blog/admin/articles/{$article->id}", [
            'title' => 'Updated title',
        ])
        ->assertOk()
        ->assertJsonPath('article.title', 'Updated title');
}

public function test_admin_can_delete_an_article(): void
{
    $article = $this->createArticle();

    $this->actingAs($this->createAdmin())
        ->deleteJson("/api/v1/blog/admin/articles/{$article->id}")
        ->assertNoContent();

    $this->assertNull(BlogArticle::find($article->id));
}

public function test_index_returns_articles_with_their_category(): void
{
    $this->createArticle(['title' => 'Included']);

    $this->actingAs($this->createAdmin())
        ->getJson('/api/v1/blog/admin/articles')
        ->assertOk()
        ->assertJsonPath('pagination.data.0.article.title', 'Included')
        ->assertJsonPath('pagination.data.0.article.category.name', 'Guides');
}
```

Note the response envelope: the resource list is returned under an `article` key and the paginated index under `pagination.data`, matching the help center's `HelpArticleResource` pattern.

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Feature/AdminBlogArticleApiTest.php`
Expected: FAIL — 404, no routes registered.

- [ ] **Step 3: Implement the resources**

`BlogArticleResource` extends `JsonResource`, `toArray()` returning the key list from the Interfaces block. Eager-load `category` and `author`; use `whenLoaded()` for both so the resource does not lazy-load.

`BlogCategoryResource` extends `JsonResource` with `whenLoaded('articles_count')` for the count.

- [ ] **Step 4: Implement the form requests**

`StoreBlogArticleRequest extends FormRequest`, `authorize()` returning `true` (the controller does the `Gate::authorize('admin.access')`), `rules()`:

```php
'title' => ['required', 'string', 'max:255'],
'slug' => ['nullable', 'string', 'max:255', 'alpha_dash', Rule::unique('blog_articles', 'slug')],
'excerpt' => ['nullable', 'string', 'max:500'],
'body' => ['required', 'string'],
'blog_category_id' => ['required', 'integer', Rule::exists('blog_categories', 'id')],
'cover_image' => ['nullable', 'string', 'max:255'],
'meta_title' => ['nullable', 'string', 'max:255'],
'meta_description' => ['nullable', 'string', 'max:500'],
'status' => ['nullable', Rule::in(['draft', 'published'])],
'published_at' => ['nullable', 'date'],
```

`UpdateBlogArticleRequest` mirrors it but every field is `nullable`/sometimes and `slug` uniqueness is scoped with `Rule::unique('blog_articles', 'slug')->ignore($this->route('id'))`. Set `$slug` unique to ignore correctly — do not repeat marketbob's bug of validating the article slug against `blog_categories`.

`StoreBlogCategoryRequest`: `name` required string max 255, `slug` nullable alpha_dash unique on `blog_categories`, `description` nullable string max 1000, `sort_id` nullable integer.

- [ ] **Step 5: Implement `AdminBlogArticleController`**

`use Common\Core\BaseController;` so the controller inherits `HandlesSeo`. Every method calls `Gate::authorize('admin.access');` first, matching `AdminHelpArticleController`.

`index()`: `BlogArticle::query()->with(['category', 'author'])->when($search = request('search'), fn ($q) => $q->where(fn ($q) => $q->where('title', 'like', "%{$search}%")->orWhere('excerpt', 'like', "%{$search}%")))->when(request('status'), fn ($q, $s) => $q->where('status', $s))->when(request('category'), fn ($q, $c) => $q->where('blog_category_id', $c))->latest('id')->paginate(request('perPage', 20))`, then map each row through `BlogArticleResource` into a `pagination` key.

Note the `where(function ($q) {...})` wrapper — the marketbob reference omits it on its public index, which lets the `orWhere` escape the scope and return unrelated rows.

`store()`: `$data = $request->validated(); $data['author_id'] ??= $request->user()->id;` then create, return `['article' => new BlogArticleResource($article)]` with a 201.

`update()`, `show()`, `destroy()` follow.

- [ ] **Step 6: Implement `AdminBlogCategoryController`**

Same authorization pattern. `destroy()` returns 409 with a message when `$category->articles()->exists()`, so the admin UI can warn before cascading (§ Review Focus item 5). Returning a conflict rather than silently cascading is what makes the UI warning meaningful.

- [ ] **Step 7: Register the routes**

In `routes/api.php`, inside the `Route::group(['middleware' => ['optionalAuth:sanctum', 'verified', 'verifyApiAccess']], ...)` block, add after the existing help block:

```php
// BLOG (admin)
Route::name('blog.')->prefix('blog')->group(function () {
    Route::apiResource('admin/articles', AdminBlogArticleController::class)->names('admin.articles');
    Route::apiResource('admin/categories', AdminBlogCategoryController::class)->names('admin.categories');
});
```

Add the four `use` statements at the top of `routes/api.php`.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `php artisan test tests/Feature/AdminBlogArticleApiTest.php tests/Feature/AdminBlogCategoryApiTest.php`
Expected: PASS.

- [ ] **Step 9: Write the failing category API test**

`tests/Feature/AdminBlogCategoryApiTest.php` covering: guest/non-admin forbidden; admin can create and receives a slug; duplicate names get unique slugs; admin can reorder via `sort_id`; destroying a **non-empty** category returns 409 and the articles survive; destroying an empty category returns 204.

- [ ] **Step 10: Verify the category tests pass**

Run: `php artisan test tests/Feature/AdminBlogCategoryApiTest.php`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add common/foundation/src/Blog/Http/ routes/api.php tests/Feature/AdminBlogArticleApiTest.php tests/Feature/AdminBlogCategoryApiTest.php
git commit -m "feat(blog): add admin article and category API"
```

---

### Task 4: Admin blog UI

**Files:**
- Create: `common/foundation/resources/client/admin/blog/blog-admin-queries.ts`
- Create: `common/foundation/resources/client/admin/blog/blog-articles-datatable-page.tsx`
- Create: `common/foundation/resources/client/admin/blog/blog-article-form-dialog.tsx`
- Create: `common/foundation/resources/client/admin/blog/blog-categories-datatable.tsx`
- Create: `common/foundation/resources/client/admin/blog/blog-category-form-dialog.tsx`
- Create: `common/foundation/resources/client/admin/blog/blog-settings-page.tsx`
- Modify: `resources/client/admin/admin-routes.tsx` — add a `blog` lazy route
- Test: `tests/js/` vitest for the query module
- Test: `tests/e2e/` Playwright for the admin page

**Interfaces:**
- Consumes: the `blog.` API routes from Task 3.
- Produces: `blogAdminQueries` with `.articlesList(params)`, `.article(id)`, `.createArticle(payload)`, `.updateArticle(id, payload)`, `.deleteArticle(id)`, `.categoriesList()`, `.createCategory(payload)`, `.updateCategory(id, payload)`, `.deleteCategory(id)`, and an `invalidateKey: ['blog']`. Plus an `/admin/blog` route rendering `blog-settings-page`.

- [ ] **Step 1: Write the failing query-module test**

Create `tests/js/blog-admin-queries.test.ts` asserting the query keys and endpoints: `articlesList({page: 2})` produces query key `['blog', 'articles', {page: 2}]` and requests `/api/v1/blog/admin/articles?page=2`; `createArticle` posts to `/api/v1/blog/admin/articles`; `deleteCategory` targets `/api/v1/blog/admin/categories/{id}` and surfaces a 409 as an error toast rather than swallowing it.

Follow the existing vitest conventions in `tests/js/` — check an existing file there first for the mock setup used against `queryFactoryHelpers`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/js/blog-admin-queries.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `blog-admin-queries.ts`**

Follow `common/foundation/resources/client/admin/help/help-admin-queries.ts` exactly, using `queryFactoryHelpers.get`/`post`/`put`/`del` from `@common/http/queries-file-helpers` and `queryOptions`/`infiniteQueryOptions` from `@tanstack/react-query`. Use `keepPreviousData` as `placeholderData` for the list.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/js/blog-admin-queries.test.ts`
Expected: PASS.

- [ ] **Step 5: Build the articles datatable page**

Use `@common/datatable/data-table` with `data-table-page` and `column-templates`, matching `admin/custom-pages/custom-pages-datatable.tsx`. Columns: title (link to edit), category, status (badge), author, published date, views, and a row-actions column.

Every header and empty-state string goes through `<Trans message="..." />`.

- [ ] **Step 6: Build the article form dialog**

Reuse `article-editor-page.tsx` / `article-editor-menubar.tsx` from `@common/article-editor/` for the TipTap body — that is the pre-existing shared editor and must not be duplicated. Compose fields for title, slug, excerpt, category select, cover image, status, published date, and the SEO override fields (`meta_title`, `meta_description`) inside a collapsible section.

Include a hint under the slug field stating the slug does not change automatically when the title is edited, so an admin is not surprised.

- [ ] **Step 7: Build the categories datatable and form dialog**

Sortable by `sort_id`, with a delete action that surfaces the 409 conflict from Task 3 as a confirmation dialog listing how many articles will be deleted.

- [ ] **Step 8: Build `blog-settings-page.tsx` and register the route**

Two tabs — Articles and Categories — following `admin/help/help-settings-page.tsx`. In `resources/client/admin/admin-routes.tsx` add a `blog` path entry with `lazy: () => import('@common/admin/blog/blog-settings-page')`, using an existing lucide icon (e.g. `Newspaper`).

- [ ] **Step 9: Verify types and lint**

Run: `npx tsc --noEmit -p tsconfig.json` then `npm run lint`
Expected: no new errors. Fix any that reference the new files.

- [ ] **Step 10: Write the Playwright e2e test**

`tests/e2e/blog-admin.spec.ts`: log in as an admin, open `/admin/blog`, assert the articles datatable renders, open the create dialog, save a new article, assert it appears in the table, then delete it. Follow the login helper already used by the existing e2e specs.

Run: `npx playwright test tests/e2e/blog-admin.spec.ts`
Expected: PASS. Requires a running dev server per `playwright.config.ts`.

- [ ] **Step 11: Commit**

```bash
git add common/foundation/resources/client/admin/blog/ \
        resources/client/admin/admin-routes.tsx tests/js/ tests/e2e/
git commit -m "feat(blog): add admin blog management UI"
```

---

### Task 5: Comment permissions for regular users

**Files:**
- Modify: `resources/defaults/permissions.php` — add the four `comments.*` permissions to the `all` map and `comments.create`/`comments.view` to the default `Users` role
- Test: `tests/Feature/BlogCommentPermissionsTest.php`

**Interfaces:**
- Consumes: `Common\Comments\CommentPolicy` (unchanged), `BlogArticle` (Task 1).
- Produces: `comments.create`, `comments.view`, `comments.update`, `comments.delete` as seedable permissions; regular `Users`-role members gain `comments.create` and `comments.view`.

**Why this task exists:** `CommentPolicy::store()` requires `hasPermission('comments.create')`. That permission is absent from `resources/defaults/permissions.php`, and `HasPermissionsRelation::permissionAlias()` only maps `stores.` ↔ `biolinks.`. So today only holders of the `admin` super-permission can comment. Without this task, "logged-in users can comment" is false for every non-admin.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/BlogCommentPermissionsTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Common\Comments\Comment;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class BlogCommentPermissionsTest extends TestCase
{
    use DatabaseTransactions;

    public function test_regular_user_has_permission_to_comment(): void
    {
        $user = $this->createUserWithDefaultRole();

        $this->assertTrue($user->hasPermission('comments.create'));
        $this->assertTrue($user->hasPermission('comments.view'));
    }

    public function test_regular_user_is_not_granted_comment_moderation(): void
    {
        $user = $this->createUserWithDefaultRole();

        $this->assertFalse($user->hasExactPermission('comments.delete'));
    }
}
```

`createUserWithDefaultRole()` must create the user **without** attaching anything manually — the whole point is that the seeded default `Users` role grants these. Look at how `database/seeders/AdminUserSeeder.php` and the `Users` role attach permissions, and attach the default role by name so the test exercises the seeded configuration rather than a hand-built one.

If the default role is applied at signup rather than by seeder, create the user through the same path the app uses and note which one it is in the commit message.

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Feature/BlogCommentPermissionsTest.php`
Expected: FAIL — `hasPermission('comments.create')` returns false.

- [ ] **Step 3: Add the permissions to config**

In `resources/defaults/permissions.php`, inside the `'all' => [` map, add a new group after `'Admin area'`:

```php
'Comments' => [
    [
        'name' => 'comments.create',
        'role_types' => ['users'],
        'display_name' => 'Create comments',
        'description' => 'Allow creating comments.',
    ],
    [
        'name' => 'comments.view',
        'role_types' => ['users'],
        'display_name' => 'View all comments',
        'description' => 'Allow viewing all comments, not just own.',
    ],
    [
        'name' => 'comments.update',
        'role_types' => ['users'],
        'display_name' => 'Edit comments',
        'description' => 'Allow editing all comments.',
    ],
    [
        'name' => 'comments.delete',
        'role_types' => ['users'],
        'display_name' => 'Delete comments',
        'description' => 'Allow deleting all comments.',
    ],
],
```

Then, in the `Users` role's `'permissions'` array (line 10, next to `'api.access', 'files.create'`), add:

```php
// COMMENTS
'comments.create',
'comments.view',
```

Deliberately **not** `comments.update` or `comments.delete` — a regular user may edit and delete their own comments (which `CommentPolicy` already permits via the `user_id` ownership checks), but must not moderate other people's. This is Review Focus item 4.

- [ ] **Step 4: Re-run the seeders so the permissions exist**

Run: `php artisan db:seed --class="Common\Database\Seeders\PermissionTableSeeder" --class="Common\Database\Seeders\RolesTableSeeder"`
Expected: exit 0.

`PermissionConfigLoader::get()` reads `resource_path('defaults/permissions.php')`, so `resources/defaults/permissions.php` is the correct file — verify that `resource_path()` resolves to the project `resources/` and not `common/foundation/resources/` before assuming, since both directories contain a `defaults/permissions.php`. If it resolves to the common one, edit that file instead.

- [ ] **Step 5: Run the test to verify it passes**

Run: `php artisan test tests/Feature/BlogCommentPermissionsTest.php`
Expected: PASS, 2 tests.

- [ ] **Step 6: Run the full suite to check for regressions**

Run: `php artisan test`
Expected: PASS. Adding permissions to the default role could affect tests that assert on permission counts or role snapshots — if any fail, inspect whether the failure is a genuine behaviour change or a stale assertion.

- [ ] **Step 7: Commit**

```bash
git add resources/defaults/permissions.php tests/Feature/BlogCommentPermissionsTest.php
git commit -m "feat(comments): grant regular users comment create and view permissions"
```

---

## Self-Review

**Spec coverage.** §5.1/§5.2 → Task 1. §5.3 slug policy → Task 2. §5.4 morph map → deferred to Phase 2, correctly, since comments only appear on public pages. §7 comments → Task 5 (permissions) plus Phase 2 (wiring). §8 admin → Tasks 3–4. §11 error handling → Task 3 (`409` on non-empty category delete, validation errors) and Task 1 (`404`-equivalent scoping via the `published()` scope, tested in Task 1). §12 testing → every task ends in tests. §13 phase 1 → this plan.

Not covered here, by design and per the phase split: §6 SEO, §9 feature flag, §10 performance — all later phases.

**Step scan.** Every step names an exact file, an exact signature, or an exact test assertion. No step says "add appropriate validation" or "handle edge cases."

**Type consistency.** `SanitizeBlogHtml::execute(?string): string` in Task 1 is called consistently in Tasks 1, 3. `generateUniqueBlogSlug(string, string, ?int)` and `transliterate(string)` in Task 2 are used only by the two models it is wired into. `reading_time_minutes` is `unsignedSmallInteger` in the migration and `max(1, ...)` in the saving hook, matching the Task 1 assertions of 2 and 1.

**Review Focus.** All five items are pinned by a test in the owning task: empty-slug fallback → Task 2 `test_non_latin_title_still_produces_a_usable_slug`; script/event-handler stripping → Task 1 Steps 1 and 5; non-zero reading time → Task 1 `test_reading_time_is_never_zero_for_empty_body`; regular-user commenting → Task 5 `test_regular_user_has_permission_to_comment` plus Step 3's deliberate omission of delete/update; cascade warning → Task 3 `destroy()` returning 409, tested in Task 3 Step 9.

**Proportion.** The plan is roughly the length of Phase 1 of the spec. Signatures and test assertions carry the decisions; no file's full body is transcribed, except the two migrations and the permissions array where the exact column list and exact permission names are the substance of the task.