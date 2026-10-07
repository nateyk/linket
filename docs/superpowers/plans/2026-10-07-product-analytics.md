# Product Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-product statistics (sales, gross, earned, views, conversion %, daily series, top countries, top referrers) on a shared engine, surfaced as an admin detail tab and a creator statistics page.

**Architecture:** A dedicated `product_views` row table (24h/IP dedup, robot-skipped recording on the public product page) plus `views_count` counter; buyer country/referrer captured at checkout on `storefront_orders`; one `ProductAnalytics` engine powers two thin endpoints (admin + creator), each registered in `AppServiceProvider` (common submodule untouched). React surfaces share one component set, charts via shadcn `Chart` (Recharts).

**Tech Stack:** Laravel 12 / PHP 8.4, MySQL, PHPUnit (no Pest), React 19 + Vite, TanStack Query, Recharts via `@shadcn/chart`, Vitest, Tailwind 4 tokens, `<Trans>` i18n.

**Spec:** `docs/superpowers/specs/2026-10-07-product-analytics-design.md`

## Global Constraints

- PHPUnit only for new backend tests (agents.md); never delete existing tests.
- Every user-visible string via `<Trans message>`; design tokens only (no raw colors); RTL-ready logical properties (DESIGN.md).
- Charts via the shadcn `Chart` wrapper; query hooks via the `*-queries.ts` options-object pattern.
- `tracked_events` / `app/Analytics` untouched; the `common/foundation` submodule untouched.
- "Paid order" = `storefront_orders.status = 'paid'`.
- IPs stored only as SHA-256 hashes on `product_views` (no plaintext IPs).

## Review Focus

- Empty period (no sales, no views) → all KPI/series values zero, `conversion_pct` null, charts render empty state, no crash.
- Views = 0 but sales > 0 → `conversion_pct` null (never Infinity/division-by-zero).
- Malformed or oversized periods (`from` > `to`, `from`→`to` over 366 days, bad `Y-m-d` format) → 422, not 500.
- Free products (`price_cents = 0`) — immediate-fulfilled orders are `status = 'paid'` and must count as sales; `creator_earnings_cents` = 0 is fine.
- Second render of the same product from the same IP within 24h → no new row, no counter bump; different products or >24h → recorded.

---

### Task 1: `product_views` schema, model, counter

**Files:**
- Create: `database/migrations/2026_10_07_000001_create_product_views_table.php`
- Create: `database/migrations/2026_10_07_000003_add_views_count_to_digital_products.php`
- Create: `app/Storefront/Models/ProductView.php`
- Modify: `app/Storefront/Models/DigitalProduct.php`
- Test: `tests/Feature/ProductViewSchemaTest.php`

**Interfaces:**
- Produces: `App\Storefront\Models\ProductView` (fillable `digital_product_id, ip_hash, country, referrer`; `$timestamps = false` with `created_at` only via `public $timestamps = false` + `const UPDATED_AT = null`; `belongsTo DigitalProduct`). `DigitalProduct::views()` hasMany `ProductView`. `digital_products.views_count` unsignedBigInteger default 0 (fillable).

- [ ] **Step 1: Write the failing test** `tests/Feature/ProductViewSchemaTest.php`

```php
public function test_product_views_schema_and_relations(): void
{
    $this->assertTrue(\Illuminate\Support\Facades\Schema::hasTable('product_views'));
    $this->assertTrue(\Illuminate\Support\Facades\Schema::hasColumns('product_views', [
        'digital_product_id', 'ip_hash', 'country', 'referrer', 'created_at',
    ]));
    $this->assertTrue(\Illuminate\Support\Facades\Schema::hasColumns('digital_products', ['views_count']));
}
```

Plus a second test: create a `DigitalProduct` (`User::forceCreate` + personal workspace via `CreateWorkspace`, as in `FreeCheckoutAtomicTest`), create two `ProductView` rows, assert `$product->views()->count() === 2` and that deleting the product cascades the rows (`assertDatabaseCount('product_views', 0)`).

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=ProductViewSchemaTest`
Expected: FAIL (missing tables/columns)

- [ ] **Step 3: Implement schema + model**

Create the two migrations (columns per spec §1: `digital_product_id` FK cascade + composite index `(digital_product_id, created_at)`, `ip_hash` char(64) indexed, `country` char(2) indexed, `referrer` varchar(255) nullable, `created_at` only); `ProductView` model; add `views()` relation and `views_count` to `DigitalProduct` `$fillable`.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter=ProductViewSchemaTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add database/migrations/2026_10_07_000001_create_product_views_table.php database/migrations/2026_10_07_000003_add_views_count_to_digital_products.php app/Storefront/Models/ProductView.php app/Storefront/Models/DigitalProduct.php tests/Feature/ProductViewSchemaTest.php
git commit -m "feat: add product_views schema, model and views counter"
```

