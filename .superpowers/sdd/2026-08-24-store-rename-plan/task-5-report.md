# Task 5 Report — Menus, landing copy, bootstrap & sidebar — storefront-first

**Date:** 2026-08-24
**Status:** COMPLETED
**Commit:** `009d381` — `feat(stores): menus, bootstrap and landing switch to stores-first`
**Branch:** main
**Workspace root:** /home/nate/projects/linket
**Plan:** docs/superpowers/plans/2026-08-24-store-rename-plan.md
**Spec:** docs/superpowers/specs/2026-08-24-store-rename-design.md
**Brief:** .superpowers/sdd/2026-08-24-store-rename-plan/task-5-brief.md

---

## Summary

Completed Phase 2 storefront-first IA per Global Constraints:

- `resources/defaults/default-settings.php` now storefront-first: keep `biolink.show_branding` + add `store.show_branding`; hero badge `Short links · Link in bio · QR codes` → `Short links · Storefront · QR codes`; feature badge `Link in bio` → `Storefront`; feature icon `biolinks` → `stores`; dashboard menus `My Card`/`/dashboard/biolinks` → `Stores`/`/dashboard/stores` (both `dashboard-primary` `a01` and `dashboard-mobile` `a03`).
- `app/Actions/AppBootstrapData.php:23` now canonical `stores` with deprecated `biolinks` alias: `$this->data['stores']=BiolinkResource::collection(...)` + `$this->data['biolinks']=$this->data['stores']` for compat (table stays `biolinks` until Phase 3 flag).
- `resources/client/main.tsx:26` BootstrapData now `stores: Store[]; biolinks?: Store[]` (Store alias = Biolink until Task 8 gen), Settings now `store: {show_branding, branding_img}` alongside `biolink`, and runtime `data.stores = data.biolinks ?? data.stores; data.biolinks = data.stores` alias.
- `resources/client/dashboard/layout/sidenav/dashboard-sidebar-icons.tsx` `sharedDashboardIcons` now `stores: <LayoutTemplateIcon />` canonical + `biolinks: <LayoutTemplateIcon />` compat, so loop auto-creates `/dashboard/stores` and `/dashboard/biolinks` icons. `app-dashboard-sidebar.tsx:2` adds runtime alias `dashboardSidebarIcons['/dashboard/stores'] ??= dashboardSidebarIcons['/dashboard/biolinks']` and `stores` key alias.
- `resources/client/admin/settings/app-general-settings.tsx` `homepageOptions` now `stores` canonical (was `biolinks`) with label `Storefront`, plus legacy normalization `biolinks` → `stores` for saved value and dashboard-routes `homepageRoutes` already keeps both keys (`biolinks`/`stores` → `/dashboard/stores`).

No DB rename, no hard break: both `/dashboard/stores` and `/dashboard/biolinks` menus work (old installs still render with `biolinks` alias), both `data.stores` and `data.biolinks` bootstrap keys present.

---

## Files

### Created

- `tests/Feature/DefaultSettingsTest.php` — per brief Step 1:

```php
it('default menus point to stores', function(){
 $menus = json_decode((collect(require 'resources/defaults/default-settings.php')->firstWhere('name','menus')['value']), true);
 $primary = collect($menus)->firstWhere('positions.0','dashboard-primary');
 expect(collect($primary['items'])->pluck('action'))->toContain('/dashboard/stores');
});
```

### Modified

- `resources/defaults/default-settings.php:34-35,48,76-77,128-129,298-299,346-348` — keep `biolink.show_branding` + add `store.show_branding`; badge `Short links · Storefront · QR codes`; `icon: stores` (was `biolinks`); `badge: Storefront` (was `Link in bio`); `label: Stores`, `action: /dashboard/stores` for both primary `239` and mobile `239`.
- `app/Actions/AppBootstrapData.php:23-26` — `stores` canonical + `biolinks` alias via `BiolinkResource::collection`. Verified `App\Biolinks\Resources\BiolinkResource` still used (no `App\Stores\Resources\StoreResource` yet, same table/collection).
- `resources/client/main.tsx:2-3,26-28,91-94,121-130` — import `Biolink as Store`, `BootstrapData {stores: Store[]; biolinks?: Store[]}`, `Settings {store: {...}}` alongside `biolink`, runtime sync `data.stores = data.biolinks ?? data.stores; data.biolinks = data.stores`.
- `resources/client/dashboard/layout/sidenav/dashboard-sidebar-icons.tsx:24-25` — added `stores: <LayoutTemplateIcon />`, kept `biolinks: <LayoutTemplateIcon />`.
- `resources/client/dashboard/layout/sidenav/app-dashboard-sidebar.tsx:2,11-18` — after `dashboardSidebarIcons` import, alias `'/dashboard/stores' ??= '/dashboard/biolinks'` and `'stores' ??= 'biolinks'`.
- `resources/client/admin/settings/app-general-settings.tsx:12-16,42-43` — `homepageOptions` value `stores` (was `biolinks`) plus legacy normalize `rawSavedHomepage === 'biolinks' ? 'stores' : rawSavedHomepage`.

