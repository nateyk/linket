# Creator Storefront Rename — Biolink → Store Design

**Date:** 2026-08-24
**Status:** Approved (incremental alias rename to `stores`)
**Author:** OpenCode / Muse Spark

## 0. Summary

Rename user-facing and internal terminology from `biolink`/`Biolink`/`biolinks` (2174 refs, 149 dashboard route refs) to `store`/`Store`/`stores` and unify `storefront`/`digital-products` duality into one concept. Final glossary: a **Store** is a creator storefront page (was Biolink), holding `StoreAppearance`, `StoreWidget`, `StoreLink` content and `DigitalProduct`s. The app becomes storefront-first: `/dashboard/stores` is primary nav, legacy suffixes remain as 308/B-C aliases for one release.

Approach: **alias-incremental in 3 phases** (frontend+API aliases → model aliases → DB table rename). Avoids one-shot breakage of Scout index, polymorphic `model_type`, external API consumers, and `biolink_link` FKs.

## 1. Context & Goals

- Current `App\Biolinks\Models\Biolink` `MODEL_TYPE='biolink'` `app/Biolinks/Models/Biolink.php:41` is the Store entity. It already carries `digitalProducts()` `app/Biolinks/Models/Biolink.php:126`, `appearance`, `widgets`, `links` via `biolink_link`. Commerce engine lives in `app/Storefront/` (15 files) but `StorefrontOrder.biolink_id` leaks biolink terminology.
- Routes split: REST `biolinks` `routes/api.php:95` vs nested singular `biolink/{id}/link` `routes/api.php:106`, public `public/biolinks/{biolink}` `common/foundation/routes/api.php:320` and web `{biolink}/products` `routes/web.php:22`. Foundation API already has dual `storefront/products` `common/foundation/routes/api.php:219` and `digital-products` `common/foundation/routes/api.php:239` with compat comment.
- Dashboard `resources/client/dashboard/dashboard-routes.tsx:114,429` exposes `dashboard/biolinks`, folder `dashboard/biolink/` and `admin/biolinks-datatable-page/`. Menu label already `My Card → /dashboard/biolinks` `resources/defaults/default-settings.php:298` hides the word but path remains.
- `config/storefront.php:8`, `UsageController.php:48,83` expose both `biolinks` and `storefronts` counting same `biolinks` table. Permissions `biolinks.create` `resources/defaults/permissions.php:43`.
- `orval.config.ts:5` generates `resources/client/gen/biolinks.ts` from `resources/client/api.json`; resource `BiolinkResource.php` `#[SchemaName('Biolink')]`.

Goals:
1. Consistent naming: `store/stores` everywhere user-visible, `store_id` in logs/payloads.
2. Creator storefront-first IA: stores/products before generic links.
3. Zero downtime, backward compat for installed workspaces, API tokens, bookmarks.
4. Fix logging inconsistency: unified `store_id`, `workspace_id`, `product_id` context.

Non-goals (deferred): public short-URL host change, multi-store per workspace limits beyond `config/storefront.php:19` `max_storefronts` rename.

## 2. Glossary (Final State)

| Final | Was | Notes |
|---|---|---|
| `App\Stores\Models\Store` | `App\Biolinks\Models\Biolink` | `MODEL_TYPE='store'`, table `stores`, compat alias `biolink` |
| `StoreAppearance` | `BiolinkAppearance` | `store_appearances` |
| `StoreWidget` | `BiolinkWidget` | `store_widgets` |
| `StoreLink` (pivot model) | `BiolinkLink/BiolinkPivot` | pivot `store_link` |
| `StoreOrder` | `StorefrontOrder` | pivot `digital_product_store` (was `digital_product_biolinks`) |
| `StoreCheckout/StoreEarnings` | `StorefrontCheckout/StorefrontEarnings` | namespace `App\Stores` |
| API `/stores` | `/biolinks`, `/biolink/{id}` | old routes 200 with `Deprecation` header |
| Frontend `/dashboard/stores` | `/dashboard/biolinks` | old path 308 |
| Permission `stores.create` | `biolinks.create` | seeder migrates roles |
| Setting `store.show_branding` | `biolink.show_branding` | `resources/defaults/default-settings.php:34` |
| Usage key `stores` | `biolinks`+`storefronts` | `UsageController.php` |