---

### Task 2: View recording with 24h/IP dedup

**Files:**
- Create: `app/Storefront/VisitorAttributes.php`
- Create: `app/Storefront/Actions/RecordProductView.php`
- Modify: `app/Storefront/Controllers/PublicDigitalProductPageController.php`
- Test: `tests/Unit/RecordProductViewTest.php`
- Test: `tests/Feature/ProductViewsRecordingTest.php`

**Interfaces:**
- Consumes: `ProductView`, `DigitalProduct::views()` (Task 1).
- Produces:
  - `App\Storefront\VisitorAttributes` — `public static function country(): ?string` (geoip fallback ISO code), `public static function normalizedReferrer(): ?string` (HTTP_REFERER, null when empty or `Str::contains($referrer, url(''))`, else `Str::limit($referrer, 190, '')`), `public static function ipHash(): ?string` (sha256 of resolved request IP; null when IP cannot be resolved).
  - `App\Storefront\Actions\RecordProductView::execute(DigitalProduct $product): bool` — returns true when a row was inserted. Skips (false) when not approved, robot (`app(Agent::class)->isRobot()`), or duplicate within 24h (latest `product_views` row for `(digital_product_id, ip_hash)` where `created_at->diffInHours(now()) < 24`).

- [ ] **Step 1: Write failing unit tests**

`tests/Unit/RecordProductViewTest.php` (direct action calls, no HTTP route):
- records a row + bumps `views_count` by 1 for an approved product
- dedup: second call same IP within 24h → still 1 row / `views_count` 1
- after forcing the latest row's `created_at` to 25h ago (`ProductView::query()->update(['created_at' => now()->subHours(25)])`), third call inserts a row → 2 rows / `views_count` 2
- skips draft/rejected products (no row, no bump)
- robot User-Agent (`request()->headers->set('User-Agent', 'Googlebot/2.1')` via `request()->headers`) → no row

`tests/Feature/ProductViewsRecordingTest.php` (route-level):
- build an approved product + store/biolink via `StoreFactory` (as in `StorefrontPublicAssetsTest` setup), then `GET /{storeSlug}/products/{productId}` (web route, NOT `/api/v1/...`) → 200 and `assertDatabaseCount('product_views', 1)` and product `views_count` = 1.
- same request again → still 1 row.

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --filter=RecordProductViewTest` and `php artisan test --filter=ProductViewsRecordingTest`
Expected: FAIL (class `RecordProductView` not found)

- [ ] **Step 3: Implement `VisitorAttributes`, `RecordProductView`, and wire into the controller**

`VisitorAttributes` mirrors `LogTrackedEvent` patterns (same geoip helper family, same referrer rule) but as its own class — do NOT modify `LogTrackedEvent`. `RecordProductView` checks `isApproved()`, robot, then dedup query, then `ProductView::create` + `$product->increment('views_count')`. In `PublicDigitalProductPageController::show`, call `app(RecordProductView::class)->execute($product)` after `$product` resolves (before returning the response). Normalizer/dedup left to the implementer — signatures and assertions are pinned above.

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --filter=RecordProductViewTest` and `php artisan test --filter=ProductViewsRecordingTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/VisitorAttributes.php app/Storefront/Actions/RecordProductView.php app/Storefront/Controllers/PublicDigitalProductPageController.php tests/Unit/RecordProductViewTest.php tests/Feature/ProductViewsRecordingTest.php
git commit -m "feat: record product page views with 24h/IP dedup"
```

---

### Task 3: Checkout capture of buyer country + referrer

**Files:**
- Create: `database/migrations/2026_10_07_000002_add_analytics_columns_to_storefront_orders.php`
- Modify: `app/Storefront/StorefrontCheckout.php`
- Test: `tests/Feature/ProductCheckoutAnalyticsCaptureTest.php`

**Interfaces:**
- Consumes: `VisitorAttributes::country()` / `normalizedReferrer()` (Task 2).
- Produces: `storefront_orders.buyer_country` (char(2) nullable), `buyer_referrer` (varchar(255) nullable).

