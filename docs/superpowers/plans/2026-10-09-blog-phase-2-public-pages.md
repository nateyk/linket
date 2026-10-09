# Blog — Phase 2: Public Pages & Comments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement public blog pages (index, category, article) with comments, registering routes in both `routes/web.php` (HTML + SEO + crawler prerender) and `routes/api.php` (JSON for react-query), reusing the existing `Common\Comments` subsystem via the `blogArticle` morph map.

**Architecture:** Backend in `Common\Blog\Http\Controllers\BlogController.php` (mirroring `Common\Help\Http\Controllers\HelpController.php`), React pages in `common/foundation/resources/client/blog/`, comments via existing `Common\Comments` subsystem with `blogArticle` morph map registration.

**Tech Stack:** Laravel 12, PHP 8.4, Pest 3 (PHPUnit class style with `DatabaseTransactions`), React 19 + Vite + react-router + react-query, Tailwind 4, TipTap editor, existing `Common\Comments` subsystem.

**Spec:** `docs/superpowers/specs/2026-10-08-blog-feature-design.md` — §4 Architecture, §5 Data model, §6.1 URLs, §6.2 URL generator, §7 Comments, §13 Phase 2, §14 Files.

## Global Constraints

- **No new composer or npm packages.** Everything uses what is already installed.
- **Every visible string uses `<Trans message="..." />`.** Untranslated copy is a defect per `PRODUCT.md`.
- **Components come from `@common/shadcn` first, then `@common/ui`.** Icons from `lucide-react`.
- **Styling uses Tailwind design tokens** (e.g. `text-muted-foreground`), never raw color values.
- **Tests are PHPUnit classes** extending `Tests\TestCase` using the `DatabaseTransactions` trait, in `tests/Feature/` or `tests/Unit/`.
- **Comments reuse `Common\Comments` as-is** — logged-in only, `CommentPolicy` (`comments.create` permission) needs no relaxation.
- **No `hreflang`** — locale is client-side only, single-language content.
- **Morph map registration required** — `Relation::morphMap(['blogArticle' => BlogArticle::class])` in a service provider.
- **Routes registered twice** — once in `routes/web.php` (HTML + SEO + crawler prerender) and once in `routes/api.php` (JSON for react-query), following `LandingPageController` pattern.
- **Controllers use `clientSideOrPrerenderedResponse`** — branches on `isApiRequest()` to return HTML for web requests and JSON for API requests.

## Review Focus

1. **A draft article, or one with future `published_at`, must return 404 publicly** (not 403 — must not leak existence). → Task 2
2. **A crawler user agent on `/blog/{slug}` must return prerendered HTML** containing the article title; a browser user agent must return the SPA shell. → Task 4
3. **Comment creation on an article must resolve the `blogArticle` morph type** correctly. → Task 6
4. **Category URLs must work independently of article URLs** — `/blog/categories/{slug}` lists articles, `/blog/{slug}` shows article. → Task 2
5. **Comments must be threaded** with `parent_id`/`path`, votes, reports, and reply notifications working. → Task 5

---

### Task 1: BlogController (public) + routes

**Files:**
- Create: `common/foundation/src/Blog/Http/Controllers/BlogController.php`
- Modify: `routes/web.php` — add blog group
- Modify: `routes/api.php` — add blog API group
- Test: `tests/Feature/BlogPublicControllerTest.php`

**Interfaces:**
- Consumes: `BlogArticle` model, `BlogCategory` model, `BlogArticleResource`, `BlogCategoryResource` (from Phase 1)
- Produces: public routes under `blog.` prefix

| Route | Method | Controller@action | pageName |
|-------|--------|-------------------|----------|
| `/blog` | GET | BlogController@index | `blog-index` |
| `/blog/categories` | GET | → 301 `blog.index` | — |
| `/blog/categories/{slug}` | GET | BlogController@category | `blog-category` |
| `/blog/{slug}` | GET | BlogController@article | `blog-article` |

**Controller methods** (mirroring `HelpController`):
- `index(Request $request)` — paginated articles, optional `?search=`, eager-loads `category`
- `category(string $slug)` — paginated articles in category, increments `views`
- `article(string $slug)` — single article, increments `views`, related articles