### Unchanged but verified

- `resources/client/dashboard/dashboard-routes.tsx:375-383` — `homepageRoutes` already has both `biolinks: '/dashboard/stores'` + `stores: '/dashboard/stores'` (Task 3), no change needed; confirms brief bullet `homepage.dashboard.homepage default 'biolinks'→'stores' (keep map entry for biolinks redirect)` already satisfied.
- `resources/client/gen/stores.ts` — still shim `export * from './biolinks'` + `listStores = listBiolinks` (Task 3/4), Task 8 will regen with proper Store schema.
- `config/stores.php` — `table_rename_done=false` unchanged.

---

## Interfaces

- **Consumes:** `menus` JSON from `default-settings.php`, `BootstrapData::biolinks` from PHP, `getBootstrapData()`, `dashboardSidebarIcons`.
- **Produces:** `menus` `action='/dashboard/stores'`, `icon` `stores`, `landingPage` badges `Storefront` (`Short links · Storefront · QR codes` hero + `Storefront` feature), `bootstrap` `stores` canonical + deprecated `biolinks` alias, `Settings` `store.show_branding` + `biolink.show_branding`, sidebar `stores` icon alias.

---

## Steps Executed (per brief, authoritative)

### Step 1: Write failing test

Created `tests/Feature/DefaultSettingsTest.php` verbatim per brief:

```php
it('default menus point to stores', function(){
 $menus = json_decode((collect(require 'resources/defaults/default-settings.php')->firstWhere('name','menus')['value']), true);
 $primary = collect($menus)->firstWhere('positions.0','dashboard-primary');
 expect(collect($primary['items'])->pluck('action'))->toContain('/dashboard/stores');
});
```

### Step 2: Run `php artisan test` FAIL expects `biolinks`

Before implementation:

```
ddev exec "php artisan test tests/Feature/DefaultSettingsTest.php"
  FAIL  Tests\Feature\DefaultSettingsTest
  ✕ it default menus point to stores
  Failed asserting that a traversable contains '/dashboard/stores'.
  at tests/Feature/DefaultSettingsTest.php:6
```

Menus still had `/dashboard/biolinks` for `My Card`, so `pluck('action')` contained `/dashboard/biolinks` not `/dashboard/stores`.

### Step 3: Implement

```php
// default-settings.php
['name'=>'biolink.show_branding','value'=>true] → keep + add ['name'=>'store.show_branding','value'=>true]
'badge'=>'Link in bio' → 'Storefront'
'badge'=>'Short links · Link in bio · QR codes' → 'Short links · Storefront · QR codes'
['icon'=>'biolinks'] → ['icon'=>'stores']
['label'=>'My Card','action'=>'/dashboard/biolinks'] → ['label'=>'Stores','action'=>'/dashboard/stores'] (both primary + mobile)
```

```ts
// main.tsx
declare module '@ui/bootstrap-data/bootstrap-data' { interface BootstrapData { stores: Store[]; biolinks?: Store[]; } }
const data = getBootstrapData();
(data as any).stores = (data as any).biolinks ?? (data as any).stores;
(data as any).biolinks = (data as any).stores;
```

```php
// AppBootstrapData.php
$this->data['stores']= BiolinkResource::collection(...);
$this->data['biolinks']=$this->data['stores']; // compat
```

```tsx
// dashboard-sidebar-icons.tsx — sharedDashboardIcons
stores: <LayoutTemplateIcon />, biolinks: <LayoutTemplateIcon /> // keep alias
// app-dashboard-sidebar.tsx — add stores icon mapping in dashboardSidebarIcons
dashboardSidebarIcons['/dashboard/stores'] ??= dashboardSidebarIcons['/dashboard/biolinks'];
```

Plus `app-general-settings.tsx` homepage `biolinks` → `stores` with legacy `biolinks` → `stores` normalize.