Keep `DigitalProduct` name (product entity) — only relation pivot renamed. Keep `Storefront` PHP namespace as class_alias for 1 release, then remove.

## 3. Architecture

- New namespace `App\Stores` (models, actions, controllers, resources, policies, query builders). Old `App\Biolinks` stays as re-export/alias shim for 1 release: `class Biolink extends Store` with `protected $table='biolinks'` fallback detecting if migration ran.
- Commerce engine `app/Storefront/` → `app/Stores/` sub-names: `Checkout`, `Earnings`, `Finance`, `WebhookHandler`. Immediate alias `class_alias(Store::class, Biolink::class)`.
- Morph map: `Relation::enforceMorphMap(['store'=>Store::class, 'biolink'=>Store::class])` to accept both `model_type` values during migration.
- Table rename deferred to Phase 3 behind feature flag `stores.table_rename_done`. Code uses `Store::getTable()` helper that returns `stores` if flag else `biolinks`.

## 4. Components — Files Touched

- **Routes:** `routes/api.php` `routes/web.php` `common/foundation/routes/api.php` — add `stores` resource + legacy aliases.
- **Models:** `app/Biolinks/Models/*` → `app/Stores/Models/*` (6 files), pivot renames, factory `BiolinkFactory.php`.
- **Controllers/Actions/Resources/Policies/Requests:** `app/Biolinks/Controllers/*` (6), `Actions/*` (6), `Resources/*` (5), `QueryBuilder`, `Policies/BiolinkPolicy.php`.
- **Migrations:** new `rename_biolinks_to_stores` + `rename_pivot_tables` + update `2026_07_29_000002_add_biolink_to_storefront_orders.php` FK.
- **Frontend:** `resources/client/dashboard/biolink/*` → `resources/client/dashboard/stores/*`, `resources/client/admin/biolinks-datatable-page/*`, `resources/client/dashboard/layout/sidenav/*`, `resources/client/gen/biolinks.ts` → `gen/stores.ts`, `dashboard-routes.tsx`, `main.tsx:26` bootstrap key, `biolinks-queries.ts` alias.
- **Config/defaults/docs:** `config/storefront.php→store.php` (keep alias), `resources/defaults/default-settings.php` menus/landing, `resources/defaults/permissions.php`, `database/migrations/*`, `common/` search normalization.
- **OpenAPI:** `resources/client/api.json` operationIds `listBiolinks→listStores`, schema `Biolink→Store`, regenerate via `orval.config.ts`. Keep `biolinks.ts` re-exporting `stores.ts` for 1 release.

## 5. Data Flow

- No change to `FallbackRouteController.php:100` short-URL resolver except lookup both `biolinks`/`stores` via `Linkeable` morph.
- Editor save: `PUT /stores/{store}` → `CrupdateStoreRequest` (alias `CrupdateBiolinkRequest`) → `CrupdateStore` action → `StoreResource` → invalidates `storesBaseKey` `biolinks-queries.ts:24`.
- Checkout: `POST /public/stores/{store}/digital-products/{product}/checkout` `common/foundation/routes/api.php:322` proxies to same handler as `biolinks` variant. `StorefrontWebhookHandler.php:15` logs `store_id`.
- Public page `resources/client/main.tsx:26` bootstrap `stores: Store[]` (alias `biolinks`).

## 6. Redirect & Compatibility Strategy