- [ ] **Step 1: Write failing tests**

`tests/Feature/ProductCheckoutAnalyticsCaptureTest.php`, modeled on `FreeCheckoutAtomicTest` (direct `StorefrontCheckout::create`, free product so it fulfills without a gateway):
- with `request()->headers->set('HTTP_REFERER', 'https://external.example/ref')` → order's `buyer_referrer` = `'https://external.example/ref'`
- with `request()->headers->set('HTTP_REFERER', url('/some-internal-page'))` → `buyer_referrer` null
- country captured: set `config(['geoip.default_location' => ['iso_code' => 'US']])` (and use a `0.0.0.0`-style request IP if the test env needs it) → order's `buyer_country` is `'US'`; if the GeoIP driver requires an IP that forces the default location, pin the config and assert `assertSame('US', ...)`.
- previous orders (created before the columns existed) have null `buyer_country`/`buyer_referrer` — expressed as: a plain `StorefrontOrder::create([...])` without these keys still inserts (columns nullable) and the analytics query in Task 4 must tolerate nulls.

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --filter=ProductCheckoutAnalyticsCaptureTest`
Expected: FAIL (columns do not exist; fields not set)

- [ ] **Step 3: Implement**

Migration adds the two nullable columns. In `StorefrontCheckout::create`, add `'buyer_country' => VisitorAttributes::country()`, `'buyer_referrer' => VisitorAttributes::normalizedReferrer()` to the `StorefrontOrder::create([...])` array.

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --filter=ProductCheckoutAnalyticsCaptureTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add database/migrations/2026_10_07_000002_add_analytics_columns_to_storefront_orders.php app/Storefront/StorefrontCheckout.php tests/Feature/ProductCheckoutAnalyticsCaptureTest.php
git commit -m "feat: capture buyer country and referrer at checkout"
```

---

### Task 4: Shared `ProductAnalytics` engine

**Files:**
- Create: `app/Storefront/ProductAnalytics.php`
- Test: `tests/Unit/ProductAnalyticsServiceTest.php`

**Interfaces:**
- Consumes: `StorefrontOrder` (`status`, `paid_at`, `created_at`, `gross_amount_cents`, `creator_earnings_cents`, `buyer_country`), `ProductView` (`created_at`, `country` unused, `referrer`), `DigitalProduct`.
- Produces:
  - `App\Storefront\ProductAnalytics::stats(DigitalProduct $product, CarbonInterface $from, CarbonInterface $to): array` returning exactly the spec's response shape:

```php
[
  'period' => ['from' => 'Y-m-d', 'to' => 'Y-m-d'],
  'kpis' => ['sales_count' => int, 'gross_cents' => int, 'creator_earnings_cents' => int, 'views_count' => int, 'conversion_pct' => ?float],
  'sales_series' => [['date' => 'Y-m-d', 'count' => int, 'gross_cents' => int], ...],
  'views_series' => [['date' => 'Y-m-d', 'count' => int], ...],
  'top_countries' => [['country' => string, 'sales_count' => int, 'gross_cents' => int], ...],  // limit 6, country NOT NULL, sales_count desc
  'top_referrers' => [['referrer' => string, 'views_count' => int], ...],                       // limit 10, referrer NOT NULL, views_count desc
]
```

  - `ProductAnalytics::resolvePeriod(\Illuminate\Http\Request $request): array` returning `[$from, $to]` (`CarbonImmutable`): reads `from`/`to` (`date_format:Y-m-d`), defaults to current month (`startOfMonth` → now), `abort_unless($to->copy()->subDays(366)->lte($from), 422, 'Period is too long')` and `from <= to`.

- [ ] **Step 1: Write failing unit tests** `tests/Unit/ProductAnalyticsServiceTest.php`

Fixture helper: creator via `User::forceCreate` (pattern from `FreeCheckoutAtomicTest`), approved product, and direct `StorefrontOrder::create([...])` with `status => 'paid'` + chosen `paid_at`/`created_at`. `ProductView` rows with chosen `created_at`.

