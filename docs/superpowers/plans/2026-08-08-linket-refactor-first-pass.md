# Linket Refactoring Plan — First Implementation Pass

## A. Current Architecture

The app has **two parallel systems** sharing the same Laravel/React codebase:

### Link Management (BeLink Legacy)
- **Core abstraction**: `Linkeable` abstract base (`app/Links/Models/Linkeable.php`) extended by `Link`, `Biolink`, `Folder`, `QrCode`
- **Morph map**: `'link'`, `'biolink'`, `'folder'`, `'qrCode'` registered in `AppServiceProvider::boot()`
- **Shared tables**: `tracked_events`, `linkeable_rules`, `link_tracking_pixel` all use `linkeable_type`/`linkeable_id` morph
- **Resolver**: `FallbackRouteController` resolves `/{backHalf}` URLs by checking Link→Biolink→Folder
- **Generator**: Each `Crupdate*` action generates `back_half` via `Str::random(5)`
- **Sub-models**: `LinkPage` and `LinkOverlay` are referenced by `Link.type_id` (not linkeables themselves)
- **Custom Domain**: `Link/Biolink/Folder/QrCode` all have `domain_id` FK

### Creator Commerce (New)
- **Core model**: `DigitalProduct` (extends `StorefrontModel`, NOT `Linkeable`)
- **Bridge**: `Biolink` ↔ `DigitalProduct` via `digital_product_biolinks` pivot + `StorefrontOrder.biolink_id`
- **Checkout**: `StorefrontCheckout` builds Chapa success URL from `$biolink->short_url`
- **Public pages**: Product pages served under `/{biolinkBackHalf}/products/{productId}` (resolved before `Route::fallback`)
- **Payments**: `PaymentTransaction` polymorphic `payable` → `StorefrontOrder` or `Subscription`
- **Payouts**: Full state machine (requested→processing→paid/rejected/cancelled), KYC-gated

### Two Entitlement Systems (NOT unified)
1. **BeLink restrictions**: DB `permissions` + `permissionables` pivot, plan-granted via `BaseUser::loadPermissions()`. Covers: links, qr_codes, folders, biolinks, custom_domains, link_overlays, tracking_pixels, custom_pages, webhooks, workspaces
2. **Storefront benefits**: `Product.storefront_benefits` JSON column + `config('storefront.default_benefits')` fallback. Covers: max_products, commission_bps, max_upload_bytes. Resolved by `StorefrontBenefits::forCreator()` using plan NAME matching (`str_contains('pro')`→pro, `str_contains('business')`→business, else→free)

### Seeded Plans (3 — need simplification to 2)
| Plan | Price | Position |
|------|-------|----------|
| Basic | $10/mo | 1 |
| Standard | $15/mo (recommended) | 2 |
| Pro | $20/mo | 3 |

**Problem**: "Basic" and "Standard" both resolve to `free` storefront benefits (only "Pro" matches the `pro` tier).

### Navigation (DB-Driven)
Sidebar is driven by `settings.menus` JSON, seeded from `resources/defaults/default-settings.php`:
- **dashboard-primary**: Short links, QR codes, Link in bio, Digital Products, Insights
- **dashboard-secondary** ("Resources"): Folders, Custom domains, CTA overlays, Tracking pixels, Link pages, Sales & Payouts
- **dashboard-mobile**: Links, Link in bio, QR codes, Insights
- **admin-sidebar**: Dashboard, Subscriptions, Users, Roles, Links, Biolinks, Folders, Branded domains, CTA overlays, Link pages, Tracking pixels, Custom pages, Files, Translations, Logs, Digital Products

### Tests (76 total, ALL commerce-focused)
No tests exist for any legacy BeLink feature (links, biolinks, qr, folders, subscriptions, analytics, workspaces, roles, settings). All tests cover the new commerce layer only.

---

## B. Dependency Map

### Short Links (`Link` model)
- **Morph dependencies**: `tracked_events`, `linkeable_rules`, `link_tracking_pixel`, `qr_codes` all reference `link` morph type
- **Bi link dependency**: `Biolink` has `belongsToMany Link` via `biolink_link` pivot — biolinks display links as content items
- **Folder dependency**: `Folder` has `hasMany Link` via `links.folder_id`
- **Commerce dependency**: NONE — products are not links, product pages don't use the Link model
- **Resolver reuse**: `FallbackRouteController` checks Link first, then Biolink, then Folder
- **Verdict**: Can DISABLE from UI. Keep model + resolver for Biolink resolution. Removing the model would break morph rows.

