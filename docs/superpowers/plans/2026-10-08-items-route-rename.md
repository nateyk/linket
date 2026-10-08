# Items Route Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename all user-facing product URLs to marketbob-style `items` with a clean break (old URLs 404, no aliases).

**Architecture:** Path-segment rename only, applied atomically across backend API, admin SPA, and dashboard SPA in one branch. Internal names (`DigitalProduct` model, folders, components, tables, route params) stay untouched.

**Tech Stack:** Laravel (API routes in `common/foundation/routes/api.php`), React Router v7 (admin/dashboard route configs), vitest, PHPUnit.

**Spec:** `docs/superpowers/specs/2026-10-08-items-route-rename-design.md`

## Global Constraints

- Clean break: no redirects, no deprecated API aliases — old paths must 404.
- Internal names stay: `DigitalProduct`, `digital-products/` folders, `{digitalProduct}` params, widget `source: 'digital-products'`, filesystem prefix, storage paths.
- Public storefront API (`public/.../digital-products/...`) and checkout endpoints (`digital-products/{digitalProduct}/public`, `.../checkout`) are NOT renamed (payment-critical surface).
- `admin/items/updated` is NOT built (reserved path only).
- Never commit the ~60 uncommitted user-WIP files or tooling dirs; stage only plan-listed files.
- Run frontend vitest alone — never concurrently with the backend suite (CPU-contention flakes).

## Review Focus

- Stored `client.dashboard.homepage = 'digital-products'` must still land on `/dashboard/items` and the settings select must not render blank — Task 4 pins this.
- Admin-customized menu items stored in DB still point at old paths and will 404 after the clean break — expected; Task 4 adds a release-note line, no code.
- The executor must NOT rename public/checkout API segments — Task 1 names the exact line ranges to change and the ones to leave.
- Deep links under the new prefix (e.g. `items/new/details?type=course` course forward) must keep working — Task 3 pins this with the existing loader test.
- `composer api-docs` regen must not leave stale `digital-products` paths in `api.json`/`api-public.json`/`gen/` — Task 5 pins with a grep.

---

## File structure

Backend renames live in route registrations plus three hardcoded-URL
files; frontend renames live in the two route configs plus link sweeps.
No new files except the data-migration-free approach below (no migration
needed — legacy homepage value is normalized in the frontend).

## Task 1: Backend API paths → `items/…`

**Files:**
- Modify: `common/foundation/routes/api.php` (lines 232–261 only)
- Modify: `app/Providers/AppServiceProvider.php` (lines ~219, ~221, statistics routes)
- Modify: `common/foundation/resources/defaults/menu-editor-config.php` (line 100: `/admin/digital-products` → `/admin/items`)
- Modify: `app/Storefront/Notifications/ProductModerationNotification.php` (lines ~55, ~76, ~148–149: `/dashboard/my-products…` → `/dashboard/items…`)
- Modify: `app/Storefront/Notifications/ProductModerationSummaryNotification.php` (lines ~59, ~78)
- Modify: `app/Storefront/Jobs/SendStorefrontReviewNotification.php` (line ~40)
- Modify: backend tests under `tests/` whose request URLs contain `digital-products` (~20 files; enumerate with `grep -rln "digital-products" tests/`)
- Test: `ddev exec php artisan test --filter=ProductReviews` plus affected filters

**Interfaces:**
- Consumes: nothing (first task).
- Produces: API serves `items/…` and `admin/items/…`; all backend tests hit new paths. Later tasks rely on these exact prefixes for frontend query functions.

**Do NOT touch:** api.php lines 323–346 (public), 362–363 (checkout), `PublicDigitalProductPageController` endpoint strings, `DigitalProductVisibility` widget `source`, `config/filesystems.php`, `DeployHealthCommand` public path.

- [ ] **Step 1: Update backend tests to the new paths first**

  In every file from `grep -rln "digital-products" tests/`, replace the
  `digital-products` URI segment with `items` in request URLs only (not
  class names). Leave public/checkout URL assertions unchanged.

- [ ] **Step 2: Run the review + product tests to verify they fail**

  Run: `ddev exec php artisan test --filter=ProductReview`
  Expected: FAIL (404s on renamed routes).

- [ ] **Step 3: Rename the API route segments in `api.php` lines 232–261 and `AppServiceProvider.php` statistics routes**

  Replace the `digital-products` URI segment with `items` (e.g.
  `Route::apiResource('items', DigitalProductsController::class)`,
  `admin/items/{digitalProduct}/reviews`). Parameter names and controller
  classes unchanged.