Tests (each a separate method; exact pinned values):
- KPIs: 3 paid orders (2 today, 1 pending excluded) totaling `gross_amount_cents` 15000 / `creator_earnings_cents` 13500 (one order 0-gross free order), 2 `ProductView` rows in period → `sales_count 3`, `gross_cents 15000`, `creator_earnings_cents 13500`, `views_count 2`, `conversion_pct 150.0`.
- views=0, sales=2 → `conversion_pct` null.
- empty period boundaries (no rows) → all zeros, `conversion_pct` null, `sales_series`/`views_series` contain every date in the range with zeros.
- zero-fill: orders on day 1 and day 5 of a month → `sales_series` length equals days in the month, days 2–4 have `count 0`.
- `top_countries`: 3 paid orders ET (gross 300), 1 paid US (gross 100) → first entry `['country' => 'ET', 'sales_count' => 3, 'gross_cents' => 300]`; a paid order with `buyer_country` null is excluded.
- `top_referrers`: `ProductView` rows with referrers `['https://x.com/a', 'https://x.com/a', 'https://y.com/b']` → first entry `['referrer' => 'https://x.com/a', 'views_count' => 2]`; null-referrer rows excluded.
- `resolvePeriod`: no params → `from` = current month start; `from'2026-10-01','to'='2026-10-31'` echoed back; `from` after `to` → 422; 400-day range → 422; bad format `'10-2026'` → 422.

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --filter=ProductAnalyticsServiceTest`
Expected: FAIL (class `ProductAnalytics` not found)

- [ ] **Step 3: Implement `ProductAnalytics`**

All queries group once: KPIs/series via `StorefrontOrder::query()->where('digital_product_id', $product->id)->where('status', 'paid')->whereBetween(DB::raw('COALESCE(paid_at, created_at)'), [$from, $to])`; views via `ProductView::query()->where('digital_product_id', $product->id)->whereBetween('created_at', [$from, $to])`. Zero-fill: build date scaffold `for ($d = $from->copy(); $d->lte($to); $d->addDay())` then merge group results keyed by `'Y-m-d'`. `conversion_pct` = `views_count === 0 ? null : round(sales_count / views_count * 100, 1)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --filter=ProductAnalyticsServiceTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/ProductAnalytics.php tests/Unit/ProductAnalyticsServiceTest.php
git commit -m "feat: add shared ProductAnalytics engine"
```

---

### Task 5: Creator statistics endpoint

**Files:**
- Create: `app/Storefront/Controllers/DigitalProductStatisticsController.php`
- Modify: `app/Providers/AppServiceProvider.php`
- Test: `tests/Feature/CreatorProductStatisticsTest.php`

**Interfaces:**
- Consumes: `ProductAnalytics::stats()` / `resolvePeriod()` (Task 4).
- Produces: `App\Storefront\Controllers\DigitalProductStatisticsController::__invoke(Request $request, DigitalProduct $digitalProduct): array`; route `GET /api/v1/digital-products/{digitalProduct}/statistics`.

- [ ] **Step 1: Write failing tests** `tests/Feature/CreatorProductStatisticsTest.php`

Authenticated creator + approved product in their active workspace (setup per existing feature tests). As `apiClient`-style HTTP test:
- owner `GET /api/v1/digital-products/{$id}/statistics` → 200, body has keys `period, kpis, sales_series, views_series, top_countries, top_referrers`, `kpis.views_count` matches seeded `ProductView` rows.
- another authenticated user → 403.
- missing product → 404.
- `from` = `2026-10-01`, `to` = `2026-09-01` → 422.
- guest → 401/403 (whatever the group middleware yields).

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --filter=CreatorProductStatisticsTest`
Expected: FAIL (route/controller missing)

- [ ] **Step 3: Implement**

Controller replicates the ownership guard inline (same body as `DigitalProductsController::assertOwner`: `abort_unless($product->workspace_id === ActiveWorkspace::get()->id && $product->user_id === $request->user()->id, 403)`). Add `registerProductStatisticsRoutes()` in `AppServiceProvider` mirroring `registerCourseRoutes()` (prefix `api/v1`, middleware `['api', 'optionalAuth:sanctum', 'verified', 'verifyApiAccess']`), registering ONLY the creator route in this task. Call it from `boot()` next to `registerCourseRoutes()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --filter=CreatorProductStatisticsTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/Controllers/DigitalProductStatisticsController.php app/Providers/AppServiceProvider.php tests/Feature/CreatorProductStatisticsTest.php
git commit -m "feat: add creator product statistics endpoint"
```

---

### Task 6: Admin statistics endpoint

**Files:**
- Create: `app/Storefront/Controllers/AdminDigitalProductStatisticsController.php`
- Modify: `app/Providers/AppServiceProvider.php` (add admin line to `registerProductStatisticsRoutes()`)
- Test: `tests/Feature/AdminProductStatisticsTest.php`