- Frontend old `dashboard/biolinks/*` → `308 /dashboard/stores/*` with `selectedStoreId` key (`use-selected-biolink-id.tsx:6` → `use-selected-store-id.tsx` alias).
- API old `/biolinks*` and `/biolink/*` → handler same controller, response adds `Deprecation: true` + `Sunset` header + structured log `store.api.deprecated` with `workspace_id`. Removed after N+1 release.
- DB: migration uses `Schema::rename()` and `DB::statement('ALTER TABLE ... RENAME INDEX')`. Seed migrates permissions `biolinks.create→stores.create` `resources/defaults/permissions.php:385` keeping old rows.
- Scout: `Biolink::searchableAs()='stores'` added, bulk reimport batched 500.

## 7. Storefront-First Cleanup (Scope Within This Spec)

- Change `menus` `Dashboard primary` `resources/defaults/default-settings.php:290` main entry `My Card /dashboard/biolinks→Stores /dashboard/stores`, `dashboard.homepage` default `biolinks→stores` `resources/defaults/default-settings.php:364`.
- Keep `dashboard-routes.tsx:42,78` hiding `links/folders/qr-codes/custom-domains/link-overlays/link-pages` for `routeType==='dashboard'`; no new hiding needed — already creator-minimal. Only ensure `stores`+`my-products`+`sales-payouts`+`pixels` `dashboard-routes.tsx:114,260` remain creator-visible.
- Landing `default-settings.php:47,128` copy `Link in bio→Storefront` badge scrub (3 sections). No pricing plan split needed.

## 8. Logging & Consistency

- Replace `biolink_id` log fields with `store_id` in `app/Storefront/StorefrontWebhookHandler.php:15`, `DigitalProductVisibility.php:17,22`, `ProductReviewsController.php:39`, `PayoutRequestService.php`, `OrderRecoveryService.php`. Use `Log::withContext(['store_id'=>$store->id,'workspace_id'=>...])`.
- Rename `UsageController.php` output `biolinks` key deprecated, emit `stores` only; keep `storefronts` alias for one release then drop.
- Normalize checkout errors: `StoreCheckout` throws `ValidationException` with `store_id` field, not `biolink_id`.

## 9. Error Handling

- Old slug accessed: 308 not 404.
- API old permission check maps `stores.create` falls back to `biolinks.create` if role not migrated yet.
- Migration failure rolls back via transaction; Scout import is idempotent.
- Fallback resolver returns 404 same as before for unknown hash.

## 10. Testing

- Unit: `ProductReviewTest.php`, `CreatorProfileTest.php` updated to `Store`.
- Feature: `EntitlementSystemTest.php` workspace store limits `config/store.php:max_storefronts`→`max_stores`.
- Frontend: `biolinks-page` → `stores-page` snapshot, `use-selected-store-id` hook.
- API contract: `orval` diff — `listStores`, `retrieveStore`. Postman verify `GET /biolinks` still 200 + deprecation header.
- Manual: create store `POST /stores`, attach product, checkout `POST /public/stores/1/digital-products/1/checkout`, verify redirect from `dashboard/biolinks/1`.

## 11. Rollout Phases (No Step Skipped)

- **Phase 1 (this release):** Frontend rename + API aliases + model aliases + menu/landing copy. Table stays `biolinks`. Feature flag `stores.aliases_enabled=true`.
- **Phase 2:** Migrate permissions/settings keys, update docs, deprecate duplicate `digital-products` vs `storefront/products` `common/foundation/routes/api.php:219` → keep `digital-products` canonical, alias `storefront` with deprecation.
- **Phase 3 (next release, after aliases stable):** Run table renames + Scout reindex, drop aliases behind `stores.table_rename_done`.

## 12. Alternatives Considered

- Single PR hard rename — rejected: blast radius across 80 PHP files, search, `biolink_link` FK constraints `database/migrations/2026_05_26_125108_*`, external tokens.
- Frontend-only — rejected: leaves `biolink_id` in `StorefrontOrder` and dual usage keys `UsageController.php`, doesn't satisfy backend consistency requirement.

## 13. Open Questions Resolved

- `store` vs `stores` vs `storefront`: use `stores` (REST plural) for collection, `Store` model singular; keep `storefront` only as deprecated config key alias.
- Compat window: 1 major release with dual routes + `Deprecation` header, then remove old.
