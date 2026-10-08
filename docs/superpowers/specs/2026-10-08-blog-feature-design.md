# Blog — Articles, Categories, Comments, SEO — Design

Date: 2026-10-08
Status: approved (in-chat design approved by owner, 2026-10-08)
Path: architectural (new public content subsystem)

## 1. Intent

Give Linket a public, search-optimised blog for creator education and
acquisition content: articles organised into categories, with threaded
comments, and a complete SEO surface (canonical, Open Graph/Twitter,
JSON-LD, sitemap, RSS).

Success:

- Public pages at `/blog` are indexable and server-rendered to crawlers with
  correct canonical URLs, Open Graph/Twitter tags, and JSON-LD.
- Admins can create, edit, schedule, and publish articles and categories
  through the existing admin UI conventions.
- Readers can comment with their Linket account, threaded, with votes and
  reports, reusing the existing comment subsystem.
- The blog can be switched off without a deploy.
- The blog can be added to the site sitemap without editing the shared
  sitemap generator.

## 2. Non-goals

- **No tags.** Not in the requested scope (articles, categories, comments).
  The schema leaves room: a later `blog_tags` table plus a pivot needs no
  change to `blog_articles`.
- **No auto-generated OG images.** v1 falls back to a configurable default
  social image. Generation is an easy later addition.
- **No auto table of contents.** Reading time is included; TOC is later.
- **No multi-language article content.** Locale in Linket is client-side
  only (see §3), so content is single-language and no `hreflang` is emitted.
  UI chrome is translated as elsewhere via `<Trans>`.
- **No root-scope redesign of the existing SEO layer.** §6 extends what
  exists; it does not replace `MetaTags`, `BaseUrlGenerator`, or
  `BaseSitemapGenerator`.
- **No migration of the Help Center.** A separate agent owns
  `Common\Help`. The blog reuses shared subsystems (`Common\Comments`,
  `client/article-editor/`, `client/datatable/`) but does not read from or
  write to `help_*` tables.

## 3. Findings that constrain the design

These were established by reading the codebase and decide most of §5–§7.

1. **Locale is client-side only.** `useChangeLocale` (`client/locale-switcher/change-locale.ts`)
   swaps `bootstrapData.i18n` and sets `document.documentElement.lang`.
   No locale-prefixed URLs exist anywhere. Therefore: single-language
   content, no `hreflang`, no per-locale slugs.
2. **A full SEO backbone already exists** and must be extended, not rebuilt:
   - `Common\Core\Prerender\MetaTags` — config-driven tags with
     `{{placeholder}}` resolution, and it **already derives** `<link
     rel=canonical>` from `og:url`, `<title>` from `og:title`, and
     `<meta name=description>` from `og:description`.
   - `Common\Core\Prerender\BaseUrlGenerator` — the `urls()` helper and the
     single canonical-URL seam.
   - `Common\Admin\Sitemap\BaseSitemapGenerator` — chunked sitemaps
     (50,000 lines/file), `sitemap-index.xml`, `<lastmod>`/`<changefreq>`/
     `<priority>`, and a `getAppQueries()` extension point.
   - `Common\Core\Rendering\RendersClientSideApp::clientSideOrPrerenderedResponse`
     — given a `pageName`, injects `seo.{page}.seo-tags` into the SPA
     bootstrap payload and serves `seo.{page}.prerender` as real HTML when
     `isCrawler()`.
   Consequence: **no new composer packages.** No `spatie/laravel-sitemap`,
   no `diglactic/laravel-breadcrumbs`, no SEO package.
3. **`Common\Comments` is complete and reusable.** Threading via
   `parent_id` + materialised `path`, `CommentVote`, `CommentReport`,
   `CommentPolicy` (permission-gated), reply notifications, infinite-scroll
   React components, and an admin datatable.
4. **Comment morph types need explicit registration.**
   `modelTypeToNamespace()` (`common/foundation/src/helpers.php`) falls back
   to `App\Models\{StudlyModelName}`, then to `Relation::getMorphedModel()`.
   A `Common\Blog\Models\BlogArticle` would **not** resolve via the fallback
   (compare `Common\Help\Models\HelpArticle`), so
   `CommentableController::index()` would fail. The blog therefore registers
   a morph map entry (§5.4).