**Interfaces:**
- Consumes: creator endpoint registration (Task 5).
- Produces: `AdminDigitalProductStatisticsController::__invoke(Request $request, DigitalProduct $digitalProduct): array`; route `GET /api/v1/admin/digital-products/{digitalProduct}/statistics`.

- [ ] **Step 1: Write failing tests** `tests/Feature/AdminProductStatisticsTest.php`
- admin user (role with `admin.access`) `GET /api/v1/admin/digital-products/{id}/statistics` → 200 with the same shape as Task 5 (assert keys + `kpis.views_count` against seeded rows).
- non-admin authenticated user → 403.

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --filter=AdminProductStatisticsTest`
Expected: FAIL (route/controller missing)

- [ ] **Step 3: Implement**

`Gate::authorize('admin.access')` as the first line (mirror `AdminDigitalProductsController`). Add the admin route line to `registerProductStatisticsRoutes()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --filter=AdminProductStatisticsTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/Controllers/AdminDigitalProductStatisticsController.php app/Providers/AppServiceProvider.php tests/Feature/AdminProductStatisticsTest.php
git commit -m "feat: add admin product statistics endpoint"
```

---

### Task 7: Shared frontend components + query hooks

**Files:**
- Create: `resources/client/digital-products/shared/product-statistics/queries.ts`
- Create: `resources/client/digital-products/shared/product-statistics/period-picker.tsx`
- Create: `resources/client/digital-products/shared/product-statistics/kpi-cards.tsx`
- Create: `resources/client/digital-products/shared/product-statistics/sales-chart.tsx`
- Create: `resources/client/digital-products/shared/product-statistics/views-chart.tsx`
- Create: `resources/client/digital-products/shared/product-statistics/performance-chart.tsx`
- Create: `resources/client/digital-products/shared/product-statistics/top-countries.tsx`
- Create: `resources/client/digital-products/shared/product-statistics/top-referrers.tsx`
- Test: `resources/client/digital-products/shared/product-statistics/product-statistics-shared.test.tsx`

**Interfaces:**
- Consumes: backend response shape (Task 4) — typed as `ProductStatistics` (interface matching the engine's array, `conversion_pct: number | null`, `sales_series/views_series: {date: string; count: number; gross_cents?: number}[]`, `top_countries: {country: string; sales_count: number; gross_cents: number}[]`, `top_referrers: {referrer: string; views_count: number}[]`).
- Produces:
  - `useProductStatistics(queryKey: string[], endpoint: string, params: {from: string; to: string})` — TanStack Query options-object hook (key derived from `queryKey` + dates) mirroring `*-queries.ts` conventions.
  - `PeriodPicker({from, to, onChange})` — two date inputs + "This month" default; `KpiCards({stats})` — 5 cards using `formatMoney` for money, `<Trans>` labels, Conversion shows `—` when null; `SalesChart`, `ViewsChart`, `PerformanceChart({stats})` — Recharts via shadcn `ChartContainer`, daily series with zero data rendered as empty state; `TopCountries({items})`, `TopReferrers({items})` — lists.

- [ ] **Step 1: Write failing Vitest** `product-statistics-shared.test.tsx`
- `KpiCards` renders labels "Sales", "Gross revenue", "Earned", "Views", "Conversion" given a fixture payload; renders `—` for `conversion_pct: null`.
- `PeriodPicker` initial `from`/`to` equal current month start/end when `onChange` fires with those values (pass a defaulted fixture).
- `SalesChart`/`ViewsChart`/`PerformanceChart` render without crashing on an all-zero series (empty-period payload).
- `useProductStatistics` issues a request to the given endpoint with `from`/`to` params (mock `apiClient.get` as in existing `*-queries.test.ts`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/client/digital-products/shared/product-statistics/product-statistics-shared.test.tsx`
Expected: FAIL (modules not found)

- [ ] **Step 3: Implement the components + hooks**