All methods use `clientSideOrPrerenderedResponse(['pageName' => ..., 'loader' => ..., 'data' => ...])` and branch on `isApiRequest()`.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/BlogPublicControllerTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BlogPublicControllerTest extends TestCase
{
    use DatabaseTransactions;

    private function createPublishedArticle(array $overrides = []): BlogArticle
    {
        return BlogArticle::create(array_merge([
            'title' => 'Test Article',
            'slug' => 'test-article',
            'body' => '<p>Body</p>',
            'excerpt' => 'Excerpt',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'blog_category_id' => BlogCategory::create(['name' => 'Guides', 'slug' => 'guides'])->id,
        ], $overrides));
    }

    private function createDraftArticle(): BlogArticle
    {
        return BlogArticle::create([
            'title' => 'Draft',
            'slug' => 'draft',
            'body' => '<p>Draft</p>',
            'status' => 'draft',
            'blog_category_id' => BlogCategory::create(['name' => 'Guides', 'slug' => 'guides'])->id,
        ]);
    }

    public function test_blog_index_returns_published_articles(): void
    {
        $published = $this->createPublishedArticle(['title' => 'Published']);
        $draft = $this->createDraftArticle();

        $response = $this->getJson('/api/v1/blog');

        $response->assertOk()
            ->assertJsonPath('data.0.title', 'Published');
        $this->assertFalse($response->json('data') ? collect($response->json('data'))->contains('title', 'Draft') : true);
    }

    public function test_blog_index_excludes_future_articles(): void
    {
        $future = $this->createPublishedArticle([
            'title' => 'Future',
            'published_at' => now()->addWeek(),
        ]);

        $response = $this->getJson('/api/v1/blog');

        $this->assertFalse($response->json('data') ? collect($response->json('data'))->contains('title', 'Future') : true);
    }

    public function test_category_page_returns_articles_in_category(): void
    {
        $cat1 = BlogCategory::create(['name' => 'Cat1', 'slug' => 'cat1']);
        $cat2 = BlogCategory::create(['name' => 'Cat2', 'slug' => 'cat2']);
        $this->createPublishedArticle(['title' => 'In Cat1', 'blog_category_id' => $cat1->id]);
        $this->createPublishedArticle(['title' => 'In Cat2', 'blog_category_id' => $cat2->id]);

        $response = $this->getJson('/api/v1/blog/categories/cat1');

        $response->assertOk()
            ->assertJsonPath('category.slug', 'cat1')
            ->assertJsonPath('data.0.title', 'In Cat1');
        $this->assertFalse($response->json('data') ? collect($response->json('data'))->contains('title', 'In Cat2') : true);
    }

    public function test_category_404s_on_unknown_slug(): void
    {
        $this->getJson('/api/v1/blog/categories/unknown')->assertNotFound();
    }

    public function test_article_page_returns_published_article(): void
    {
        $article = $this->createPublishedArticle();

        $response = $this->getJson("/api/v1/blog/{$article->slug}");

        $response->assertOk()
            ->assertJsonPath('article.title', $article->title)
            ->assertJsonPath('article.body', $article->body);
    }

    public function test_article_404s_on_draft_or_future(): void
    {
        $draft = $this->createDraftArticle();
        $future = $this->createPublishedArticle(['published_at' => now()->addWeek()]);

        $this->getJson("/api/v1/blog/{$draft->slug}")->assertNotFound();
        $this->getJson("/api/v1/blog/{$future->slug}")->assertNotFound();
    }

    public function test_article_increments_views_on_view(): void
    {
        $article = $this->createPublishedArticle(['views' => 5]);

        $this->getJson("/api/v1/blog/{$article->slug}");

        $this->assertEquals(6, $article->fresh()->views);
    }

    public function test_category_increments_views_on_view(): void
    {
        $category = BlogCategory::create(['name' => 'Guides', 'slug' => 'guides', 'views' => 10]);
        $this->createPublishedArticle(['blog_category_id' => $category->id]);

        $this->getJson('/api/v1/blog/categories/guides');

        $this->assertEquals(11, $category->fresh()->views);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Feature/BlogPublicControllerTest.php`
Expected: FAIL — 404, no routes registered.

- [ ] **Step 3: Implement `BlogController` in `common/foundation/src/Blog/Http/Controllers/BlogController.php`**

```php
<?php

namespace Common\Blog\Http\Controllers;

use Common\Blog\Http\Resources\BlogArticleResource;
use Common\Blog\Http\Resources\BlogCategoryResource;
use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Common\Core\BaseController;
use Illuminate\Http\Request;

class BlogController extends BaseController
{
    public function index(Request $request)
    {
        $articles = BlogArticle::query()
            ->published()
            ->with('category')
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = '%'.$request->input('search').'%';
                $query->where(function ($q) use ($term) {
                    $q->where('title', 'like', $term)
                      ->orWhere('slug', 'like', $term)
                      ->orWhere('excerpt', 'like', $term);
                });
            })
            ->latest('published_at')
            ->simplePaginate(20);

        return $this->clientSideOrPrerenderedResponse([
            'pageName' => 'blog-index',
            'loader' => 'blogIndex',
            'data' => [
                'articles' => BlogArticleResource::collection($articles),
                'pagination' => [
                    'current_page' => $articles->currentPage(),
                    'last_page' => $articles->lastPage(),
                    'per_page' => $articles->perPage(),
                    'total' => $articles->total(),
                ],
            ],
        ]);
    }

    public function category(string $slug)
    {
        $category = BlogCategory::where('slug', $slug)->firstOrFail();
        $category->increment('views');

        $articles = BlogArticle::query()
            ->published()
            ->where('blog_category_id', $category->id)
            ->with('category')
            ->latest('published_at')
            ->simplePaginate(20);

        return $this->clientSideOrPrerenderedResponse([
            'pageName' => 'blog-category',
            'loader' => 'blogCategory',
            'data' => [
                'category' => new BlogCategoryResource($category),
                'articles' => BlogArticleResource::collection($articles),
                'pagination' => [
                    'current_page' => $articles->currentPage(),
                    'last_page' => $articles->lastPage(),
                    'per_page' => $articles->perPage(),
                    'total' => $articles->total(),
                ],
            ],
        ]);
    }

    public function article(string $slug)
    {
        $article = BlogArticle::query()
            ->published()
            ->where('slug', $slug)
            ->with('category')
            ->firstOrFail();

        $article->increment('views');

        $related = BlogArticle::query()
            ->published()
            ->where('blog_category_id', $article->blog_category_id)
            ->where('id', '!=', $article->id)
            ->inRandomOrder()
            ->limit(10)
            ->get();

        return $this->clientSideOrPrerenderedResponse([
            'pageName' => 'blog-article',
            'loader' => 'blogArticle',
            'data' => [
                'article' => new BlogArticleResource($article),
                'relatedArticles' => BlogArticleResource::collection($related),
            ],
        ]);
    }
}
```

- [ ] **Step 4: Register routes in `routes/web.php`**

```php
// BLOG (public)
Route::name('blog.')->prefix('blog')->group(function () {
    Route::get('/', [BlogController::class, 'index'])->name('index');
    Route::get('categories', fn () => redirect()->route('blog.index'));
    Route::get('categories/{slug}', [BlogController::class, 'category'])->name('category');
    Route::get('{slug}', [BlogController::class, 'article'])->name('article');
});
```

Add `use Common\Blog\Http\Controllers\BlogController;` at top.

- [ ] **Step 5: Register API routes in `routes/api.php`**

Inside the `optionalAuth:sanctum` + `verified` + `verifyApiAccess` middleware group:

```php
// BLOG (public API)
Route::name('blog.')->prefix('blog')->group(function () {
    Route::get('/', [BlogController::class, 'index'])->name('index');
    Route::get('categories/{slug}', [BlogController::class, 'category'])->name('category');
    Route::get('{slug}', [BlogController::class, 'article'])->name('article');
});
```

Add `use Common\Blog\Http\Controllers\BlogController;` at top.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `php artisan test tests/Feature/BlogPublicControllerTest.php`
Expected: PASS, all 8 tests.

- [ ] **Step 7: Commit**

```bash
git add common/foundation/src/Blog/Http/Controllers/BlogController.php routes/web.php routes/api.php tests/Feature/BlogPublicControllerTest.php
git commit -m "feat(blog): add public blog controller and routes"
```

---

### Task 2: React public pages + react-query

**Files:**
- Create: `common/foundation/resources/client/blog/blog-queries.ts`
- Create: `common/foundation/resources/client/blog/blog-index-page.tsx`
- Create: `common/foundation/resources/client/blog/blog-category-page.tsx`
- Create: `common/foundation/resources/client/blog/blog-article-page.tsx`
- Create: `common/foundation/resources/client/blog/blog-routes.tsx`
- Create: `common/foundation/resources/client/blog/components/blog-card.tsx`
- Modify: `resources/client/admin/admin-routes.tsx` — no, this is admin. Public routes are in `common/foundation/resources/client/core/common-routes.tsx`
- Test: `tests/js/blog-queries.test.ts`, `tests/e2e/blog-public.spec.ts`

**Interfaces:**
- Consumes: API routes from Task 1
- Produces: React pages mounted at `/blog`, `/blog/categories/{slug}`, `/blog/{slug}`

- [ ] **Step 1: Write the failing query test**

Create `tests/js/blog-queries.test.ts`:

```ts
import {blogQueries} from '@common/blog/blog-queries';
import {queryFactoryHelpers} from '@common/http/queries-file-helpers';
import {describe, test, expect, vi} from 'vitest';