- [ ] **Step 4: Update notification URLs and the menu default**

  `ProductModerationNotification`, `ProductModerationSummaryNotification`,
  `SendStorefrontReviewNotification`: `/dashboard/my-products…` →
  `/dashboard/items…` (same suffixes). `menu-editor-config.php`:
  `'/admin/digital-products'` → `'/admin/items'`.

- [ ] **Step 5: Run backend tests to verify they pass**

  Run: `ddev exec php artisan test --filter=ProductReview` then
  `--filter=DigitalProduct` (or the affected filters).
  Expected: PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add common/foundation/routes/api.php app/Providers/AppServiceProvider.php common/foundation/resources/defaults/menu-editor-config.php app/Storefront/Notifications/ app/Storefront/Jobs/SendStorefrontReviewNotification.php tests/
  git commit -m "feat: rename product API paths to items"
  ```

### Task 2: Admin SPA routes → `admin/items/…`

**Files:**
- Modify: `resources/client/admin/admin-routes.tsx` (paths at ~127–175)
- Modify: `resources/client/admin/admin-config.tsx` (line 41 icon key → `/admin/items`)
- Modify: every file from `grep -rln "admin/digital-products" resources/client` (in-app links + `*-queries.ts` URL strings, e.g. `/api/v1/admin/digital-products/…` → `/api/v1/admin/items/…`)
- Modify: admin page headings with `<Trans message="Digital Products" />` → `<Trans message="Items" />` (list, payouts, payment-activity pages; keep "Sales & Payouts"-style specific titles)
- Test: existing admin route/table tests referencing old paths

**Interfaces:**
- Consumes: Task 1's `/api/v1/admin/items/…` prefixes for query functions.
- Produces: admin SPA served under `/admin/items/…`.

- [ ] **Step 1: Update admin tests/link assertions to new paths, run to verify failure**

  Run: `npx vitest run resources/client/admin/digital-products`
  Expected: FAIL (old paths gone).

- [ ] **Step 2: Rename paths in `admin-routes.tsx` and the `admin-config.tsx` icon key**

  `digital-products` → `items`, `digital-products/payouts` → `items/payouts`,
  `digital-products/:productId` (+`/reviews`) likewise,
  `digital-products/delivery-history` → `items/delivery-history`.
  `payment-activity` path unchanged.

- [ ] **Step 3: Sweep in-app links, query URLs, and headings**

  Replace `admin/digital-products` with `admin/items` in links and
  `/api/v1/admin/digital-products` with `/api/v1/admin/items` in
  `*-queries.ts`. Retitle generic "Digital Products" headings to "Items".

- [ ] **Step 4: Run admin frontend tests + tsc**

  Run: `npx vitest run resources/client/admin/digital-products` and `npx tsc --noEmit`
  Expected: PASS, clean.

- [ ] **Step 5: Commit**

  ```bash
  git add resources/client/admin/
  git commit -m "feat: rename admin product routes to items"
  ```

### Task 3: Dashboard SPA routes → `dashboard/items/…`

**Files:**
- Modify: `resources/client/dashboard/dashboard-routes.tsx` (`my-products*` paths, `homepageRoutes` values, legacy-key fallback)
- Modify: `resources/client/dashboard/layout/sidenav/app-dashboard-sidebar.tsx` (link → `/dashboard/items`, label → `<Trans message="My Items" />`)
- Modify: `resources/client/dashboard/digital-products/product-create-flow.ts` (lines ~96–100)
- Modify: cross-link files from `grep -rln "dashboard/my-products" resources/client` (store-editor, shop-widget, creator-profile-editor, my-learning pages, dashboard-home-page, app-router, main.tsx as applicable)
- Test: `resources/client/dashboard/dashboard-routes.test.tsx` (paths at ~99–134), `product-create-flow.test.ts`, wizard/a11y tests asserting old URLs

**Interfaces:**
- Consumes: Task 1's `/api/v1/items/…` prefixes for creator query functions (update any `digital-products` API strings in dashboard `*-queries.ts` too).
- Produces: creator SPA served under `/dashboard/items/…`; `items/new` flow intact.

- [ ] **Step 1: Update dashboard route tests to new paths, run to verify failure**

  Run: `npx vitest run resources/client/dashboard/dashboard-routes.test.tsx`
  Expected: FAIL.

- [ ] **Step 2: Rename `my-products*` paths to `items*`, add legacy homepage fallback**

  All `my-products` segments → `items`. Add an exported helper in
  `dashboard-routes.tsx`:

  ```ts
  export function normalizeHomepageValue(value: string | undefined): string
  ```

  mapping legacy `'digital-products'` → `'items'` (all other values pass
  through). In the index loader's `homepageRoutes`, key the map by the
  normalized value so both stored values land on `/dashboard/items`.

- [ ] **Step 3: Update sidebar, create-flow, and cross-links**

  Sidebar link/label per Files above. `product-create-flow.ts` URLs →
  `/dashboard/items/new/…`. Sweep remaining `dashboard/my-products` refs.

- [ ] **Step 4: Run dashboard frontend tests + tsc**

  Run: `npx vitest run resources/client/dashboard/digital-products resources/client/dashboard/dashboard-routes.test.tsx` and `npx tsc --noEmit`
  Expected: PASS, clean.

- [ ] **Step 5: Commit**

  ```bash
  git add resources/client/dashboard/ resources/client/main.tsx resources/client/app-router.tsx
  git commit -m "feat: rename creator product routes to items"
  ```

### Task 4: Homepage setting option + release note

**Files:**
- Modify: `resources/client/admin/settings/app-general-settings.tsx` (`homepageOptions`: value `'digital-products'` → `'items'`, label → `<Trans message="My Items" />`)
- Modify: release/changelog entry if the repo has one for this change (check `changelog.html` convention first; skip if it is generated)

**Interfaces:**
- Consumes: Task 3's `normalizeHomepageValue` helper + loader fallback.
- Produces: settings select shows "My Items"; legacy stored value normalizes on next save; release note documents the clean break (old bookmarks 404, admin-customized menu items with old paths need re-saving).

- [ ] **Step 1: Rename the option; normalize legacy value on bind**

  Change the option value to `'items'` with label
  `<Trans message="My Items" />`. Where the form binds
  `client.dashboard.homepage`, pass the stored value through Task 3's
  `normalizeHomepageValue` for display so the select never renders blank;
  saving persists the new value.

- [ ] **Step 2: Add a test pinning legacy normalization**

  In `resources/client/dashboard/dashboard-routes.test.tsx`, test
  `normalizeHomepageValue`: `'digital-products'` → `'items'`, `'items'` →
  `'items'`, `undefined` and other values pass through; plus assert the
  index loader redirects a legacy stored value to `/dashboard/items`.

- [ ] **Step 3: Run the settings + routes tests**

  Run: `npx vitest run resources/client/admin/settings resources/client/dashboard/dashboard-routes.test.tsx`
  Expected: PASS.

- [ ] **Step 4: Commit**

  ```bash
  git add resources/client/admin/settings/ [changelog file if applicable]
  git commit -m "feat: rename dashboard homepage option to items"
  ```

### Task 5: Regenerate API surface + full verification

**Files:**
- Regenerate: `resources/client/api.json`, `resources/client/api-public.json`, `resources/client/gen/` via `composer api-docs` (includes `npx orval`)
- Verify-only: full suites, `tsc`, production build

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: green suites on the merged result, rebuilt bundle, zero stale user-facing path strings.

- [ ] **Step 1: Regenerate the API surface**

  Run: `composer api-docs`
  Expected: exit 0; `grep -rn "digital-products" resources/client/api.json resources/client/api-public.json resources/client/gen/ | grep -v "DigitalProduct[a-zA-Z]*\"*: *\"[^\"]*\""` shows no stale URL *paths* (schema/model names like `AdminDigitalProduct` are fine).

- [ ] **Step 2: Sweep for leftovers**

  Run: `grep -rn "dashboard/my-products\|admin/digital-products\|/api/v1/\(admin/\)\?digital-products" resources/client app common routes tests --include="*.ts*" --include="*.php" | grep -v "digitalProduct\|DigitalProduct"`
  Expected: empty (except this plan/spec docs).

- [ ] **Step 3: Run full backend suite alone**

  Run: `ddev exec php artisan test`
  Expected: all pass (baseline 421 passed / 2 skipped).

- [ ] **Step 4: Run full frontend suite + tsc alone**

  Run: `npx tsc --noEmit && npm test`
  Expected: clean; suite green modulo the known `stores-alias`/`store-editor` contention flakes (pass in isolation).

- [ ] **Step 5: Rebuild the bundle and commit the regen**

  Run: `npm run build`
  ```bash
  git add resources/client/api.json resources/client/api-public.json resources/client/gen/
  git commit -m "chore: regenerate API surface for items routes"
  ```
  Leave `public/build/manifest.json` uncommitted (maps WIP sources).
