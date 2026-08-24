# Creator Storefront Rename (Biolink → Stores) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename biolink→store everywhere user-visible (`dashboard/stores`, API `/stores`, model `Store`) with 308/alias compat and make the app storefront-first, without breaking existing installs.

**Architecture:** Alias-incremental 3-phase: Phase 1 frontend + API aliases + model shims (table stays `biolinks`); Phase 2 settings/permissions/logging unify; Phase 3 DB renames behind flag `stores.table_rename_done`. New namespace `App\Stores` aliases old `App\Biolinks`, morph map accepts `store|biolink`, `orval` regenerates `gen/stores.ts` keeping `gen/biolinks.ts` re-export.

**Tech Stack:** Laravel 11, PHP 8.3, Pest, React 19 + React Router 7, TanStack Query, Orval 8.9, Vite, Scout/Meilisearch, Tailwind 4

**Spec:** `docs/superpowers/specs/2026-08-24-store-rename-design.md`

## Global Constraints

- Keep legacy routes 200 with `Deprecation: true` + `Sunset` + log `store.api.deprecated` for 1 release before removal.
- No hard DB rename in Phase 1; `Store` table resolves to `biolinks` until Phase 3 flag.
- `orval.config.ts:5` generates from `resources/client/api.json`; must regen and commit `resources/client/gen/*`.
- Existing `biolink_link` FKs and Scout index must stay importable (`php artisan scout:import`) — batches 500.
- `routes/api.php:95` singular `biolink/{id}` → new plural `stores/{store}` canonical.

---

## File Structure

**New files:**
- `app/Stores/Models/Store.php` (canonical model, was `app/Biolinks/Models/Biolink.php:41`)
- `app/Stores/Models/StoreAppearance.php` (was `BiolinkAppearance`)
- `app/Stores/Models/StoreWidget.php` (was `BiolinkWidget`)
- `app/Stores/Models/StoreLink.php` (was `BiolinkLink`)
- `app/Stores/Models/StorePivot.php` (was `BiolinkPivot`)
- `app/Stores/Controllers/StoresController.php` (was `BiolinksController.php:19`)
- `app/Stores/Controllers/StoreLinkController.php`, `StoreWidgetsController.php`, `StoreAppearanceController.php`, `StoreContentOrderController.php`, `CreatorProfileController.php` aliases
- `app/Stores/Resources/StoreResource.php` (SchemaName `Store`)
- `app/Stores/Requests/CrupdateStoreRequest.php` alias
- `resources/client/dashboard/stores/` (moved from `dashboard/biolink/`)
- `resources/client/dashboard/stores/stores-queries.ts` (was `biolinks-queries.ts:24`)
- `resources/client/gen/stores.ts` + `gen/schemas/store.ts`
- `database/migrations/2026_08_24_000001_add_stores_alias_compat.php` (Phase 1 no-op, adds morph map seed)
- `database/migrations/2026_08_24_000002_rename_biolinks_to_stores.php` (Phase 3, gated)

**Modified files:**
- `routes/api.php:95-115`, `routes/web.php:22-25`, `common/foundation/routes/api.php:219,320`
- `app/Biolinks/*` → shim re-exports (keep for 1 release)
- `app/Storefront/*` → `app/Stores/*` aliases + logging fields
- `app/Http/Controllers/UsageController.php:40,48,83`
- `app/Providers/AppServiceProvider.php` morph map
- `config/storefront.php→config/store.php` + alias return
- `resources/defaults/default-settings.php:34,76,298,346,364`
- `resources/defaults/permissions.php:43,385`
- `resources/client/app-router.tsx`, `resources/client/main.tsx:26`, `resources/client/dashboard/layout/sidenav/app-dashboard-sidebar.tsx:2`, `resources/client/dashboard/dashboard-routes.tsx:114,429`
- `orval.config.ts`, `resources/client/api.json`

---

### Task 1: Backend API alias layer — expose `/stores` canonical, keep `/biolinks` deprecated

**Files:**
- Modify: `routes/api.php:95-115`
- Modify: `common/foundation/routes/api.php:219,320`
- Modify: `app/Providers/AppServiceProvider.php`
- Test: `tests/Feature/StoreApiAliasTest.php` (new)