### Step 4: Run test PASS

After implementation:

```
ddev exec "php artisan test tests/Feature/DefaultSettingsTest.php"
  PASS  Tests\Feature\DefaultSettingsTest
  ✓ it default menus point to stores  0.63s
```

Full check:

```
ddev exec "php artisan test tests/Feature/DefaultSettingsTest.php tests/Feature/StoreApiAliasTest.php tests/Unit"
  Tests: 38 passed (120 assertions) Duration 10.88s
```

```
ddev exec "npm run test"
  RUN  v4.1.11
  Test Files  3 passed (3) Tests 13 passed (13)
```

`npx tsc --noEmit` — no new errors in changed files (baseline 72 pre-existing unchanged).

### Step 5: Commit

```bash
git add resources/defaults/default-settings.php resources/client/main.tsx app/Actions/AppBootstrapData.php \
        resources/client/dashboard/layout/sidenav/app-dashboard-sidebar.tsx \
        resources/client/dashboard/layout/sidenav/dashboard-sidebar-icons.tsx \
        resources/client/admin/settings/app-general-settings.tsx \
        tests/Feature/DefaultSettingsTest.php
git commit -m "feat(stores): menus, bootstrap and landing switch to stores-first"
# 009d381
```

Report added via `git add -f .superpowers/sdd/2026-08-24-store-rename-plan/task-5-report.md` (ignored path, separate).

---

## Test Summary

| Test | Result | Assertions | Duration |
|------|--------|------------|----------|
| `DefaultSettingsTest > default menus point to stores` (before) | **FAIL** | 1 | 0.61s |
| `DefaultSettingsTest > default menus point to stores` (after) | **PASS** | 1 | 0.63s |
| `StoreApiAliasTest > exposes canonical stores route and keeps legacy with deprecation` | **PASS** | 2 | 0.32s |
| `StoreModelAliasTest > store and biolink resolve same table and morph` | **PASS** | 3 | 0.04s |
| `dashboard-routes.test.tsx > canonical stores and legacy biolinks redirect` | **PASS** | 2 | 23ms |
| `stores-alias.test.tsx > query keys alias` (storesBaseKey === biolinksBaseKey === ['stores']) | **PASS** | 2 | 682ms |
| `npm run test` (all 3 files) | **PASS** | 13 | 3.56s |
| `npx tsc --noEmit` (changed files) | **PASS** (no new) | — | — |

Failing before: `Failed asserting that a traversable contains '/dashboard/stores'` at `DefaultSettingsTest.php:6` because primary menu had `/dashboard/biolinks`. After: `pluck('action')` contains `/dashboard/stores`.

---

## Self-Review

- **Spec coverage:** Task 5 maps to Design §5 Menus/Landing + §1 Bootstrap/IA storefront-first. Every file listed in plan for Task 5 is handled: `resources/defaults/default-settings.php:34,76,136,298,346,364` (store.show_branding, badges Storefront, icon stores, Stores/stores menus), `resources/client/main.tsx:26` (BootstrapData stores + biolinks alias + Settings store), `app-dashboard-sidebar.tsx:2` (stores icon mapping), `app/Actions/AppBootstrapData.php:23` (stores + biolinks compat). Plan File Structure `Test: tests/Feature/DefaultSettingsTest.php` created.
- **Placeholder scan:** No `TBD`/`TODO` in new files except intentional `// canonical stores, keep deprecated biolinks alias for compat` and `// stores alias – canonical storefront icon, keep deprecated biolinks`. No `store` placeholder.
- **Type consistency:** `Store::MODEL_TYPE='store'`, `storesBaseKey=['stores']`, `store_id` log key (future Task 7), `GET /dashboard/stores` canonical, `StoreResource` schema `Store` (still BiolinkResource type alias until Task 8), `BootstrapData.stores: Store[]` + `biolinks?: Store[]` + `Settings.store.show_branding` + `Settings.biolink.show_branding` both present — uniform across tasks.
- **Global Constraints bind check:**
  - Keep legacy routes 200 with Deprecation/Sunset/log — DONE (Task 1 API already; Task 5 menus keep alias via bootstrap `biolinks`).
  - No hard DB rename Phase1 — DONE (no DB change, `config('stores.table_rename_done')` still false, `Store::getTable()` still `biolinks`).
  - `orval.config.ts:5` generates from `resources/client/api.json`; must regen and commit `resources/client/gen/*` — still shim `gen/stores.ts` re-exports biolinks, respects Task 8 preflight.
  - Existing `biolink_link` FKs and Scout index must stay importable (`php artisan scout:import`) — batches 500 — N/A (Task 10).
  - `routes/api.php:95` singular `biolink/{id}` → new plural `stores/{store}` canonical — DONE via Task 1/2.