### QR Codes (`QrCode` model)
- **Morph dependencies**: In linkeable morph map; `qr_codes` table has `linkeable_id`/`linkeable_type` pointing to Link/Folder/Biolink
- **Commerce dependency**: NONE
- **Verdict**: Can DISABLE from UI. Keep model/table to avoid morph map breakage.

### Folders (`Folder` model)
- **Morph dependencies**: In linkeable morph map; has `hasMany Link`
- **Commerce dependency**: NONE
- **Verdict**: Can DISABLE from UI. Keep model/table.

### Custom Domains (`CustomDomain` model)
- **FK dependencies**: `links.domain_id`, `biolinks.domain_id`, `folders.domain_id`, `qr_codes.domain_id` all nullable FK to `custom_domains`
- **Commerce dependency**: NONE (products hosted under biolink URLs)
- **Verdict**: Can DISABLE from UI. Keep model/table (FK constraints would break if dropped).

### CTA Overlays (`LinkOverlay` model)
- **FK dependencies**: `links.type_id` references `link_overlays.id` when `links.type='overlay'`
- **Commerce dependency**: NONE
- **Verdict**: Can DISABLE from UI. Keep model/table.

### Link Pages (`LinkPage` model)
- **FK dependencies**: `links.type_id` references `link_pages.id` when `links.type='page'`
- **Commerce dependency**: NONE (products have own public product page controller)
- **Verdict**: Can DISABLE from UI. Keep model/table.

---

## C. Refactor Classification

| Feature | Classification | Reason |
|---------|----------------|--------|
| Workspaces | **KEEP** | Generic multi-tenant container, serves both systems |
| Auth/Fortify | **KEEP** | Core infrastructure |
| Users/Roles/Permissions | **KEEP** | Core infrastructure |
| Settings | **KEEP** | Core infrastructure |
| Files/Uploads | **KEEP** | Used by digital product uploads |
| Billing/Subscriptions | **ADAPT** | Simplify to Free/Pro only |
| Biolinks | **ADAPT** | Evolve into Creator Storefront (keep model, rebrand UX) |
| Analytics | **ADAPT** | Extend toward commerce metrics (link-click data still useful for storefront visits) |
| Tracking Pixels | **ADAPT** | Keep as PRO growth tool (currently only attached to linkeables) |
| Digital Products/Storefront | **KEEP** | Core product |
| Payments/Payouts | **KEEP** | Core product |
| KYC | **KEEP** | Gates payouts |
| Webhooks | **KEEP** | Infrastructure (but `clicked`/`scanned` events become dormant) |
| Short Link resolver | **INTERNALIZE** | Keep `FallbackRouteController` + `Linkeable` base for biolink resolution. Remove user-facing Short Links module. |
| Short URL generator | **INTERNALIZE** | `Str::random(5)` + `back_half` + `HasShortUrlAttribute` — keep for biolink URLs |
| Short Links UI | **DISABLE** | Remove from sidebar/routes, keep backend |
| QR Codes UI | **DISABLE** | Remove from sidebar/routes, keep backend |
| Folders UI | **DISABLE** | Remove from sidebar/routes, keep backend |
| Custom Domains UI | **DISABLE** | Remove from sidebar/routes, keep backend |
| CTA Overlays UI | **DISABLE** | Remove from sidebar/routes, keep backend |
| Link Pages UI | **DISABLE** | Remove from sidebar/routes, keep backend |
| Tags | **KEEP** | Could be useful for products in future |
| Custom Pages | **KEEP** | Used by admin for contact/privacy/terms |

---

## D. Proposed Creator Navigation

### Current → Proposed

**CURRENT (dashboard-primary):**
1. Short links
2. QR codes
3. Link in bio
4. Digital Products
5. Insights

**CURRENT (dashboard-secondary "Resources"):**
6. Folders
7. Custom domains
8. CTA overlays
9. Tracking pixels
10. Link pages
11. Sales & Payouts

**PROPOSED:**

**Main:**
1. Home (Dashboard)
2. Storefront (was "Link in bio")
3. Digital Products
4. Sales & Payouts

