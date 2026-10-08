# Help Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Help Center module for Linket (categories, articles, search, feedback, admin management) following Linket's existing patterns.

**Architecture:** API-first backend in `Common\Help` namespace with JSON resources; public pages as React Router lazy pages fetching via TanStack Query; admin as settings/datatable pages with TipTap editor. No Inertia, no Blade, no new packages — reuse existing TipTap, Scout, shadcn, TanStack infrastructure.

**Tech Stack:** Laravel 12, React 19 + React Router, TanStack Query/Table, TipTap (`@tiptap/react`, `articleEditorTipTapExtensions`), Laravel Scout, shadcn, Pest/PHPUnit.

**Spec:** `docs/superpowers/specs/2026-10-07-help-center-design.md`

## Global Constraints

- Module lives in `common/foundation/src/Help/` with `Common\Help\` namespace (PSR-4: `Common\` → `common/foundation/src/`).
- No new composer/npm dependencies; reuse `cocur/slugify` via `Str::slug`, Scout, TipTap, shadcn, TanStack.
- Public web rendering goes through `FallbackRouteController` fallback → client app; data flows via `v1/help/*` JSON API, not Blade.
- Admin endpoints authorize via `Gate::authorize('admin.access')` (same as `AdminKycVerificationsController`).
- Article `body` is TipTap HTML; render with sanitized HTML output, never raw unescaped user input without purification.
- Follow existing code style: `$guarded = []`, `$casts`, API Resources, `authGuard({permission})` on client admin routes.

## Review Focus

- Slug collision on duplicate category/article names must produce unique slugs, not 500s.
- Deleting a category with articles must be blocked with 422, not cascade-wipe content silently.
- `react` endpoint with invalid action must 422, not increment anything.
- Search with empty string must return full index, not empty set.
- Article body containing `<script>` must not execute (sanitized render).

---

### Task 1: Database + Models

**Files:**
- Create: `database/migrations/2026_10_08_000001_create_help_categories_table.php`
- Create: `database/migrations/2026_10_08_000002_create_help_articles_table.php`
- Create: `common/foundation/src/Help/Models/HelpCategory.php`
- Create: `common/foundation/src/Help/Models/HelpArticle.php`
- Create: `common/foundation/src/Help/Scopes/SortByIdScope.php`
- Create: `common/foundation/src/Help/Models/Concerns/HasUniqueSlug.php`
- Test: `tests/Unit/Help/HelpSlugTest.php`

**Interfaces:**
- Consumes: nothing (foundation task).
- Produces:
  - `Common\Help\Models\HelpCategory` (fillable: `name,slug,views,sort_id`; relations: `articles(): HasMany`; scope: `SortByIdScope` default ordering by `sort_id ASC`)
  - `Common\Help\Models\HelpArticle` (fillable: `title,slug,body,short_description,views,likes,dislikes,help_category_id`; relations: `category(): BelongsTo`; `Searchable`, `toSearchableArray(): array{id,title,short_description,body}`)
  - `Common\Help\Models\Concerns\HasUniqueSlug::generateUniqueSlug(string $source, string $column, ?int $ignoreId): string`
  - `Common\Help\Scopes\SortByIdScope` (applies `orderBy('sort_id','asc')`)

- [ ] **Step 1: Write the failing test** in `tests/Unit/Help/HelpSlugTest.php`:

```php
public function test_duplicate_names_produce_unique_slugs(): void
{
    $a = HelpCategory::create(['name' => 'Getting Started']);
    $b = HelpCategory::create(['name' => 'Getting Started']);
    $this->assertNotEquals($a->slug, $b->slug);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Unit/Help/HelpSlugTest.php`
Expected: FAIL (class/table not found).

- [ ] **Step 3: Create the two migrations** (categories: `id,name,slug unique,views default 0,sort_id default 0,timestamps`; articles: `id,title,slug unique,body longtext,short_description varchar(200),views/likes/dislikes default 0,help_category_id FK cascade,timestamps`).

- [ ] **Step 4: Implement `HasUniqueSlug`, `SortByIdScope`, both models** (`Str::slug` + counter loop; `booted()` hooks auto-fill slug on creating/updating; category `booted()` adds global scope; article uses `Searchable` with `toSearchableArray` returning id/title/short_description/body).

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test tests/Unit/Help/HelpSlugTest.php`
Expected: PASS. Also run `php artisan migrate --force` locally and confirm tables exist.

- [ ] **Step 6: Commit**

```bash
git add database/migrations/2026_10_08_00000*.php common/foundation/src/Help tests/Unit/Help/HelpSlugTest.php
git commit -m "feat(help): add categories/articles tables, models, unique slugs"
```

---

### Task 2: Public API (read + feedback)

**Files:**
- Create: `common/foundation/src/Help/Http/Resources/HelpCategoryResource.php`
- Create: `common/foundation/src/Help/Http/Resources/HelpArticleResource.php`
- Create: `common/foundation/src/Help/Http/Controllers/HelpController.php`
- Modify: `routes/api.php` (add `v1/help` group)
- Modify: `app/Links/Controllers/FallbackRouteController.php` (add `'help'` to `CLIENT_ROUTES`)
- Test: `tests/Feature/Help/PublicHelpTest.php`

**Interfaces:**
- Consumes: `HelpCategory`, `HelpArticle` from Task 1.
- Produces:
  - `GET /api/v1/help` → `{categories: HelpCategoryResource[] (each with up to 8 articles), commonCategories: HelpCategoryResource[]}`; `?search=` filters by name/slug/title/body/short_description
  - `GET /api/v1/help/categories/{slug}` → `{category, articles: paginated 20}`
  - `GET /api/v1/help/articles/{slug}` → `{article, relatedArticles: HelpArticleResource[] (10, same category, random)}`; increments `views`
  - `POST /api/v1/help/articles/{slug}/react` body `{action: 1|2}` → increments `likes`/`dislikes`, returns `{message}`; invalid action → 422, nothing incremented

- [ ] **Step 1: Write the failing test** in `tests/Feature/Help/PublicHelpTest.php`:

```php
public function test_help_index_lists_categories_with_articles(): void
{
    $response = $this->getJson('/api/v1/help');
    $response->assertOk()->assertJsonStructure(['categories', 'commonCategories']);
}

public function test_react_with_invalid_action_changes_nothing(): void
{
    $category = HelpCategory::create(['name' => 'General']);
    $article = HelpArticle::create([
        'title' => 'How to start', 'body' => '<p>Body</p>',
        'short_description' => 'Short', 'help_category_id' => $category->id,
    ]);
    $this->postJson("/api/v1/help/articles/{$article->slug}/react", ['action' => 99])->assertStatus(422);
    $this->assertEquals(0, $article->fresh()->likes + $article->fresh()->dislikes);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/Help/PublicHelpTest.php`
Expected: FAIL (404 routes).

- [ ] **Step 3: Implement resources** (`HelpCategoryResource`: id,name,slug,views + nested `articles` when loaded; `HelpArticleResource`: id,title,slug,short_description,body,views,likes,dislikes,help_category_id,category slug/name when loaded, created_at).

- [ ] **Step 4: Implement `HelpController`** with `index, category, article, react` mirroring MarketBob logic (common categories = top 4 by views; index without search loads categories with first 8 articles; with `search` filters via LIKE on both tables; category increments category views; article increments article views + loads 10 random related from same category; react validates `action in:1,2`).

- [ ] **Step 5: Register routes in `routes/api.php`** inside the `v1` group (public, no auth): `GET help`, `GET help/categories/{slug}`, `GET help/articles/{slug}`, `POST help/articles/{slug}/react`. Add `'help'` to `FallbackRouteController::CLIENT_ROUTES` so `/help/*` renders the client app.

- [ ] **Step 6: Run test to verify it passes**

Run: `php artisan test tests/Feature/Help/PublicHelpTest.php`
Expected: PASS. Also run `php artisan route:list --path=help` and confirm 4 routes.

- [ ] **Step 7: Commit**

```bash
git add common/foundation/src/Help/Http routes/api.php app/Links/Controllers/FallbackRouteController.php tests/Feature/Help/PublicHelpTest.php
git commit -m "feat(help): add public help API and fallback routing"
```

---

### Task 3: Admin API (CRUD + sort)

**Files:**
- Create: `common/foundation/src/Help/Http/Controllers/AdminHelpCategoryController.php`
- Create: `common/foundation/src/Help/Http/Controllers/AdminHelpArticleController.php`
- Modify: `routes/api.php` (add `v1/admin/help` group)
- Test: `tests/Feature/Help/AdminHelpTest.php`

**Interfaces:**
- Consumes: models + resources from Tasks 1–2.
- Produces:
  - `AdminHelpCategoryController`: `index(?search)`, `store(name,slug?)`, `show`, `update`, `destroy` (blocked 422 if articles exist), `sort(ids: int[])` — all gated by `Gate::authorize('admin.access')`
  - `AdminHelpArticleController`: `index(?search,?category)`, `store(title,slug?,category_id,body,short_description)`, `show`, `update`, `destroy` — same gate; validation: title required max 255, slug alpha_dash unique, body required, short_description required max 200

- [ ] **Step 1: Write the failing test** in `tests/Feature/Help/AdminHelpTest.php`:

```php
public function test_cannot_delete_category_with_articles(): void
{
    $admin = $this->createAdmin();
    $this->actingAs($admin);
    $category = HelpCategory::create(['name' => 'General']);
    HelpArticle::create([
        'title' => 'How to start', 'body' => '<p>Body</p>',
        'short_description' => 'Short', 'help_category_id' => $category->id,
    ]);
    $response = $this->stateful()->deleteJson("/api/v1/admin/help/categories/{$category->id}");
    $response->assertStatus(422);
    $this->assertDatabaseHas('help_categories', ['id' => $category->id]);
}

public function test_guest_cannot_create_article(): void
{
    $this->postJson('/api/v1/admin/help/articles', [])->assertForbidden();
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/Help/AdminHelpTest.php`
Expected: FAIL (routes missing).

- [ ] **Step 3: Implement both controllers** following `AdminKycVerificationsController` shape (explicit methods, `Gate::authorize('admin.access')` first line, `$request->validate([...])`, paginate 15–50 with `perPage` param). Slug auto-generated via `HasUniqueSlug` when blank. `sort` validates `ids array of existing ids`, updates `sort_id` sequentially.

- [ ] **Step 4: Register routes in `routes/api.php`** inside the authenticated `v1` group: `apiResource('admin/help/categories')` + `POST admin/help/categories/sort` + `apiResource('admin/help/articles')`.

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test tests/Feature/Help/AdminHelpTest.php`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add common/foundation/src/Help/Http/Controllers/Admin*.php routes/api.php tests/Feature/Help/AdminHelpTest.php
git commit -m "feat(help): add admin help CRUD and sort API"
```

---

### Task 4: Public React pages

**Files:**
- Create: `common/foundation/resources/client/help/help-queries.ts`
- Create: `common/foundation/resources/client/help/help-index-page.tsx`
- Create: `common/foundation/resources/client/help/help-category-page.tsx`
- Create: `common/foundation/resources/client/help/help-article-page.tsx`
- Create: `common/foundation/resources/client/help/components/help-search.tsx`
- Create: `common/foundation/resources/client/help/components/help-category-card.tsx`
- Create: `common/foundation/resources/client/help/components/article-feedback.tsx`
- Create: `common/foundation/resources/client/help/components/related-articles.tsx`
- Modify: `common/foundation/resources/client/core/common-routes.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/help*` JSON from Task 2.
- Produces:
  - `helpIndexOptions(search?)`, `helpCategoryOptions(slug)`, `helpArticleOptions(slug)`, `useReactToArticle()` (TanStack Query options + mutation, `api/` fetch client like `use-submit-contact-form.ts`)
  - Route objects: `help` (index), `help/categories/:slug`, `help/articles/:slug` — each with `loader` prefetching its query + `lazy` page import

- [ ] **Step 1: Write the failing check** — add routes, run typecheck:

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: FAIL (modules `@common/help/*` not found).

- [ ] **Step 2: Implement `help-queries.ts`** mirroring `contact/use-submit-contact-form.ts` + `landing/use-landing-page-data.ts` patterns (query keys `['help', ...]`, fetch via shared api client, `react` as mutation POST).

- [ ] **Step 3: Implement pages + components** following `contact-us-page.tsx` layout (Header + Footer + Card, `StaticPageTitle`, `Trans`, shadcn Card/Button/Input): index = hero search + common-topics chips + responsive category grid (1/2/3 col); category = search header + article list + pagination; article = breadcrumbs + title/date + HTML body + feedback + related sidebar (stacked on mobile).

- [ ] **Step 4: Register routes in `common-routes.tsx`** under `help` path with loaders using `queryClient.ensureQueryData(...)`.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS. Then `npm run build` (vite) succeeds; manually visit `/help`, `/help/categories/:slug`, `/help/articles/:slug` in dev and confirm render + search + feedback toast.

- [ ] **Step 6: Commit**

```bash
git add common/foundation/resources/client/help common/foundation/resources/client/core/common-routes.tsx
git commit -m "feat(help): add public help center pages"
```

---

### Task 5: Article body editor (TipTap reuse) + safe rendering

**Files:**
- Create: `common/foundation/resources/client/help/components/help-article-body.tsx`
- Create: `common/foundation/resources/client/help/components/help-article-editor.tsx`
- Modify: Task 4 article page to use `HelpArticleBody`; Task 6 dialog to use `HelpArticleEditor` (see Task 6).

**Interfaces:**
- Consumes: `articleEditorTipTapExtensions` from `@common/article-editor/article-editor-tiptap-extensions`, `TipTapEditorProvider`, `TiptapEditorContent`, existing menubar buttons.
- Produces:
  - `HelpArticleEditor({value, onChange}: {value: string; onChange: (html: string) => void})` — TipTap provider + menubar + content, outputs HTML string
  - `HelpArticleBody({html}: {html: string})` — renders sanitized HTML (`prose` classes + DOMPurify-style sanitization via existing `html` helpers; strips `<script>`/event handlers)

> Note: do NOT run `npx @tiptap/cli add simple-editor` — Linket already ships a full TipTap setup; that CLI would scaffold a duplicate template and conflict. Reuse the existing extensions/provider.

- [ ] **Step 1: Write the failing check** — render `<HelpArticleBody html="<script>alert(1)</script><p>hi</p>" />` in a vitest/jsdom test, assert no `script` tag in output.

Run: `npm run test -- help-article-body`
Expected: FAIL (component missing).

- [ ] **Step 2: Implement both components** (`HelpArticleEditor` wraps `TipTapEditorProvider` with `articleEditorTipTapExtensions`, wires `onChange` to `editor.getHTML()`; `HelpArticleBody` sanitizes then `dangerouslySetInnerHTML` inside `prose max-w-none`).

- [ ] **Step 3: Verify**

Run: `npm run test -- help-article-body && npx tsc --noEmit -p tsconfig.json`
Expected: PASS, script stripped, formatting preserved.

- [ ] **Step 4: Commit**

```bash
git add common/foundation/resources/client/help/components/help-article-*.tsx
git commit -m "feat(help): add tiptap article editor and safe body renderer"
```

---

### Task 6: Admin management pages

**Files:**
- Create: `common/foundation/resources/client/admin/help/help-categories-page.tsx`
- Create: `common/foundation/resources/client/admin/help/help-articles-page.tsx`
- Create: `common/foundation/resources/client/admin/help/category-form-dialog.tsx`
- Create: `common/foundation/resources/client/admin/help/article-form-dialog.tsx`
- Modify: `resources/client/admin/admin-routes.tsx` (add `settings/help` child route via `commonAdminSettingsRoutes` appRoutes array)
- Modify: `resources/client/admin/admin-config.tsx` (add nav item if app-level nav exists)

**Interfaces:**
- Consumes: admin API from Task 3, `HelpArticleEditor` from Task 5, `CrupdateResourceLayout`, `useSortable`, `react-hook-form`, TanStack Table (same as KYC/stores admin pages).
- Produces:
  - Route `admin/settings/help` (guard `settings.update`, loader prefetches categories) with tabs: Categories (drag-sort table + create/edit/delete) and Articles (search + category filter + paginated table + create/edit/delete with TipTap + slug field)

- [ ] **Step 1: Write the failing check** — add route entries, run typecheck:

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: FAIL (pages missing).

- [ ] **Step 2: Implement categories page + dialog** (table with `useSortable` drag → POST `admin/help/categories/sort`; dialog with name/slug fields, slug auto-suggest from name via `Str::slug`-equivalent client `slugify`).

- [ ] **Step 3: Implement articles page + dialog** (filters by search + category, TanStack Table, pagination; dialog with title/slug/category-select/short_description + `HelpArticleEditor` for body).

- [ ] **Step 4: Wire route + nav** in `admin-routes.tsx` appRoutes (`{path: 'help', lazy: ...}`) so it appears under Settings.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS. Manually: login as admin → `/admin/settings/help` → create category → create article with formatted body → reorder categories → delete blocked when articles exist (422 toast).

- [ ] **Step 6: Commit**

```bash
git add common/foundation/resources/client/admin/help resources/client/admin/admin-routes.tsx resources/client/admin/admin-config.tsx
git commit -m "feat(help): add admin help management pages"
```

---

### Task 7: Search, SEO, polish, full verification

**Files:**
- Modify: `common/foundation/src/Help/Models/HelpArticle.php` (confirm Scout config, `shouldBeSearchable`, Scout import command note)
- Modify: public pages from Task 4 (add `StaticPageTitle`, meta description from `short_description`, JSON-LD article schema)
- Create: `tests/e2e/help-center.spec.ts` (Playwright: index → category → article → feedback)
- Modify: `orval.config.ts` output regen (run `npm run api-docs` or `composer api-docs` per repo script) if admin/public API types are generated.

**Interfaces:**
- Consumes: everything above.
- Produces: Scout-indexed articles (`php artisan scout:import "Common\Help\Models\HelpArticle"` works); SEO tags on all three public pages; green test suite.

- [ ] **Step 1: Enable Scout indexing** — verify `toSearchableArray` + run `php artisan scout:import "Common\Help\Models\HelpArticle"`; optionally swap `HelpController@index` search to `HelpArticle::search($term)` when Scout driver available, falling back to LIKE.

- [ ] **Step 2: Add SEO** — `StaticPageTitle` + meta description + canonical per page; article page emits JSON-LD `Article` schema.

- [ ] **Step 3: Write Playwright spec** covering: search narrows categories, category paginates, article feedback posts once and shows thanks, admin sort persists after reload.

- [ ] **Step 4: Full verification**

Run: `php artisan test tests/Unit/Help tests/Feature/Help` → PASS; `npx tsc --noEmit -p tsconfig.json` → PASS; `npx playwright test tests/e2e/help-center.spec.ts` → PASS; `vendor/bin/phpstan analyse common/foundation/src/Help --level=5` → no errors.

- [ ] **Step 5: Commit**

```bash
git add common/foundation/src/Help common/foundation/resources/client/help tests/e2e/help-center.spec.ts
git commit -m "feat(help): add search indexing, SEO, and e2e coverage"
```