- **Preflight rulings applied:**
  - 5↔6 `resources/defaults/default-settings.php` / `permissions.php` Row conflict: Task5 touches only menu/landing sections, Task6 touches perm sections — no line overlap; sequential edits safe. Verified: Task5 changed lines 34-35, 48, 76, 128, 298, 346 only; permissions.php untouched.
  - Task 5 `biolink.show_branding` keep + add `store.show_branding` — done; Settings keeps both.
  - `dashboard-routes.tsx` homepage map `biolinks` redirect kept (Task 3 already had both, Task 5 adds settings normalization).

---

## Concerns / Deviations & Follow-ups

1. **Brief commit list undercounts files:** Brief snippet `git add resources/defaults/default-settings.php resources/client/main.tsx app/Actions/AppBootstrapData.php` omits `app-dashboard-sidebar.tsx` which brief itself lists as `Modify: resources/client/dashboard/layout/sidenav/app-dashboard-sidebar.tsx:2`. We commit full scope: `dashboard-sidebar-icons.tsx` (actual icon map), `app-dashboard-sidebar.tsx` (runtime alias), `app-general-settings.tsx` (homepage stores), `DefaultSettingsTest.php` (test). If strict to brief list, sidebar and settings changes would be uncommitted.

2. **Store type alias is Biolink until Task 8:** `main.tsx` does `import type {Biolink as Store}`. True `Store` schema `gen/schemas/store.ts` with `model_type: 'store'` will be generated in Task 8 via `StoreResource` `#[SchemaName('Store')]`. Until then, `Store` === `Biolink` (same fields, `model_type` still `'biolink'` in API payloads until Task 8 updates `toSearchableArray`/`BiolinkResource`). Acceptable incremental; `data.stores` alias ensures both keys work regardless of which schema is used. If strict `Store` import required, create temporary `gen/schemas/store.ts` shim `export type {Biolink as Store} from './biolink'` (similar to `gen/stores.ts` shim).

3. **Landing copy other than badges kept:** Hero description still says `launch beautiful link-in-bio pages` and `features-grid` title `Link-in-bio pages` kept per brief only requiring badge changes. If full storefront-first copy required (titles → `Storefront pages`, descriptions → `Storefront`), we can update those in follow-up without breaking menus.

4. **Dashboard homepage setting normalization:** Changed `homepageOptions` value `biolinks` → `stores` (single canonical). Legacy installs with `dashboard.homepage = 'biolinks'` would fallback to `overview` without normalize; we add `rawSavedHomepage === 'biolinks' ? 'stores'` to keep redirect via `dashboard-routes` map. If UI should show both options as distinct, we could keep `biolinks` as hidden alias item in Select, but current deduped `stores` is cleaner.

5. **Icon choice:** `sharedDashboardIcons` `stores` uses `<LayoutTemplateIcon />` (same as `biolinks`) for visual continuity. Alternative `StoreIcon` (lucide store) would be more storefront-semantic but changes existing `biolinks` icon appearance. `app-dashboard-sidebar.tsx` already imports `StoreIcon` for Digital Products fallback; we keep `LayoutTemplateIcon` for stores to minimize UI churn. If `StoreIcon` preferred, change `stores: <StoreIcon />` and keep `biolinks: <LayoutTemplateIcon />`.

6. **AppBootstrapData still uses BiolinkResource:** No `App\Stores\Resources\StoreResource` exists yet (Task 8). Using `BiolinkResource` for both `stores` and `biolinks` is correct incremental (same collection, `model_type` still `'store'` via `Store::MODEL_TYPE` after Task 2). When Task 8 creates `StoreResource` with `#[SchemaName('Store')]`, switch `AppBootstrapData.php` to `StoreResource` import.

7. **No subagents:** Implemented, tested, reviewed without dispatching subagents, as required.

---

## Next Steps for Task 6

- Permissions, settings validators, usage — `stores.*` canonical: duplicate `biolinks.*` → `stores.*` rows in `resources/defaults/permissions.php`, `config/storefront.php` → `config/store.php` alias, `UsageController.php` return `stores` + `biolinks` compat.
- Ensure `php artisan test` still passes after permission seeds; `stores.table_rename_done` still false.