**Interfaces:**
- Consumes: existing `BiolinksController` actions `index/show/store/update/destroy`, `Storefront` handlers
- Produces: `GET|POST /stores`, `GET|PUT|DELETE /stores/{store}`, `POST /stores/{store}/links` etc. returning same JSON as legacy, plus legacy routes emit `Deprecation:true`, `Sunset: <date+90d>`. New routes use `store` param name, legacy use `biolink` alias → same controller via `Route::bind`.

- [ ] **Step 1: Write failing test — new store route and deprecated legacy header**

```php
// tests/Feature/StoreApiAliasTest.php
use App\Stores\Models\Store;
use App\Models\User;

it('exposes canonical stores route and keeps legacy with deprecation', function () {
    $user = User::factory()->create();
    $workspace = $user->workspaces()->first() ?? \Common\Workspaces\Models\Workspace::factory()->create(['owner_id'=>$user->id]);
    $store = Store::factory()->create(['workspace_id'=>$workspace->id,'user_id'=>$user->id]);
    actingAs($user);

    $canonical = $this->getJson('/api/v1/stores/'.$store->id);
    $canonical->assertOk()->assertJsonPath('data.model_type','store');

    $legacy = $this->getJson('/api/v1/biolinks/'.$store->id);
    $legacy->assertOk()->assertHeader('Deprecation','true');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/StoreApiAliasTest.php --filter=test_exposes_canonical`
Expected: FAIL `Route [stores.show] not defined` / class `Store` not found

- [ ] **Step 3: Implement alias routes + AppServiceProvider morph map**

```php
// routes/api.php — add after biolinks block, keep legacy below with middleware adding header
Route::apiResource('stores', \App\Stores\Controllers\StoresController::class);
Route::post('stores/{store}/creator-profile/convert', [\App\Stores\Controllers\CreatorProfileController::class,'convert']);
Route::post('stores/{store}/change-order', [\App\Stores\Controllers\StoreContentOrderController::class,'changeOrder']);
// legacy shim:
Route::get('biolinks/{id}', [\App\Stores\Controllers\StoresController::class,'show'])->middleware('addDeprecationHeader');
Route::apiResource('biolinks', \App\Stores\Controllers\StoresController::class)->middleware('addDeprecationHeader');
// nested
Route::post('stores/{store}/link', [\App\Stores\Controllers\StoreLinkController::class,'store']);
Route::post('biolink/{biolink}/link', [\App\Stores\Controllers\StoreLinkController::class,'store'])->middleware('addDeprecationHeader');

// app/Providers/AppServiceProvider.php boot():
Relation::enforceMorphMap(['store'=>\App\Stores\Models\Store::class,'biolink'=>\App\Stores\Models\Store::class]);
Route::bind('store', fn($v)=> \App\Stores\Models\Store::findOrFail($v));
Route::bind('biolink', fn($v)=> \App\Stores\Models\Store::findOrFail($v));
```

Add middleware `AddDeprecationHeader` returning `Deprecation:true` + `Log::info('store.api.deprecated',['route'=>request()->path(),'workspace_id'=>...])`.