**Grow:**
5. Insights
6. Tracking Pixels

**Account:**
7. Workspace
8. Settings
9. Billing

**Current mobile:**
- Links, Link in bio, QR codes, Insights

**Proposed mobile:**
- Home, Storefront, Digital Products, Sales & Payouts

### Admin Sidebar Changes

**Remove from admin sidebar:** Links, Biolinks (keep), Folders, Branded domains, CTA overlays, Link pages, Tracking pixels (move to admin-only if needed)

**Add/strengthen on admin sidebar:** Digital Products, Orders/Payments, Payouts/Withdrawals, KYC Verifications, Payment Activity

---

## E. Reusable Infrastructure

| BeLink Infrastructure | Reuse for Linket |
|----------------------|------------------|
| `Linkeable` abstract + `FallbackRouteController` | Biolink URL resolution (already used by commerce checkout URLs) |
| `HasShortUrlAttribute` trait | Biolink `short_url` computation (already used by `StorefrontCheckout`) |
| `Str::random(5)` back-half generator | Could be used for automatic product sell URLs in future |
| `Workspace` + `BelongsToWorkspace` + `ActiveWorkspace` | Already used by commerce (DigitalProduct, PayoutRequest) |
| `BasePolicy` + `WorkspacedResourcePolicy` | Could be extended to commerce resources (currently bypassed) |
| `BaseUser::loadPermissions()` + `getRestrictionValue()` | Could be extended with commerce permissions |
| `TrackedEvent` morph system | Could be extended to track product views/checkout events (needs morph map addition) |
| `TrackingPixel` + `link_tracking_pixel` morph | Could be extended to attach pixels to DigitalProduct (needs morph map addition) |
| `Billing/Subscription` engine | Reuse for Free/Pro plans (already works, just needs plan simplification) |
| `FileEntry` + upload system | Already used for digital product files |
| `Webhook` system | Infrastructure stays; `clicked`/`scanned` events become dormant |

---

## F. Risk Areas

1. **Morph map integrity** — Removing any of `{link, biolink, folder, qrCode}` from `Relation::morphMap()` or deleting their models breaks every row in `tracked_events`, `linkeable_rules`, `link_tracking_pixel`, `qr_codes` that references that type. **Mitigation**: Keep all models and morph map entries. Only remove UI, not backend.

2. **Biolink → Commerce bridge** — `StorefrontCheckout` builds Chapa return URLs from `$biolink->short_url`. `PublicDigitalProducts::findBiolink` uses `Biolink::findForRendering()`. The biolink short URL resolver MUST keep working. **Mitigation**: Keep `Linkeable`, `FallbackRouteController`, `HasShortUrlAttribute`, and `Biolink` model intact.

3. **Stored menu JSON** — Existing installations have menus stored in `settings.menus` JSON. Simply changing `default-settings.php` won't update active installations. **Mitigation**: Create a migration that updates the stored JSON.

4. **Route fallback ordering** — `routes/web.php` has explicit `/{biolink}/products/{digitalProduct}` routes before `Route::fallback`. Removing link routes from `dashboard-routes.tsx` does NOT affect the public route resolver. **Mitigation**: No public route changes in first pass.

5. **Plan name mismatch** — `StorefrontBenefits::forCreator()` does `str_contains` matching on plan names. If we rename plans to "Free"/"Pro", the resolver needs updating. **Mitigation**: Update `StorefrontBenefits` resolver alongside plan seeding.

6. **Admin access to link features** — Some admins may need legacy link management. **Mitigation**: Keep routes in `sharedDashboardRoutes('admin')` scope so admins can still access if needed via direct URL. Just remove from creator sidebar.

7. **Existing data** — Users may have existing links, QR codes, folders. **Mitigation**: Staged deprecation — DISABLE from UI, don't DELETE. Data persists.

---

## Implementation Plan (First Pass)

### Step 1: Update Default Menu Settings
**File**: `resources/defaults/default-settings.php` (lines 280-394)

Remove link-management items from `dashboard-primary`, `dashboard-secondary`, `dashboard-mobile`, and restructure:

**dashboard-primary** (Main group):
- Home → `/dashboard`
- Storefront → `/dashboard/biolinks` (relabel "Link in bio" → "Storefront")
- Digital Products → `/dashboard/my-products`
- Sales & Payouts → `/dashboard/sales-payouts` (move from secondary to primary)