5. **`GenerateSitemap` already prefers an app-level generator:**
   ```php
   $sitemap = class_exists('App\Core\SitemapGenerator')
       ? app('App\Core\SitemapGenerator')
       : app(BaseSitemapGenerator::class);
   ```
   So adding blog sitemap support means creating one new class and editing
   no shared sitemap file (§6.5).
6. **`public/robots.txt` never advertises the sitemap.** It is currently
   `User-agent: *` / `Disallow:` — a blank allow-everything file. The sitemap
   generator exists and is admin-triggerable but undiscoverable.
7. **Articles are category-independent in the URL** (owner decision), so
   recategorising never breaks a link.

## 4. Architecture

| Layer | Location |
| --- | --- |
| Backend | `common/foundation/src/Blog/` |
| Client (public) | `common/foundation/resources/client/blog/` |
| Client (admin) | `common/foundation/resources/client/admin/blog/` |
| SEO views | `resources/views/seo/blog-{index,category,article}/` |
| Migrations | `database/migrations/2026_10_08_0000{3,4}_create_blog_*.php` |

`Common\Blog\` mirrors `Common\Help\`: a platform-level public content module
in the shared `Common\` namespace rather than the tenant-level `app\`
namespace.

Controllers use `clientSideOrPrerenderedResponse(['pageName' => ..., 'loader'
=> ..., 'data' => ...])` and are registered **twice** — once in
`routes/web.php` (HTML + SEO + crawler prerender) and once in `routes/api.php`
(JSON for react-query). This is the established `LandingPageController`
pattern: the same method returns HTML for web requests and JSON for API
requests because `clientSideOrPrerenderedResponse` branches on
`isApiRequest()`.

## 5. Data model

### 5.1 `blog_categories`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `id()` | |
| `name` | `string` | |
| `slug` | `string` | unique |
| `description` | `text` | nullable; used for category SEO description |
| `views` | `unsignedBigInteger` | default 0 |
| `sort_id` | `bigInteger` | default 0; manual ordering |
| timestamps | | |

### 5.2 `blog_articles`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `id()` | |
| `blog_category_id` | `foreignId` | → `blog_categories`, `cascadeOnDelete` |
| `author_id` | `foreignId` | nullable → `users`, `nullOnDelete` |
| `title` | `string` | |
| `slug` | `string` | unique |
| `excerpt` | `text` | nullable; fallback for `meta_description` |
| `body` | `longText` | sanitised HTML (TipTap output) |
| `body_text` | `longText` | plain text; reading time, word count, Scout, schema |
| `cover_image` | `string` | nullable; `Common\Files` entry path |
| `meta_title` | `string` | nullable override |
| `meta_description` | `string` | nullable override |
| `status` | `enum(draft, published)` | default `draft` |
| `published_at` | `timestamp` | nullable |
| `reading_time_minutes` | `unsignedSmallInteger` | computed on save |
| `views` | `unsignedBigInteger` | default 0 |
| timestamps | | |

Indexes: `(status, published_at)`, `blog_category_id`, `slug` (unique).

**Scheduling** needs no third status: an article with `status = published`
and a future `published_at` is scheduled. The public scope filters
`status = published AND published_at <= now()`.

### 5.3 Slug policy

Generated once on create; **never auto-regenerated on title edit**. A
retitled article keeps its URL so rankings and backlinks survive. Admin
allows a manual override.

The generator reuses the transliterating approach from the marketbob
reference (`App\Methods\SlugTranslation`: ä→ae, ß→ss, Œ→OE, İ, ı, Ő, ű)
rather than bare `Str::slug`, which yields empty slugs for some non-Latin
titles. Existing `Common\Help\Models\Concerns\HasUniqueSlug` already solves
uniqueness with a `-2`, `-3` suffix; the blog needs its own equivalent
because `HasUniqueSlug::generateUniqueSlug` is generic over the model and
the blog table differs.

### 5.4 Morph map

Register in a service provider:

```php
Relation::morphMap(['blogArticle' => BlogArticle::class]);
```

Required by finding §3.4. Without it comment resolution fails.

### 5.5 Comments — no migration

The shared `comments` table is reused via `commentable_type = 'blogArticle'`
(20 chars, fits the existing `string(30)`). `BlogArticle` implements the
`Commentable` contract. No changes to `Common\Comments`, the `comments`
table, `CommentPolicy`, or any existing comment feature.

## 6. SEO

### 6.1 URLs

| Path | Route name | `pageName` |
| --- | --- | --- |
| `/blog` | `blog.index` | `blog-index` |
| `/blog/categories` | 301 → `blog.index` | — |
| `/blog/categories/{slug}` | `blog.category` | `blog-category` |
| `/blog/{slug}` | `blog.article` | `blog-article` |
| `/blog/feed` | `blog.feed` | RSS 2.0 (XML, not SPA) |

`/blog/categories` redirects so the path can never resolve to an article
titled "categories". Article URLs carry no category segment, so moving an
article between categories never changes its URL.

`'blog'` is added to `FallbackRouteController::CLIENT_ROUTES` so a stray
`/blog` path never falls through to linkeable short-code resolution.

### 6.2 URL generator

Add to `Common\Core\Prerender\BaseUrlGenerator`:

```php
public function blogIndex(): string { return url('blog'); }
public function blogCategory($category): string { return url("blog/categories/{$category->slug}"); }
public function blogArticle($article): string { return url("blog/{$article->slug}"); }
```

These are the single source of truth for canonical URLs, `og:url`, sitemap
`loc`, and RSS `link`.

### 6.3 SEO views

Three directories, each with `seo-tags.blade.php` and `prerender.blade.php`:
`resources/views/seo/blog-index/`, `blog-category/`, `blog-article/`.

`seo-tags` emits, per page type:

- `<link rel="canonical">` — self-referencing on every page including
  paginated ones (not canonical-to-page-1, which discards deep-page
  signals), plus `rel=prev`/`rel=next` on paginated index/category pages.
- `og:type` = `article` on articles, `website` on index/category.
- `article:published_time`, `article:modified_time`, `article:section`,
  `article:author`.
- `twitter:card` = `summary_large_image` when `cover_image` is set, else
  `summary`.
- `og:image` from `cover_image`, falling back to a new
  `branding.social_image` setting.
- Per-article `meta_title` / `meta_description` override title / excerpt.
- `robots` — indexable for published content. `noindex, follow` only on the
  blog index when a `?search=` filter returns zero results, so empty search
  pages do not accumulate as thin duplicate content.

`prerender` extends `common::prerender.base` and renders real server-side
HTML: title, meta description, cover image, article body, byline with
publish date and reading time.

### 6.4 JSON-LD

Hand-rolled blade arrays, matching the existing
`resources/views/seo/digital-product/seo-tags.blade.php` precedent. No
`spatie/schema-org` dependency.

- **`BlogPosting`** — `headline`, `description`, `image`, `datePublished`
  and `dateModified` as full ISO-8601 (marketbob emits date-only), `author`
  as a `Person` (marketbob always emits `Organization`), `publisher` as
  `Organization` with `logo`, `wordCount`, `commentCount`,
  `articleSection`, `inLanguage`, and `mainEntityOfPage` as a
  `{"@type":"WebPage","@id":...}` object (marketbob emits a bare string).
- **`BreadcrumbList`** — Home → Blog → Category → Article.
- **`WebSite`** with `SearchAction` targeting blog search.
- **`Organization`** with `branding.site_name` and `branding.logo_dark`.

### 6.5 Sitemap

Create `app/Core/SitemapGenerator.php`:

```php
namespace App\Core;

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

