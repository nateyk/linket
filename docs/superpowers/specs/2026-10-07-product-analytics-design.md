# Product Analytics — Design

**Date:** 2026-10-07
**Status:** Approved (design); pending spec review → implementation plan

## Goal

Give each product a clear per-product statistics view for **both admins and
creators** on a single shared engine. The reference is marketbob's admin
"Statistics" tab (month KPIs, daily sales/views charts, top purchasing
countries, top referrers), adapted to Linket's stack and philosophy.

Design constraints agreed in brainstorming:

- **Linket is a storefront platform, not a marketplace.** Nothing in this
  design is treated as a marketplace (no vendors, categories, discount tab,
  or change-status tab — those marketbob tabs are explicit non-goals).
- **Per-product detail pages only.** Statistics live on the *individual*
  product: a "Statistics" tab on the admin product detail page and a
  dedicated creator Statistics page. Absolutely no mixing with link/clicks
  analytics or other features.
- **One shared engine** powers both admin and creator surfaces so the numbers
  can never drift apart.
- **Beyond marketbob parity**, a combined views+sales "Performance" chart and
  a views→sales **Conversion %** KPI are included (seller value at near-zero
  extra cost).
- **Reuse existing Linket infrastructure**: Torann GeoIP + Jenssegers Agent +
  referrer normalization from `LogTrackedEvent`, Recharts + shadcn Chart
  wrapper, TanStack Query `*-queries.ts` pattern, `<Trans>` copy, design
  tokens, PHPUnit-only tests.

## Scope

In scope:

- New `product_views` table (raw view rows) + denormalized `views_count`
  counter on `digital_products`; server-side view recording on the public
  product page web route with 24h/IP dedup and robot skip.
- Checkout capture of `buyer_country` and `buyer_referrer` on
  `storefront_orders` (feeds sales-side country/referrer stats).
- Shared `ProductAnalytics` engine computing: period KPIs (Sales, Gross,
  Earned, Views, Conversion %), daily zero-filled sales and views series,
  top purchasing countries, top referrers.
- Two thin endpoints (admin + creator) calling the same engine.
- Admin: "Statistics" tab on `admin/digital-products/{id}` detail page.
- Creator: `GET /dashboard/my-products/:productId/statistics` page + a
  "Statistics" item in that product's dropdown menu.
- Backend + frontend tests.

Out of scope:

- Links/clicks analytics (`tracked_events`) — untouched; product views are a
  dedicated table and never pollute click/event reports.
- Discount tab, Change Status tab, Categories, Comments, full GeoChart map
  (country list only for v1), multi-currency aggregation.