**dashboard-secondary** (Grow group, relabel "Resources" → "Grow"):
- Insights → `/dashboard/insights`
- Tracking Pixels → `/dashboard/pixels`

**dashboard-mobile**:
- Home, Storefront, Digital Products, Sales & Payouts

**admin-sidebar**: Remove Links, Folders, Branded domains, CTA overlays, Link pages, Tracking pixels. Keep Digital Products, add KYC Verifications, Payment Activity, Withdrawals if not already present.

### Step 2: Create Migration to Update Stored Menus
**New file**: `database/migrations/2026_08_08_000001_refactor_dashboard_menus_for_linket.php`

This migration reads the `settings.menus` JSON, removes link-management items (by action path matching `/dashboard/links`, `/dashboard/qr-codes`, `/dashboard/folders`, `/dashboard/custom-domains`, `/dashboard/link-overlays`, `/dashboard/link-pages`), moves `/dashboard/sales-payouts` from secondary to primary, relabels "Link in bio" → "Storefront", and updates admin sidebar similarly.

### Step 3: Update Sidebar Icons
**File**: `resources/client/dashboard/layout/sidenav/dashboard-sidebar-icons.tsx`

- Remove/keep icons (they're just a map, unused entries are harmless)
- Add icon for `/dashboard` (Home) if missing
- The "Storefront" label will use the existing `biolinks` icon (`LayoutPanelTopIcon`) or change to `StoreIcon`

### Step 4: Update Sidebar Component
**File**: `resources/client/dashboard/layout/sidenav/app-dashboard-sidebar.tsx`

- The fallback injection for Digital Products (lines 42-53) can stay as safety net
- The "Resources" label for dashboard-secondary should change to "Grow" (or whatever new label)
- No structural changes needed — the component already renders from config

### Step 5: Remove Link Routes from Creator Dashboard
**File**: `resources/client/dashboard/dashboard-routes.tsx`

Remove or gate behind admin-only the following route entries from `sharedDashboardRoutes`:
- `links` and all children (lines 38-68)
- `qr-codes` and all children (lines 70-100)
- `folders` and all children (lines 132-214)
- `custom-domains` and all children (lines 216-229)
- `link-overlays` and all children (lines 246-270)
- `link-pages` and all children (lines 272-293)

Keep:
- `biolinks/:biolinkId` editor (lines 102-130) — still needed for storefront editing
- `pixels` (lines 231-244) — tracking pixels stay

**Approach**: Comment out or wrap in an admin-only conditional. For first pass, simplest is to remove them from the `sharedDashboardRoutes` function when `routeType === 'dashboard'` but keep them for `routeType === 'admin'`.

### Step 6: Update Mobile Bottom Navbar
**File**: `resources/client/dashboard/layout/mobile-bottom-navbar.tsx`

This reads from `dashboard-mobile` menu config — already updated in Step 1 via the settings change + migration. No code change needed beyond the config.

### Step 7: Relabel "Link in bio" → "Storefront"
**File**: `resources/defaults/default-settings.php`

Change the menu label from "Link in bio" to "Storefront" in all menu positions (primary, mobile).

Also update the sidebar icon fallback in `dashboard-sidebar-icons.tsx` if needed (currently `biolinks: LayoutPanelTopIcon` — could change to `StoreIcon` but not required).

### Step 8: Simplify Plans to Free/Pro
**File**: `app/Demo/Console/SeedDemoData.php`

Update `generateBasicPlan/StandardPlan/ProPlan` calls (lines 71-74) to create only 2 plans:

**Free** (position 1, free=true, recommended=false):
- Monthly: $0
- `storefront_benefits`: `{max_products: 5, max_free_products: 5, max_paid_products: 5, commission_bps: 500, max_upload_bytes: 1073741824}` (1GB)
- Permissions: `biolinks.create` count=1, `tracking_pixels.create` count=0 (disabled), `workspaces.create` count=1

**Pro** (position 2, free=false, recommended=true):
- Monthly: $9.99
- `storefront_benefits`: `{max_products: null, max_free_products: null, max_paid_products: null, commission_bps: 0, max_upload_bytes: 26843545600}` (25GB)
- Permissions: `biolinks.create` count=unlimited, `tracking_pixels.create` count=unlimited, `workspaces.create` count=3

### Step 9: Update StorefrontBenefits Resolver
**File**: `app/Storefront/StorefrontBenefits.php`

Change the tier resolution from `str_contains('business'/'pro'/'free')` to:
1. Check `Product.storefront_benefits` JSON first (if `commission_bps` is set, use it directly)
2. If no benefits JSON, check `Product.free` flag → free tier, else pro tier
3. Fall back to `config('storefront.default_benefits.free')` or `config('storefront.default_benefits.pro')`

### Step 10: Update config/storefront.php Benefits
**File**: `config/storefront.php`

Update `default_benefits` to match the new 2-tier system:
```php
'default_benefits' => [
    'free' => [
        'max_products' => 5,
        'commission_bps' => 500,  // 5% Linket transaction fee
        'max_upload_bytes' => 1073741824,  // 1 GB
    ],
    'pro' => [
        'max_products' => null,  // unlimited
        'commission_bps' => 0,  // 0% Linket transaction fee
        'max_upload_bytes' => 26843545600,  // 25 GB
    ],
],
```

Remove the `business` tier.

### Step 11: Update Usage Dialog Labels
**File**: `resources/client/dashboard/layout/sidenav/usage-dialog.tsx`

Remove link-management meters (`links`, `qr_codes`, `folders`, `custom_domains`, `link_overlays`) and add commerce-relevant ones (`digital_products`, `biolinks`, `storage`). The `tracked_events` meter can stay as it's still relevant for storefront views.

### Step 12: Create Migration to Update Existing Plans
**New file**: `database/migrations/2026_08_08_000002_simplify_plans_to_free_pro.php`

This migration:
1. Finds existing "Basic" plan → rename to "Free", set price to $0, set `free=true`, update `storefront_benefits`
2. Finds existing "Standard" plan → merge into Pro or delete
3. Finds existing "Pro" plan → update price to $9.99, update `storefront_benefits`, set `recommended=true`
4. Updates permissions on the Free/Pro plans

### Step 13: Run Tests and Build
```bash
php artisan test --compact
npm run build
```

### Step 14: Commit
Stage all changes and commit.

---

## Critical Files to Modify

| File | Change |
|------|--------|
| `resources/defaults/default-settings.php` | Remove link items from menus, relabel "Link in bio" → "Storefront", restructure groups |
| `resources/client/dashboard/dashboard-routes.tsx` | Remove link-management routes from `sharedDashboardRoutes` for `dashboard` routeType |
| `resources/client/dashboard/layout/sidenav/dashboard-sidebar-icons.tsx` | Keep existing icons, no removal needed |
| `app/Demo/Console/SeedDemoData.php` | Simplify to 2 plans (Free/Pro) |
| `app/Storefront/StorefrontBenefits.php` | Update tier resolution to use `Product.free` flag instead of name matching |
| `config/storefront.php` | Update `default_benefits` to 2-tier |
| `resources/client/dashboard/layout/sidenav/usage-dialog.tsx` | Remove link meters, add commerce meters |
| `database/migrations/2026_08_08_000001_refactor_dashboard_menus_for_linket.php` | NEW: update stored menu JSON |
| `database/migrations/2026_08_08_000002_simplify_plans_to_free_pro.php` | NEW: update existing plan records |

## Verification

1. **Run tests**: `php artisan test --compact` — all 76 tests should still pass (no backend logic changes, only menu/plan config)
2. **Build**: `npm run build` — TypeScript should compile (route removals may cause unused import warnings, but no errors)
3. **Visual check**: Load `/dashboard` — sidebar should show: Home, Storefront, Digital Products, Sales & Payouts (main); Insights, Tracking Pixels (grow). No Short Links, QR Codes, Folders, Custom Domains, CTA Overlays, or Link Pages visible.
4. **Storefront editor**: Navigate to `/dashboard/biolinks` — should still work (biolink editor routes kept)
5. **Public pages**: Visit a biolink public URL and a product page — should still resolve correctly
6. **Billing page**: Visit `/account-settings/billing` — should show Free and Pro plans
7. **Admin sidebar**: Admin should see commerce-focused items, not link-management ones
8. **Existing data**: Links/biolinks/QR codes created before the refactor should still exist in the database and be accessible via direct URL (not deleted)