`GenerateSitemap` and `SitemapController` both already prefer
`App\Core\SitemapGenerator` when the class exists, so the existing
`sitemap:generate` command and `POST /api/v1/sitemap/generate` admin button
pick up the blog with **no shared-file edit**. `BaseSitemapGenerator` writes
to `public/storage/sitemaps/sitemap-index.xml` and calls
`getModelUrl()` → `app(AppUrlGenerator::class)->{Str::camel(class_basename($model))}($model)`,
which resolves to the §6.2 methods automatically.

`public/robots.txt` gains one line:

```
Sitemap: {app.url}/storage/sitemaps/sitemap-index.xml
```

Schedule `sitemap:generate` (currently not scheduled — verify
`routes/console.php` and add if absent) so `lastmod` stays fresh.

### 6.6 RSS

Hand-rolled RSS 2.0 at `/blog/feed` (~50 lines, a dedicated view), limited
to the latest 20 published articles, **summary-only** using `excerpt`.
Consistent with the hand-rolled meta-tag and sitemap approach; no
`laravel/feed` dependency. Full-content feeds are a later change and need no
schema work.

### 6.7 HTML sanitisation

`body` is sanitised **server-side with `ezyang/htmlpurifier`** (already
installed) on write, and again on render. The Help Center sanitises only
client-side (`sanitizeHelpHtml`), which is too weak to rely on.