- Backfilling historical orders with country/referrer (old orders simply
  don't appear in country stats).
- "Trending / best-selling" flags or any ranking feature (no current
  consumer).

## Architecture

### Data model

**`product_views`** (`database/migrations/2026_10_07_000001`):

| column | type | notes |
|---|---|---|
| `id` | bigint PK | |
| `digital_product_id` | FK → `digital_products` | `cascadeOnDelete`; composite index `(digital_product_id, created_at)` |
| `ip_hash` | char(64) nullable | SHA-256 of visitor IP (privacy; usable for dedup). Indexed. |
| `country` | char(2) nullable | ISO code from Torann GeoIP. Indexed. |
| `referrer` | varchar(255) nullable | normalized like `LogTrackedEvent` (internal/empty → null) |
| `created_at` | timestamp | only; `UPDATED_AT = null` (event-like, mirrors `tracked_events`) |

**`digital_products`** — add `views_count` unsignedBigInteger default 0.

**`storefront_orders`** (`database/migrations/2026_10_07_000002`) — add
`buyer_country` char(2) nullable, `buyer_referrer` varchar(255) nullable.

**Model:** `app/Storefront/Models/ProductView.php` (`belongsTo DigitalProduct`);
`DigitalProduct` gains `views()` hasMany relation.

### View recording

New action `app/Storefront/Actions/RecordProductView.php`, called from
`PublicDigitalProductPageController::show()` (the web route
`{storeSlug}/products/{digitalProduct}` that renders the public product page —
the same route the SPA shell is served from). Mirror the `LogTrackedEvent`
patterns:

1. Skip if product not approved.
2. Skip robots (`Agent::isRobot()`).
3. **Dedup: max 1 view per (product, ip_hash) per 24h** — check the latest
   `product_views` row for the pair; insert only if absent or
   `now()->diffInHours(latest.created_at) >= 24`.
4. On insert: write row (country from `geoip(ip)['iso_code']`, referrer
   normalized from `HTTP_REFERER`, `ip_hash` = sha256 of resolved IP) and
   `$product->increment('views_count')`.

No middleware, no queue, no session/cache layer — a single action call,
consistent with how `FallbackRouteController` calls `LogTrackedEvent`.

### Checkout capture

In `StorefrontCheckout::create()` (order data build):

- `buyer_country` = `geoip(request ip)['iso_code']` (same helper family as
  `LogTrackedEvent::getGeoData()`).
- `buyer_referrer` = `HTTP_REFERER` normalized (null when empty or internal
  host).

Both stay nullable; existing order-creation code paths unchanged otherwise.

### Shared engine — `app/Storefront/ProductAnalytics.php`

Single stateless service used by both endpoints. Period = `from`/`to`
(`Y-m-d`), default current month (`startOfMonth` → now). Max 366 days.

Response shape (identical for both scopes):

```
{
  period: {from, to},
  kpis: {
    sales_count,            // COUNT(paid orders), COALESCE(paid_at, created_at) in period
    gross_cents,            // SUM(gross_amount_cents), paid orders
    creator_earnings_cents, // SUM(creator_earnings_cents), paid orders
    views_count,            // COUNT(product_views) in period
    conversion_pct          // sales_count / views_count * 100, or null when views_count = 0
  },
  sales_series:   [{date, count, gross_cents}...],   // daily, zero-filled
  views_series:   [{date, count}...],                // daily, zero-filled
  top_countries:  [{country, sales_count, gross_cents}...], // limit 6, paid orders, country NOT NULL, by sales_count desc
  top_referrers:  [{referrer, views_count}...],            // limit 10, from product_views, referrer NOT NULL
}
```

Implementation notes:

- Daily series use a **zero-filled date scaffold built in PHP** (marketbob's
  `chartDates` pattern): generate every date between `from` and `to`, then
  merge `GROUP BY DATE(...)` results over it.
- "Paid order" = `status = 'paid'` (the single truth used everywhere today,
  e.g. `DigitalProductFinance`, `DigitalProductsController` sales counts).
- **No N+1, no unbounded scans**: series group once by day, country/referrer
  group once each, KPIs aggregate once.

### Endpoints

| Method / path | Controller | Protection |
|---|---|---|
| `GET /api/v1/admin/digital-products/{id}/statistics` | `AdminDigitalProductStatisticsController` | `Gate::authorize('admin.access')` |
| `GET /api/v1/digital-products/{id}/statistics` | `DigitalProductStatisticsController` | ownership via `assertOwner()` (same guard as existing `DigitalProductsController`) |

Both: validate `from`/`to` (dates, `from <= to`, range ≤ 366 days), resolve
404 on missing product, and return the shared engine's response verbatim.

**Registration:** in `app/Providers/AppServiceProvider.php` via a new
`registerProductStatisticsRoutes()` method, mirroring the course-routes
precedent (prefix `api/v1`, middleware
`['api', 'optionalAuth:sanctum', 'verified', 'verifyApiAccess']`). The shared
`common/foundation` submodule route file stays **untouched** — its sibling
digital-product routes remain where they are; the new routes are app-land,
like the course routes. Authentication/authorization is enforced inside the
controllers (`assertOwner()` and `Gate::authorize('admin.access')`), exactly
as `DigitalProductsController` and `AdminDigitalProductsController` do today.

### Frontend

**Shared components** `resources/client/digital-products/shared/product-statistics/`:

- `period-picker.tsx` — from/to date controls + "This month" default (matches
  existing insights filter patterns).
- `kpi-cards.tsx` — five shadcn `Card` stat tiles: **Sales**, **Gross
  revenue**, **Earned**, **Views**, **Conversion %** (Conversion renders "—"
  when views = 0).
- `sales-chart.tsx` — Recharts bar chart (daily count).
- `views-chart.tsx` — Recharts line chart (daily count).
- `performance-chart.tsx` — combined overlay: views series + sales series on
  one time axis (the conversion view).
- `top-countries.tsx` — flag list (country code → flag, like existing geo UI).
- `top-referrers.tsx` — list with host labels.
- `queries.ts` — TanStack Query hooks per the existing `*-queries.ts` pattern
  (options object + key factory).

All copy via `<Trans message>`, design tokens only, charts via the shadcn
`Chart` wrapper (`@shadcn/chart`), matching `DESIGN.md`/`agents.md`.

**Admin surface:** add a third `Tabs.Tab` **Statistics** to
`admin-digital-product-detail-page.tsx` (page becomes Details | History |
Statistics). The tab renders the full shared set: period picker, KPI row,
3 charts, countries, referrers. Statistics are read-only; no invalidation of
the detail query key is needed (keys are invalidated only on moderation
actions, which also refresh the page).

**Creator surface:** new route `/dashboard/my-products/:productId/statistics`
in `dashboard-routes.tsx` → `product-statistics-page.tsx` (uses
`DashboardLayout`), and a **Statistics** `Dropdown.LinkItem` in
`digital-products-page.tsx` product menus (mirroring the existing
`course/analytics` item). Uses the same shared components with the creator
endpoint.

### Error handling

- Backend: 401/403 via existing auth + `assertOwner()`/`admin.access`; 404
  for missing product; 422 for invalid period params.
- Frontend: `Skeleton` while loading, `Alert` on error, `Empty` state when a
  series has no data yet (empty period), consistent with other insights pages.

## Testing

- **Backend (PHPUnit only, per agents.md):**
  - `tests/Feature/ProductViewsRecordingTest.php` — view recorded on public
    product page; not recorded for drafts/rejected; robots skipped; 24h dedup
    (second hit within 24h adds no row/counter, hit after 24h does);
    `views_count` increments.
  - `tests/Feature/ProductCheckoutAnalyticsCaptureTest.php` — `buyer_country`
    and `buyer_referrer` set on order at checkout; referrer nulled for
    internal/empty; absent for legacy orders (no backfill).
  - `tests/Unit/ProductAnalyticsServiceTest.php` — KPI math, conversion %
    (including views=0 → null), zero-filled daily series (presence of missing
    days), country/referrer grouping, paid-only filtering, period validation.
  - `tests/Feature/CreatorProductStatisticsTest.php` — owner gets correct
    payload; another creator gets 403; missing product 404; invalid period
    422.
  - `tests/Feature/AdminProductStatisticsTest.php` — admin-only (403 for
    non-admin), same payload shape.
- **Frontend (Vitest):**
  - `kpi-cards` render the five KPIs (Conversion shows "—" at views=0).
  - `period-picker` defaults to current month.
  - Charts receive correctly mapped series (bar/line/overlay).
  - Page-level smoke for the creator statistics page + admin Statistics tab
    (endpoint path requested, key labels render).
- No existing test is deleted or modified beyond additive changes.

## Files touched (summary)

- `database/migrations/2026_10_07_000001_create_product_views_table.php` (new)
- `database/migrations/2026_10_07_000002_add_analytics_columns_to_storefront_orders.php` (new)
- `database/migrations/2026_10_07_000003_add_views_count_to_digital_products.php` (new)
- `app/Storefront/Models/ProductView.php` (new)
- `app/Storefront/Models/DigitalProduct.php` (views relation, fillable)
- `app/Storefront/Actions/RecordProductView.php` (new)
- `app/Storefront/Controllers/PublicDigitalProductPageController.php` (record view)
- `app/Storefront/StorefrontCheckout.php` (capture country/referrer)
- `app/Storefront/ProductAnalytics.php` (new engine)
- `app/Storefront/Controllers/DigitalProductStatisticsController.php` (new)
- `app/Storefront/Controllers/AdminDigitalProductStatisticsController.php` (new)
- `app/Providers/AppServiceProvider.php` (register two endpoints; submodule `common/foundation/routes/api.php` untouched)
- `resources/client/digital-products/shared/product-statistics/*` (new, shared UI)
- `resources/client/admin/digital-products/admin-digital-product-detail-page.tsx` (Statistics tab)
- `resources/client/dashboard/digital-products/product-statistics-page.tsx` (new)
- `resources/client/dashboard/dashboard-routes.tsx` (route)
- `resources/client/dashboard/digital-products/digital-products-page.tsx` (menu item)
- Tests (listed above)