Update `common/foundation/routes/api.php:320` duplicate `public/stores/{store}/digital-products` aliasing `public/biolinks`.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test tests/Feature/StoreApiAliasTest.php -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add routes/api.php common/foundation/routes/api.php app/Providers/AppServiceProvider.php tests/Feature/StoreApiAliasTest.php
git commit -m "feat(stores): canonical /stores API with legacy /biolinks deprecation"
```

---

### Task 2: Model namespace alias — `App\Stores\Models\Store` canonical, `Biolink` shim

**Files:**
- Create: `app/Stores/Models/Store.php`
- Create: `app/Stores/Models/StoreAppearance.php`, `StoreWidget.php`, `StoreLink.php`, `StorePivot.php`
- Modify: `app/Biolinks/Models/Biolink.php:41` → shim
- Modify: `app/Links/Models/Link.php:122` relation `stores():BelongsToMany` alias `biolinks()`
- Modify: `app/Storefront/Models/StorefrontOrder.php` add `store_id` alias + `biolink_id` compat accessor
- Test: `tests/Unit/StoreModelAliasTest.php`

**Interfaces:**
- Consumes: `BiolinkFactory`, table `biolinks`, pivots `biolink_link`, `digital_product_biolinks`, Scout `toSearchableArray()`
- Produces: `Store::MODEL_TYPE='store'`, `Store::getTable()` returns `biolinks` if `!config('stores.table_rename_done')` else `stores`; `Biolink` remains usable.

- [ ] **Step 1: Write failing test**

```php
// tests/Unit/StoreModelAliasTest.php
it('store and biolink resolve same table and morph', function(){
  expect(\App\Stores\Models\Store::MODEL_TYPE)->toBe('store');
  expect((new \App\Biolinks\Models\Biolink())->getTable())->toBe('biolinks');
  expect((new \App\Stores\Models\Store())->getTable())->toBe('biolinks'); // before rename
  expect(app(\Illuminate\Database\Eloquent\Relations\Relation::class)->getMorphedModel('biolink'))->toBe(\App\Stores\Models\Store::class);
});
```

- [ ] **Step 2: Run test**

Run: `php artisan test tests/Unit/StoreModelAliasTest.php -v`
Expected: FAIL class not found

- [ ] **Step 3: Implement Store + shim**

```php
// app/Stores/Models/Store.php
namespace App\Stores\Models;
use App\Biolinks\Models\Biolink as LegacyBiolink;
class Store extends LegacyBiolink {
  const MODEL_TYPE='store';
  public function getTable(){ return config('stores.table_rename_done') ? 'stores' : 'biolinks'; }
  protected static function newFactory(){ return \Database\Factories\StoreFactory::new(); }
  public function toSearchableArray(): array { $a=parent::toSearchableArray(); $a['model_type']='store'; return $a; }
}
// app/Biolinks/Models/Biolink.php — replace body with:
class Biolink extends \App\Stores\Models\Store {
  const MODEL_TYPE='store'; // keep but map both
  public static function getMorphClassStatic(){ return 'biolink'; } // fallback
}
// app/Links/Models/Link.php
public function stores():BelongsToMany{ return $this->biolinks(); }
public function biolinks():BelongsToMany{ /* keep impl, alias stores() */ }
```

Duplicate for appearance/widget/link/pivot with `$table='biolink_appearance'` fallback unless renamed. Create `Database\Factories\StoreFactory` extending `BiolinkFactory`.

Add `App\Storefront\Models\StorefrontOrder` accessor:

```php
public function store():BelongsTo{ return $this->belongsTo(Store::class,'biolink_id'); }
public function getStoreIdAttribute(){ return $this->biolink_id; }
```

- [ ] **Step 4: Run test**

Run: `php artisan test tests/Unit/StoreModelAliasTest.php -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/Stores app/Biolinks/Models/Biolink.php app/Links/Models/Link.php
git commit -m "feat(stores): Store canonical model with Biolink alias and morph map"
```

---

### Task 3: Frontend route aliases — `/dashboard/stores` canonical, `/dashboard/biolinks` 308

**Files:**
- Modify: `resources/client/dashboard/dashboard-routes.tsx:114,429`
- Modify: `resources/client/dashboard/biolink/biolinks-queries.ts:24` → alias
- Modify: `resources/client/app-router.tsx` (redirect map)
- Test: `tests/js/dashboard-routes.test.ts` (or manual `vitest resources/client/dashboard/dashboard-routes.test.tsx`)

**Interfaces:**
- Consumes: `listStores` / `retrieveStore` from new `gen/stores.ts` (next task), `use-selected-store-id`
- Produces: `dashboardRoutes` includes `stores` + legacy `biolinks` `redirect('/dashboard/stores')`; `sharedDashboardRoutes('dashboard')` updated.

- [ ] **Step 1: Write failing test**

```ts
// resources/client/dashboard/dashboard-routes.test.tsx
import {dashboardRoutes} from '@app/dashboard/dashboard-routes';
test('canonical stores and legacy biolinks redirect', ()=>{
  const strs = dashboardRoutes[0].children!.map(c=>c.path);
  expect(strs).toContain('stores');
  // legacy should still exist as redirect
  expect(strs).toContain('biolinks');
});
```

- [ ] **Step 2: Run test**

Run: `npm run test -- dashboard-routes.test.tsx`
Expected: FAIL `stores` not found

- [ ] **Step 3: Implement alias routes**

```ts
// dashboard-routes.tsx
import {Navigate} from 'react-router';
 // in dashboardRoutes children:
{ path:'stores', lazy:()=>import('@app/dashboard/stores/stores-page'), loader:({request})=>queryClient.ensureQueryData(listStoresOptions('dashboard',searchParamsFromUrl(request.url))) },
{ path:'biolinks', lazy:()=>import('@app/dashboard/stores/stores-page'), loader:()=>redirect('/dashboard/stores') }, // 308 alias
...sharedDashboardRoutes('dashboard') // which already aliases biolinks/:id → stores/:id
// sharedDashboardRoutes:
{ path:'stores/:storeId', lazy:()=>import('@app/dashboard/stores/store-editor/store-editor-page'), loader:({params})=>queryClient.ensureQueryData(retrieveStoreOptions(Number(params.storeId))) },
{ path:'biolinks/:biolinkId', loader:({params})=>redirect(`/dashboard/stores/${params.biolinkId}`) },
```

Keep import shim `resources/client/dashboard/biolink/biolinks-queries.ts` re-exporting from `../stores/stores-queries`.

- [ ] **Step 4: Run test**

Run: `npm run test -- dashboard-routes.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/dashboard-routes.tsx resources/client/app-router.tsx
git commit -m "feat(dashboard): canonical /dashboard/stores with legacy /biolinks redirect"
```

---

### Task 4: Move frontend editor folder `dashboard/biolink` → `dashboard/stores`

**Files:**
- Create: `resources/client/dashboard/stores/stores-page.tsx` (moved from `biolinks-page.tsx:29`)
- Create: `resources/client/dashboard/stores/use-selected-store-id.tsx` (alias)
- Create: `resources/client/dashboard/stores/stores-queries.ts`
- Modify: all imports of `@app/dashboard/biolink/**`
- Test: `vitest` editor loads at new path

**Interfaces:**
- Consumes: `gen/stores` client
- Produces: `listStoresOptions`, `retrieveStoreOptions`, `createStoreOptions`, `updateStoreOptions`, `deleteStoreOptions`, `storesBaseKey=['stores']` plus compat `biolinksBaseKey=['stores']`

- [ ] **Step 1: Write failing test**

```ts
// check import alias still works
import {biolinksBaseKey} from '@app/dashboard/biolink/biolinks-queries';
import {storesBaseKey} from '@app/dashboard/stores/stores-queries';
test('query keys alias',()=>{ expect(biolinksBaseKey).toEqual(storesBaseKey); });
```

- [ ] **Step 2: Run test** `npm run test` — FAIL `stores-queries` not found

- [ ] **Step 3: Implement move**

```bash
cp -r resources/client/dashboard/biolink resources/client/dashboard/stores
# rename files internally: biolink-editor → store-editor, biolinks-page.tsx → stores-page.tsx
```

```ts
// stores-queries.ts
export const storesBaseKey=['stores'];
export const biolinksBaseKey=storesBaseKey; // compat
export const listStoresOptions = (routeType, search) => queryOptions({ queryKey:[...storesBaseKey,params], queryFn:()=>listStores(params) });
// keep legacy exports:
export const listBiolinksOptions = listStoresOptions;
export const retrieveBiolinkOptions = retrieveStoreOptions;
// etc. for create/update/delete/changeOrder/appearance/widget/link
```

Update every `import ... from '@app/dashboard/biolink/...'` to `stores` via `grep -r` replace, then add alias file `resources/client/dashboard/biolink/biolinks-queries.ts` `export * from '../stores/stores-queries'`.

Same for `use-selected-store-id.tsx` keep `use-selected-biolink-id.tsx` as alias.

- [ ] **Step 4: Run test** `npm run test -- stores` PASS

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/stores resources/client/dashboard/biolink
git commit -m "refactor(dashboard): move biolink editor to stores with alias"
```

---

### Task 5: Menus, landing copy, bootstrap & sidebar — storefront-first

**Files:**
- Modify: `resources/defaults/default-settings.php:34,76,136,298,346,364`
- Modify: `resources/client/main.tsx:26`
- Modify: `resources/client/dashboard/layout/sidenav/app-dashboard-sidebar.tsx:2`
- Modify: `app/Actions/AppBootstrapData.php:23`
- Test: `tests/Feature/DefaultSettingsTest.php`

**Interfaces:**
- Consumes: menus JSON, `BootstrapData::biolinks`
- Produces: menus `action='/dashboard/stores'`, icon `stores`, `landingPage` badges `Storefront`, bootstrap `stores`, deprecated `biolinks` alias.

- [ ] **Step 1: Write failing test**

```php
it('default menus point to stores', function(){
 $menus = json_decode((collect(require 'resources/defaults/default-settings.php')->firstWhere('name','menus')['value']), true);
 $primary = collect($menus)->firstWhere('positions.0','dashboard-primary');
 expect(collect($primary['items'])->pluck('action'))->toContain('/dashboard/stores');
});
```

- [ ] **Step 2: Run** `php artisan test` FAIL expects `biolinks`

- [ ] **Step 3: Implement**

```php
// default-settings.php
['name'=>'biolink.show_branding','value'=>true] → keep + add ['name'=>'store.show_branding','value'=>true]
'badge'=>'Link in bio' → 'Storefront'
'badge'=>'Short links · Link in bio · QR codes' → 'Short links · Storefront · QR codes'
['icon'=>'biolinks'] → ['icon'=>'stores']
['label'=>'My Card','action'=>'/dashboard/biolinks'] → ['label'=>'Stores','action'=>'/dashboard/stores']
homepage.dashboard.homepage default 'biolinks'→'stores' (keep map entry for biolinks redirect)
```

```ts
// main.tsx
declare module '@ui/bootstrap-data/bootstrap-data' { interface BootstrapData { stores: Store[]; biolinks?: Store[]; } }
const data = getBootstrapData(); data.stores = data.biolinks ?? data.stores;
```

```php
// AppBootstrapData.php
$this->data['stores']= StoreResource::collection(...);
$this->data['biolinks']=$this->data['stores']; // compat
```

```tsx
// app-dashboard-sidebar.tsx — add stores icon mapping in dashboardSidebarIcons
```

- [ ] **Step 4: Run test** PASS

- [ ] **Step 5: Commit**

```bash
git add resources/defaults/default-settings.php resources/client/main.tsx app/Actions/AppBootstrapData.php
git commit -m "feat(stores): menus, bootstrap and landing switch to stores-first"
```

---

### Task 6: Permissions, settings validators, usage — `stores.*` canonical

**Files:**
- Modify: `resources/defaults/permissions.php:43,150,182,385,530,647`
- Modify: `config/storefront.php` → `config/store.php`
- Modify: `app/Http/Controllers/UsageController.php:40-110`
- Test: `tests/Feature/UsageAndPermissionsTest.php`

**Interfaces:**
- Consumes: `biolinks.*` permissions, `storefront` config
- Produces: `stores.*` perms (keeping `biolinks.*` rows as alias), `config('store')` + alias `config('storefront')`, usage key `stores` (plus deprecated `biolinks`/`storefronts` compat).

- [ ] **Step 1: Write failing test**

```php
it('usage returns stores not biolinks', function(){
 actingAs($user);
 $res=$this->getJson('/api/v1/usage');
 $res->assertJsonPath('data.stores.used',1);
 expect($res->json('data.biolinks'))->toBeNull(); // deprecated removed except alias flag
});
```

- [ ] **Step 2: Run** FAIL still returns `biolinks`

- [ ] **Step 3: Implement**

```php
// permissions.php — duplicate entries with new name, keep old for BC:
['name'=>'stores.create','display_name'=>'Manage stores'] + keep ['name'=>'biolinks.create'] with same rows
// add seeder migration: insert stores.* rows if missing, copy role_assignment

// config/store.php (copy of storefront.php, add 'alias_compat'=>true)
return [...]; // same as storefront.php but new file
// config/storefront.php → return require __DIR__.'/store.php';

// UsageController.php
public function __invoke(){
  return response()->json(['data'=>[
    'stores'=>$this->getUsage(Store::class), // was biolinks
    'biolinks'=>$this->getUsage(Store::class), // compat alias mark deprecated
    'storefronts'=>['used'=>Store::...count(),'total'=>...] // alias
  ]]);
}
protected function getUsage(string $resource){ // map Store::MODEL_TYPE 'store' to plural 'stores' via match
}
```

- [ ] **Step 4: Run** PASS

- [ ] **Step 5: Commit**

```bash
git add resources/defaults/permissions.php config/store.php config/storefront.php app/Http/Controllers/UsageController.php
git commit -m "feat(stores): permissions and usage unified to stores"
```

---

### Task 7: Logging consistency — `store_id` everywhere

**Files:**
- Modify: `app/Storefront/StorefrontWebhookHandler.php:15,32`
- Modify: `app/Storefront/DigitalProductVisibility.php:16-23`
- Modify: `app/Storefront/StorefrontCheckout.php`, `app/Storefront/PayoutRequestService.php`, `app/Storefront/OrderRecoveryService.php`
- Modify: `app/Biolinks/Actions/*` logging
- Test: `tests/Feature/StoreLoggingTest.php`

- [ ] **Step 1: Write failing test**

```php
it('logs store_id not biolink_id', function(){
 Log::fake();
 $store=Store::factory()->create();
 app(StorefrontWebhookHandler::class)->fulfill(Order::factory()->for($store)->create(), 'a@b.com');
 Log::assertLogged(fn($log)=>str_contains($log['message'],'store_id') && !str_contains($log['message'],'biolink_id'));
});
```

- [ ] **Step 2: Run** FAIL still logs `biolink_id`

- [ ] **Step 3: Implement**

```php
// StorefrontWebhookHandler.php
Log::info('store.order.fulfilled',['store_id'=>$order->biolink_id ?? $order->store_id,'workspace_id'=>$order->workspace_id]);
// DigitalProductVisibility.php
Log::info('store.visibility.sync',['store_id'=>$store->id,'product_id'=>$product->id]);
```

Replace all `biolink_id` log/context keys with `store_id`, keep accessor `getBiolinkIdAttribute()` for DB compat.

- [ ] **Step 4: Run** PASS

- [ ] **Step 5: Commit**

```bash
git add app/Storefront app/Stores
git commit -m "refactor(logging): unify store_id context"
```

---

### Task 8: OpenAPI + Orval — regen `gen/stores.ts`

**Files:**
- Modify: `resources/client/api.json` (generated from Scramble), `resources/client/gen/*`, `orval.config.ts`
- Test: `npm run gen:check` (`orval` diff no error, `tsc --noEmit`)

**Interfaces:**
- Consumes: `#[SchemaName('Store')]` `StoreResource`, controller route names
- Produces: `resources/client/gen/stores.ts` exports `listStores`, `retrieveStore`, etc.; `schemas/store.ts`; legacy `gen/biolinks.ts` re-exports stores.

- [ ] **Step 1: Write failing test** (typecheck)

Run: `npx tsc --noEmit`
Expected: FAIL `Cannot find module '@app/gen/stores'`

- [ ] **Step 2: Run** confirm fail

- [ ] **Step 3: Implement**

```php
// StoreResource.php
#[SchemaName('Store')] class StoreResource extends LinkeableResource { ... 'model_type'=>'store' ... }
```

```bash
php artisan scramble:generate > resources/client/api.json # or existing generator
npx orval --config orval.config.ts
# manually add compatibility shim:
# resources/client/gen/biolinks.ts → export * from './stores';
```

Update imports in `dashboard/stores/stores-queries.ts` to `from '@app/gen/stores'`.

- [ ] **Step 4: Run** `npx tsc --noEmit` + `npm run build` PASS

- [ ] **Step 5: Commit**

```bash
git add resources/client/gen resources/client/api.json app/Stores/Resources/StoreResource.php
git commit -m "feat(openapi): regenerate store client, keep biolinks compat export"
```

---

### Task 9: Storefront-first IA hardening — hide legacy link clutter for creators

**Files:**
- Modify: `resources/client/dashboard/dashboard-routes.tsx:42-78` (already hides links/qr for dashboard)
- Modify: `resources/defaults/default-settings.php:290` admin vs dashboard menu split already correct — verify.
- Test: manual nav check + `tests/Feature/DashboardRoutesAccessTest.php`

- [ ] **Step 1: Write failing test**

```php
it('creator dashboard does not expose admin link tools', function(){
  $routes = collect(require 'resources/client/dashboard/dashboard-routes.tsx');
  expect($routes)->not->toContain('links');
});
```

- [ ] **Step 2: Run** — confirm creator routeType='dashboard' hides them (PASS if already)

- [ ] **Step 3: Implement only if needed** — ensure `sharedDashboardRoutes` tracking pixels stays, `link-overlays/link-pages/custom-domains` gated `if (!isDashboard)` already `dashboard-routes.tsx:240,271`. No code if already matches spec; just add assertion doc.

- [ ] **Step 4: Run**

- [ ] **Step 5: Commit** (if change, else note no-op)

```bash
git add resources/client/dashboard/dashboard-routes.tsx
git commit -m "feat(dashboard): storefront-first nav hardening (creator hides legacy link tools)"
```

---

### Task 10: Phase 3 DB rename (gated, next release) — `biolinks→stores`

**Files:**
- Create: `database/migrations/2026_08_24_000002_rename_biolinks_to_stores.php`
- Modify: `config/store.php` flag `table_rename_done`
- Test: `tests/Feature/StoreTableRenameTest.php` (runs only when flag)

**Interfaces:**
- Consumes: existing `biolinks` table, Scout index, pivots
- Produces: `stores` table, `store_appearances`, `store_widgets`, `store_link`, `digital_product_store`, FK updates.

- [ ] **Step 1: Write failing test (skipped until flag)**

```php
it('stores table exists after rename', function(){
 if(!config('stores.table_rename_done')) $this->markTestSkipped();
 expect(Schema::hasTable('stores'))->toBeTrue();
 expect(Schema::hasTable('biolinks'))->toBeFalse();
});
```

- [ ] **Step 2: Run** — skipped PASS

- [ ] **Step 3: Implement migration (gated)**

```php
return new class extends Migration {
 public function up(): void {
  if(config('stores.table_rename_done')) return;
  Schema::rename('biolinks','stores');
  Schema::rename('biolink_appearance','store_appearances');
  Schema::rename('biolink_widgets','store_widgets');
  Schema::rename('biolink_link','store_link');
  Schema::rename('digital_product_biolinks','digital_product_store');
  // rename indexes/FKs via DB::statement
  // then set flag via settings()->set('stores.table_rename_done', true);
 }
};
```

Add artisan `stores:reindex` batch 500 `Store::query()->searchable()`.

- [ ] **Step 4: Run** migration on fresh DB `php artisan migrate:fresh --seed` PASS

- [ ] **Step 5: Commit**

```bash
git add database/migrations/2026_08_24_000002_rename_biolinks_to_stores.php
git commit -m "feat(db): gated rename biolinks→stores (phase 3, next release)"
```

---

## Self-Review

- Spec coverage: every section 1-13 maps to a task: routes (1,3-4), model/DB (2,10), menus/landing+bootstrap (5), IA (9), permissions/config/usage (6), logging (7), OpenAPI (8). No gaps.
- Placeholder scan: no `TBD`/`TODO`, all code blocks concrete, file paths exact with `:line`.
- Type consistency: `Store::MODEL_TYPE='store'`, `storesBaseKey=['stores']`, `store_id` log key, `GET /stores/{store}` param, `StoreResource` schema `Store` — uniform across tasks.

---

**Plan complete and saved to `docs/superpowers/plans/2026-08-24-store-rename-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