## 7. Comments

`BlogArticle implements Commentable`. The existing `CommentList` and
`NewCommentForm` components render unchanged. Because the decision is
logged-in-only, guests see the existing `<AccountRequiredCard>` prompt and
`CommentPolicy` (`comments.create` permission) needs no relaxation.

Free with no new code: threaded replies, votes, reports, reply
notifications, infinite scroll, and admin moderation via the existing
comments datatable.

## 8. Admin

Following `client/admin/custom-pages/` and `client/admin/help/`:

- `admin/blog/` — articles datatable (title, category, status, author,
  published date, views) with filters and CSV-ready columns.
- Article form dialog reusing `client/article-editor/` (TipTap) — the
  pre-existing shared editor, not Help-Center-specific.
- Category form dialog.
- Cover image via `Common\Files` upload machinery and the existing upload
  backends + `intervention/image`; no new image pipeline.
- Gated by an `admin/blog.*` permission set, consistent with existing
  admin resources.

## 9. Feature flag

`blog.enabled` lives in the runtime `Settings` store (not `config/blog.php`)
so it can be toggled from the admin UI without a deploy. Middleware returns
**404**, not 403, so a disabled blog disappears from search indexes rather
than advertising itself as forbidden. Mirrors marketbob's `blog.disable`
middleware and lets the blog be kept dark while seeding real content.

## 10. Performance

- `with('category')` on every list query. The marketbob reference N+1s on
  its own card partial; this is explicitly avoided.
- `simplePaginate` for index and category lists.
- `Cache::remember` on index/category queries, keyed on the latest article
  `updated_at` so publishing invalidates naturally.
- ETag and `Last-Modified` on article responses so repeat crawler hits
  return 304 instead of re-rendering.