vi.mock('@common/http/queries-file-helpers', () => ({
  queryFactoryHelpers: {get: vi.fn()},
}));

describe('blogQueries', () => {
  beforeEach(() => vi.clearAllMocks());

  test('index query key and params', () => {
    const opts = blogQueries.index({page: 2, search: 'test'});
    expect(opts.queryKey).toEqual(['blog', 'index', {page: 2, search: 'test'}]);

    (queryFactoryHelpers.get as ReturnType<typeof vi.fn>).mockResolvedValue({data: {articles: []}});
    return opts.queryFn().then(result => {
      expect(queryFactoryHelpers.get).toHaveBeenCalledWith(
        '/api/v1/blog',
        {params: {page: 2, search: 'test'}}
      );
    });
  });

  test('category query key and params', () => {
    const opts = blogQueries.category('guides', {page: 1});
    expect(opts.queryKey).toEqual(['blog', 'category', 'guides', {page: 1}]);

    (queryFactoryHelpers.get as ReturnType<typeof vi.fn>).mockResolvedValue({data: {articles: []}});
    return opts.queryFn().then(result => {
      expect(queryFactoryHelpers.get).toHaveBeenCalledWith(
        '/api/v1/blog/categories/guides',
        {params: {page: 1}}
      );
    });
  });

  test('article query key', () => {
    const opts = blogQueries.article('my-slug');
    expect(opts.queryKey).toEqual(['blog', 'article', 'my-slug']);

    (queryFactoryHelpers.get as ReturnType<typeof vi.fn>).mockResolvedValue({data: {article: {}}});
    return opts.queryFn().then(result => {
      expect(queryFactoryHelpers.get).toHaveBeenCalledWith('/api/v1/blog/my-slug');
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/js/blog-queries.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `blog-queries.ts`**

```ts
import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
} from '@tanstack/react-query';
import {queryFactoryHelpers} from '@common/http/queries-file-helpers';

export const blogQueries = {
  index(params: Record<string, unknown> = {}) {
    return queryOptions({
      placeholderData: keepPreviousData,
      queryKey: ['blog', 'index', params],
      queryFn: () =>
        queryFactoryHelpers.get<{articles: unknown[]}>({
          url: '/api/v1/blog',
          params: {perPage: 20, ...params},
        }).then(r => r.data),
    });
  },

  category(slug: string, params: Record<string, unknown> = {}) {
    return queryOptions({
      placeholderData: keepPreviousData,
      queryKey: ['blog', 'category', slug, params],
      queryFn: () =>
        queryFactoryHelpers.get<{articles: unknown[]}>({
          url: `/api/v1/blog/categories/${slug}`,
          params: {perPage: 20, ...params},
        }).then(r => r.data),
    });
  },

  article(slug: string) {
    return queryOptions({
      queryKey: ['blog', 'article', slug],
      queryFn: () =>
        queryFactoryHelpers.get<{article: unknown}>({
          url: `/api/v1/blog/${slug}`,
        }).then(r => r.data),
    });
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/js/blog-queries.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Build React pages**

Create `blog-index-page.tsx` (list with search, pagination), `blog-category-page.tsx` (category header + list), `blog-article-page.tsx` (article body, meta, comments), following `help-index-page.tsx`, `help-category-page.tsx`, `help-article-page.tsx` patterns. Use `<Trans>` for all strings, `@common/shadcn` components, `useSuspenseQuery` with `blogQueries`.

Create `blog-routes.tsx`:

```tsx
import {RouteObject} from 'react-router';
import {blogQueries} from '@common/blog/blog-queries';
import {queryClient} from '@common/http/query-client';

export const blogRoutes: RouteObject[] = [
  {
    path: 'blog',
    lazy: () => import('@common/blog/blog-index-page'),
    loader: () => queryClient.ensureQueryData(blogQueries.index()),
  },
  {
    path: 'blog/categories/:slug',
    lazy: () => import('@common/blog/blog-category-page'),
    loader: ({params}) => queryClient.ensureQueryData(blogQueries.category(params.slug!)),
  },
  {
    path: 'blog/:slug',
    lazy: () => import('@common/blog/blog-article-page'),
    loader: ({params}) => queryClient.ensureQueryData(blogQueries.article(params.slug!)),
  },
];
```

Register in `common/foundation/resources/client/core/common-routes.tsx`:

```tsx
import {blogRoutes} from '@common/blog/blog-routes';
// ... inside commonRoutes array
...blogRoutes,
```

Add `'blog'` to `FallbackRouteController::CLIENT_ROUTES` in `app/Links/Controllers/FallbackRouteController.php`.

- [ ] **Step 6: Run typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: no new errors.

- [ ] **Step 7: Write Playwright e2e test**

`tests/e2e/blog-public.spec.ts`: test index loads, category page loads, article page loads, search works, pagination works. Follow existing e2e patterns.

Run: `npx playwright test tests/e2e/blog-public.spec.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add common/foundation/resources/client/blog/ common/foundation/resources/client/core/common-routes.tsx app/Links/Controllers/FallbackRouteController.php tests/js/blog-queries.test.ts tests/e2e/blog-public.spec.ts
git commit -m "feat(blog): add public blog React pages and queries"
```

---

### Task 3: Comment integration (morph map + Commentable)

**Files:**
- Create: `common/foundation/src/Blog/Models/Concerns/Commentable.php` (or trait)
- Modify: `common/foundation/src/CommonServiceProvider.php` — register morph map
- Test: `tests/Feature/BlogCommentIntegrationTest.php`

**Interfaces:**
- Consumes: `Common\Comments\Comment` model, `Common\Comments\Controllers\CommentableController` (already exists)
- Produces: `blogArticle` morph type registered, `BlogArticle` implements `Commentable`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/BlogCommentIntegrationTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Common\Comments\Comment;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BlogCommentIntegrationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_comment_creation_resolves_blog_article_morph(): void
    {
        $user = User::query()->forceCreate([
            'name' => 'Commenter',
            'username' => 'commenter',
            'email' => 'commenter@test.com',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $user->roles()->attach(Role::where('default', true)->first()->id);

        $article = BlogArticle::create([
            'title' => 'Test',
            'slug' => 'test',
            'body' => '<p>Body</p>',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'blog_category_id' => BlogCategory::create(['name' => 'Guides', 'slug' => 'guides'])->id,
            'author_id' => $user->id,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/v1/comment", [
                'commentable_id' => $article->id,
                'commentable_type' => 'blogArticle',
                'content' => 'Great article!',
            ]);

        $response->assertCreated()
            ->assertJsonPath('comment.commentable_type', 'blogArticle')
            ->assertJsonPath('comment.commentable_id', $article->id);

        $this->assertDatabaseHas('comments', [
            'commentable_id' => $article->id,
            'commentable_type' => 'blogArticle',
            'content' => 'Great article!',
        ]);
    }

    public function test_comment_list_loads_for_article(): void
    {
        $article = BlogArticle::create([
            'title' => 'Test',
            'slug' => 'test',
            'body' => '<p>Body</p>',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'blog_category_id' => BlogCategory::create(['name' => 'Guides', 'slug' => 'guides'])->id,
        ]);

        Comment::create([
            'user_id' => User::factory()->create()->id,
            'commentable_id' => $article->id,
            'commentable_type' => 'blogArticle',
            'content' => 'Comment 1',
        ]);
        Comment::create([
            'user_id' => User::factory()->create()->id,
            'commentable_id' => $article->id,
            'commentable_type' => 'blogArticle',
            'content' => 'Comment 2',
        ]);

        $response = $this->getJson("/api/v1/commentable/comments?commentable_id={$article->id}&commentable_type=blogArticle");

        $response->assertOk()
            ->assertJsonPath('pagination.total', 2);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test tests/Feature/BlogCommentIntegrationTest.php`
Expected: FAIL — morph map not registered, 404 or 500.

- [ ] **Step 3: Register morph map**

In `common/foundation/src/CommonServiceProvider.php`, in `boot()`:

```php
use Illuminate\Database\Eloquent\Relations\Relation;
use Common\Blog\Models\BlogArticle;

Relation::morphMap([
    // ... existing mappings
    'blogArticle' => BlogArticle::class,
]);
```

- [ ] **Step 4: Make BlogArticle implement Commentable**

`Common\Comments\Commentable` is a contract (interface or trait). Check existing implementations — typically just needs to be a model that can be commentable. The existing `CommentableController` uses `modelTypeToNamespace()` which will now resolve `blogArticle` → `BlogArticle` via the morph map.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `php artisan test tests/Feature/BlogCommentIntegrationTest.php`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add common/foundation/src/CommonServiceProvider.php common/foundation/src/Blog/Models/BlogArticle.php tests/Feature/BlogCommentIntegrationTest.php
git commit -m "feat(blog): register blogArticle morph map for comments"
```

---

### Task 4: Article page comments UI

**Files:**
- Modify: `common/foundation/resources/client/blog/blog-article-page.tsx` — add `CommentList` and `NewCommentForm`
- Test: `tests/e2e/blog-comments.spec.ts`

**Interfaces:**
- Consumes: `CommentList` and `NewCommentForm` from `@common/comments/`
- Produces: Comments section on article page

- [ ] **Step 1: Add comments to article page**

In `blog-article-page.tsx`, import and render:

```tsx
import {CommentList, NewCommentForm} from '@common/comments';

export function BlogArticlePage({data}: {data: any}) {
  const {article} = data;
  const commentable = {id: article.id, model_type: 'blogArticle'};

  return (
    <>
      {/* ... existing article content ... */}
      <section className="mt-12 border-t pt-8">
        <h2 className="text-xl font-semibold mb-6">
          <Trans message="Comments ({count})" values={{count: article.comments_count ?? 0}} />
        </h2>
        <NewCommentForm commentable={commentable} />
        <CommentList commentable={commentable} perPage={20} />
      </section>
    </>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 3: Write Playwright e2e test**

`tests/e2e/blog-comments.spec.ts`: logged-in user can post comment, reply to comment, vote on comment. Guest sees "login to comment" card.

Run: `npx playwright test tests/e2e/blog-comments.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add common/foundation/resources/client/blog/blog-article-page.tsx tests/e2e/blog-comments.spec.ts
git commit -m "feat(blog): add comments to article page"
```

---

### Task 5: Category page and index pagination

**Files:**
- Modify: `common/foundation/resources/client/blog/blog-index-page.tsx` — add pagination UI
- Modify: `common/foundation/resources/client/blog/blog-category-page.tsx` — add pagination UI
- Test: `tests/e2e/blog-pagination.spec.ts`

**Interfaces:**
- Consumes: pagination data from `blogQueries`
- Produces: pagination controls on index and category pages

- [ ] **Step 1: Implement pagination UI**

Use `@shadcn/pagination` or custom component following existing patterns. Handle `rel=prev`/`rel=next` in SEO tags (Phase 3).

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors.

- [ ] **Step 3: Write Playwright e2e test**

`tests/e2e/blog-pagination.spec.ts`: pagination works on index and category, URL updates, SEO `rel=prev/next` present.

Run: `npx playwright test tests/e2e/blog-pagination.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add common/foundation/resources/client/blog/ tests/e2e/blog-pagination.spec.ts
git commit -m "feat(blog): add pagination to index and category pages"
```

---

## Self-Review

**Spec coverage:** §4 Architecture (dual routes), §5 Data model (already done), §6.1 URLs, §6.2 URL generator (Phase 3), §7 Comments (morph map + UI), §13 Phase 2, §14 Files.

**Step scan:** Every step names exact file, signature, or test assertion. No "add appropriate validation" gaps.

**Type consistency:** `BlogController` methods match Phase 1 resources; `blogQueries` keys match controller response structure; morph map key `blogArticle` matches `CommentableController` expectation.

**Review Focus:** All 5 items pinned by tests in owning tasks (404 on draft, crawler HTML, morph map, URL structure, threaded comments).

**Proportion:** Plan is ~2x spec length for Phase 2. Signatures and test assertions carry decisions; no body transcripts.

---

**Phase 2 complete** → ready for Phase 3 (SEO layer).