Follow the existing insights/chart component patterns (e.g. `tracked-events-insights.tsx`, `admin-commerce-insights.tsx`). Money via `formatMoney(cents, currency)` — pass `currency` through `KpiCards` from the query response's `period` context (add `currency: 'ETB'` as a `KpiCards` prop defaulting to ETB).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/digital-products/shared/product-statistics/product-statistics-shared.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add resources/client/digital-products/shared/product-statistics
git commit -m "feat: add shared product statistics components"
```

---

### Task 8: Admin detail page — Statistics tab

**Files:**
- Modify: `resources/client/admin/digital-products/admin-digital-product-detail-page.tsx`
- Test: `resources/client/admin/digital-products/admin-product-detail.test.ts`

**Interfaces:**
- Consumes: shared components + `useProductStatistics` (Task 7), admin endpoint (Task 6).
- Produces: third `Tabs.Tab value="statistics"` ("Statistics") whose panel renders `PeriodPicker` + `KpiCards` + the three charts + `TopCountries` + `TopReferrers`; current-month default period; empty state when no data.

- [ ] **Step 1: Write failing Vitest** (extend `admin-product-detail.test.ts` or add to the shared test file): renders a third tab labeled "Statistics"; selecting it requests `/api/v1/admin/digital-products/{id}/statistics?from=...&to=...` (mock), renders the five KPI labels, and renders an empty state for an all-zero payload.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run resources/client/admin/digital-products/admin-product-detail.test.ts`
Expected: FAIL (no Statistics tab)

- [ ] **Step 3: Implement**

Add the tab + panel to the existing `Tabs.Root`; panel loads on mount of the tab (tab data-fetch via `useProductStatistics` keyed `adminProductStatistics`). All copy via `<Trans>`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run resources/client/admin/digital-products/admin-product-detail.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add resources/client/admin/digital-products/admin-digital-product-detail-page.tsx resources/client/admin/digital-products/admin-product-detail.test.ts
git commit -m "feat: add Statistics tab to admin product detail"
```

---

### Task 9: Creator statistics page + route + menu item

**Files:**
- Create: `resources/client/dashboard/digital-products/product-statistics-page.tsx`
- Modify: `resources/client/dashboard/dashboard-routes.tsx`
- Modify: `resources/client/dashboard/digital-products/digital-products-page.tsx`
- Test: `resources/client/dashboard/digital-products/product-statistics-page.test.tsx`

**Interfaces:**
- Consumes: shared components (Task 7), creator endpoint (Task 5).
- Produces: route `/dashboard/my-products/:productId/statistics`; `Dropdown.LinkItem` "Statistics" in each product menu targeting that route.

- [ ] **Step 1: Write failing Vitest** `product-statistics-page.test.tsx`
- page requests `/api/v1/digital-products/{id}/statistics?from=...&to=...` and renders the five KPI labels + period picker; empty payload renders empty states without crashing.
- `digital-products-page` product menu contains a "Statistics" item linking to `/dashboard/my-products/{id}/statistics` (extend its existing menu assertions).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run resources/client/dashboard/digital-products/product-statistics-page.test.tsx`
Expected: FAIL (modules not found)

- [ ] **Step 3: Implement**

Page uses `DashboardLayout` + `DashboardLayout.MainSection` (mirror `sales-payouts-page.tsx`), resolves `productId` from params, uses `useProductStatistics` with the creator endpoint. Add the route in `dashboard-routes.tsx` near the sibling product routes (line ~455) with `lazy` import. Add the `Dropdown.LinkItem` next to the existing `course/analytics` item (`digital-products-page.tsx` line ~438).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run resources/client/dashboard/digital-products/product-statistics-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/product-statistics-page.tsx resources/client/dashboard/digital-products/product-statistics-page.test.tsx resources/client/dashboard/dashboard-routes.tsx resources/client/dashboard/digital-products/digital-products-page.tsx
git commit -m "feat: add creator product statistics page"
```

---

### Task 10: Whole-branch verification

**Files:** none (verification only)

- [ ] **Step 1: Run full backend suite**

Run: `php artisan test`
Expected: PASS (including all new suites)

- [ ] **Step 2: Run frontend tests + typecheck + lint**

Run: `npx vitest run` and `npm run typecheck` (or the repo's tsc script) and the repo's lint command (`npm run lint` if present)
Expected: PASS, no new type errors in touched files

- [ ] **Step 3: PHPStan**

Run: the repo's phpstan command (per `phpstan.neon`)
Expected: no new errors in touched files

- [ ] **Step 4: Migrate the dev DB and smoke-test manually** (optional but recommended)

Run: `php artisan migrate` then in the app: open an approved product's Statistics tab (admin) and the creator product Statistics page; confirm empty-state and a real sale/view render correctly.

- [ ] **Step 5: Fix anything found and commit**

```bash
git add -A
git commit -m "chore: final verification fixes for product analytics"
```
(only if fixes were needed; otherwise no commit)