- Cookie-deduped view counter (marketbob's `incrementViews` pattern): one
  increment per visitor per article per day, no extra table.
- Scout indexes `title`, `excerpt`, and `body_text` — **not** raw `body`,
  because indexing markup pollutes relevance.

## 11. Error handling

| Case | Behaviour |
| --- | --- |
| Unknown article slug | 404 |
| Unknown category slug | 404 |
| Article in `draft`, or `published_at` in future | 404 publicly (not 403 — must not leak existence) |
| Disabled blog | 404 |
| Admin edits a slug | Old URL 404s; admin UI warns that existing links break (no automatic redirect history in v1) |
| Missing `cover_image` | `og:image` falls back to `branding.social_image`; `twitter:card` drops to `summary` |
| Missing `excerpt` | Falls back to first 160 chars of `body_text` |
| Missing `author_id` | JSON-LD `author` falls back to `Organization` |

## 12. Testing

Pest feature tests:

- Public scope hides `draft` and future-`published_at` articles.
- Slug generation, transliteration, and uniqueness suffixes; slug survives
  a title edit.
- `seo-tags` blade output contains canonical, `og:type=article`,
  `article:published_time`, and `BlogPosting` JSON-LD for a published
  article; and omits them for a draft.
- A crawler user agent on `/blog/{slug}` returns prerendered HTML
  containing the article title; a browser user agent returns the SPA shell.
- RSS output is well-formed and contains only published articles.
- Sitemap contains published article and category URLs, excludes drafts.
- Comment creation on an article resolves the `blogArticle` morph type.
- Admin CRUD requires the `admin/blog.*` permissions.
- `blog.enabled = false` returns 404.

## 13. Implementation order

Each phase is independently useful; the work can stop after any of them.
Phase 4 must not precede phase 3 — a sitemap pointing at pages that emit
wrong canonicals is worse than no sitemap.

1. **Schema and admin** — migrations, models, morph map, admin CRUD, editor.
   Nothing public yet.
2. **Public pages and comments** — controllers, routes, React pages, comments.
   Blog goes dark → real.
3. **SEO layer** — `seo-tags` and `prerender` views, `BaseUrlGenerator`
   methods, JSON-LD, canonical, OG/Twitter.
4. **Discovery** — `App\Core\SitemapGenerator`, `robots.txt` `Sitemap:` line,
   RSS feed, schedule `sitemap:generate`.
5. **Hardening** — caching, ETag/`Last-Modified`, view counts, Scout
   indexing, `blog.enabled` flag.

## 14. Files

**New — backend**

```
database/migrations/2026_10_08_000003_create_blog_categories_table.php
database/migrations/2026_10_08_000004_create_blog_articles_table.php
common/foundation/src/Blog/Models/BlogArticle.php
common/foundation/src/Blog/Models/BlogCategory.php
common/foundation/src/Blog/Models/Concerns/TransliteratesSlugs.php
common/foundation/src/Blog/Http/Controllers/BlogController.php
common/foundation/src/Blog/Http/Controllers/AdminBlogArticleController.php
common/foundation/src/Blog/Http/Controllers/AdminBlogCategoryController.php
common/foundation/src/Blog/Http/Requests/{Store,Update}BlogArticleRequest.php
common/foundation/src/Blog/Http/Resources/{BlogArticle,BlogCategory}Resource.php
common/foundation/src/Blog/Actions/{BuildBlogSitemap,IncrementArticleViews,SanitizeBlogHtml}.php
app/Core/SitemapGenerator.php
```

**New — client**

```
common/foundation/resources/client/blog/{blog-queries.ts,blog-index-page.tsx,blog-category-page.tsx,blog-article-page.tsx,blog-routes.tsx}
common/foundation/resources/client/blog/components/{blog-card,blog-cover,blog-body,breadcrumbs,reading-time,related-articles}.tsx
common/foundation/resources/client/admin/blog/{admin-blog-routes.tsx,blog-articles-datatable-page.tsx,blog-article-form-dialog.tsx,blog-categories-tab.tsx,blog-category-form-dialog.tsx,blog-admin-queries.ts}
```

**New — views**

```
resources/views/seo/blog-index/{seo-tags,prerender}.blade.php
resources/views/seo/blog-category/{seo-tags,prerender}.blade.php
resources/views/seo/blog-article/{seo-tags,prerender}.blade.php
resources/views/blog/feed.blade.php
```

**Modified (minimal, additive)**

```
common/foundation/src/Core/Prerender/BaseUrlGenerator.php   (+3 methods)
public/robots.txt                                          (+1 Sitemap: line)
routes/web.php                                             (+blog group)
routes/api.php                                             (+blog API group)
common/foundation/src/Links/Controllers/FallbackRouteController.php  (+'blog' to CLIENT_ROUTES)
app/Providers/*ServiceProvider.php                          (+morphMap)
routes/console.php                                         (+sitemap:generate schedule, if absent)
```

Not modified: `Common\Comments/*`, `BaseSitemapGenerator`, `MetaTags`,
`HandleSeo`, `BaseSitemapGenerator`, `help_*` tables, `comments` table.

## 15. Open items for the implementation plan

Only convention-matching details remain, to be settled against the existing
code while writing the plan:

- Exact admin route paths and the `admin/blog.*` permission names, following
  `client/admin/custom-pages/` and the existing role seeder.
- Where the `blog.enabled` Settings entry is registered, so the admin toggle
  has a home consistent with other runtime settings.

Everything else is decided above. The plan will be written and executed in
the five phases of §13, and it will likely be split into five separate
checkpoints, since each phase is independently shippable.