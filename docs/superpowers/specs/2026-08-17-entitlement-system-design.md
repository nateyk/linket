# Linket Entitlement System Design

Date: 2026-08-17
Status: Approved scope (awaiting spec review)

## Goal

Make plan values a real backend business-rule engine: admin-configured plan
entitlements control product limits, storefront limits, workspace limits,
storage enforcement, tracking-pixel capability, and platform commission —
with one authoritative configuration consumed by backend rules, pricing UI,
and usage UI. No plan-name conditionals, no duplicated limits, no fake
subscriptions for Free access.

## Current Architecture (audited)

- Plan = `Common\Billing\Models\Product` (products table). Commerce values in
  `storefront_benefits` JSON column; legacy restrictions via `permissionables`
  pivot (`$user->getRestrictionValue('key', 'count')`).
- Effective plan: `BaseUser::getSubscriptionProduct()` — first valid
  subscription's product, else `is_default` plan, else `free` plan. Free users
  have no subscription row.
- `Subscription::valid()` = active || trial || grace period. Chapa renewals are
  manual per-period (reminders, past_due, expired).
- Entitlement service: `app/Storefront/StorefrontBenefits.php` with a
  `config('storefront.default_benefits.free|pro')` tier fallback (the only
  runtime free/pro string logic).
- Enforcement today (config-driven, mostly correct): storefronts
  (`BiolinksController:72-80`), free/paid products + storage
  (`DigitalProductsController:88-129`), workspaces (`WorkspacePolicy` +
  `AppServiceProvider:91-96`), tracking pixels (`TrackingPixelsController:73`),
  usage meter (`UsageController`).
- Money: order-level fee snapshot already exists (`commission_bps`,
  `platform_fee_percent`, `platform_fee_cents`, `creator_earnings_cents`),
  credited via earnings ledger, pro-rated on refunds. Fee math uses floats.

## Design

### 1. Central Entitlements service

New `app/Entitlements/Entitlements.php` (bound in container; interface not
needed yet — single implementation).

```php
final class Entitlements
{
    public function planFor(User $creator): ?Product;          // effective plan
    public function limit(User $creator, string $key): ?int;   // null = unlimited
    public function enabled(User $creator, string $key): bool; // boolean capabilities
    public function feeBps(User $creator): int;                // canonical fee, basis points
    public function benefitsFor(Product $plan): array;         // normalized benefits array
}
```

- `benefitsFor()` normalizes `storefront_benefits` exactly like
  `StorefrontBenefits::normalize()` today (single source of the schema).
- `planFor()` delegates to `getSubscriptionProduct()` (default-plan resolution
  unchanged — it is already correct).
- `limit()` returns `null` for unlimited; never invents magic numbers.
- `StorefrontBenefits` is refactored to delegate to `Entitlements` and is kept
  as a thin facade only where call sites already use it, or call sites are
  updated to `Entitlements` directly (preferred). The tier-string fallback
  (`config('storefront.default_benefits.free|pro')`) is removed. Last-resort
  defaults live in `config/storefront.php` as a single `default_benefits` array
  (no free/pro keys) used only when a plan has no benefits AND no default plan
  exists — a boot-strap safety net, not a feature source.

### 2. Plan schema (canonical `storefront_benefits` keys)

| Key | Type | Unlimited = | Notes |
|---|---|---|---|
| `platform_fee_percent` | decimal | — | display; derived from bps |
| `commission_bps` | int | — | canonical for all fee math |
| `max_products` | int\|null | null | legacy alias, still normalized |
| `max_free_products` | int\|null | null | |
| `max_paid_products` | int\|null | null | |
| `max_upload_bytes` | int\|null | null | bytes |
| `max_storefronts` | int\|null | null | |
| `max_workspaces` | int\|null | null | |
| `tracking_pixels_enabled` | bool | — | |
| `advanced_analytics_enabled` | bool | — | stored only; NOT surfaced in UI or enforcement (no real functionality) |

Validation stays in `CrupdateProductRequest` (extend existing rules; keep
`max_products` legacy alias accepted).

### 3. Default plan + admin safety

- New migration: `products.active` boolean, default true.
- `CrupdateProduct`: when setting `is_default`, require `active` = true
  (reject 422 otherwise). Existing single-default exclusivity stays.
- `ProductsController::destroy`: reject deleting the default plan (422)
  until another active plan is marked default.
- Disabling (active=false) the current default plan is rejected the same way.
- All changes in a transaction.

### 4. Money safety

- `StorefrontCheckout`: fee computed in integer math:
  `$feeCents = (int) round($grossCents * $bps / 10000);`
  (bps from `Entitlements::feeBps()`). Both `commission_bps` and
  `platform_fee_percent` continue to be snapshotted on the order.
- `StorefrontBenefits`/`Entitlements` bps↔percent conversions use integer
  rounding rules, no float accumulation.
- Refunds continue to pro-rate the recorded order amounts (already correct).
- Historical orders never re-derived from current plan (already true).

### 5. Product limit re-check on update

`DigitalProductsController::update()` re-runs the free/paid limit check:
changing a product's price (free↔paid) must not push the workspace over its
configured free/paid counts. `store()` check unchanged. Enforcement message:
"You've reached your Free plan limit of :count paid products." (message reads
plan name + configured value dynamically).

### 6. Upload-time storage enforcement

`digitalProductFiles` uploads currently pass the per-file size cap (100MB) but
are only quota-checked at product attach. Add a quota check in the upload path
(`StoreFile`/`FileEntriesController` for upload_type `digitalProductFiles`):
compute workspace total (`SUM(file_size)` for workspace, excluding folders) +
incoming size vs `Entitlements::limit($creator, 'max_upload_bytes')`; reject
422 with "Uploading this file would exceed your :size storage allowance."
The attach-time check in `syncFiles` stays as a second guard (defense in
depth; both read the same entitlement).

### 7. Tracking pixel execution gate

Pixels execute only on the legacy redirect interstitial
(`resources/views/redirects/direct.blade.php`). Add an entitlement check at
render: if the pixel owner's plan does not enable `tracking_pixels_enabled`,
skip pixel injection. Creation-time 403 gate already exists. Config is never
deleted.

### 8. Advanced analytics

`advanced_analytics_enabled` remains stored in plan config for forward
compatibility but is removed from pricing/usage/plan UI. Basic insights stay
available to all creators (no gating — no distinct advanced functionality
exists to gate).

### 9. Admin plan form

Refactor `crupdate-plan-form.tsx` into sections:

- **General**: name, description, active switch, default plan switch,
  recommended, sort position, hidden (admin display), trial days.
- **Pricing**: monthly/annual prices (existing price editor), currency display.
- **Commerce**: platform fee % (number input, 0–100), free products
  (number + Unlimited toggle), paid products (number + Unlimited toggle),
  storage (number + GB unit select + Unlimited toggle; normalized to bytes).
- **Creator**: storefronts (number + Unlimited), workspaces (number +
  Unlimited).
- **Growth**: tracking pixels (switch). The `advanced_analytics_enabled` field
  is not rendered (no real functionality; stored only for forward compat).
- Legacy permission-feature editor (links/qr/folders/...) collapsed behind an
  "Advanced" disclosure, labeled deprecated.

Unlimited normalization: frontend sends `null`; backend stores `null`;
display renders "Unlimited".

### 10. Pricing page + usage UI

- `ProductResource` gains a computed `pricing_features` array (strings derived
  from `storefront_benefits`: "5 paid products", "1 GB storage", "Unlimited
  products") used by the pricing table alongside existing `feature_list`.
- Usage meter + usage dialog: unlimited values render "Unlimited" text, no
  progress bar. Upgrade CTA shown when a limit is hit (existing upgrade
  components reused).
- All values come from `/api/usage` (already plan-driven) — no new hardcoding.

### 11. Seeds / defaults

- `SeedDemoData` + `ResetDemoSite` updated to build plans from the same
  canonical benefit values (no literal drift).
- Seed Free ≈ 5% fee, 1 storefront, 1 workspace, 1GB, 5 free/5 paid, pixels
  off. Pro ≈ 0%, unlimited storefronts, 3 workspaces, 25GB, unlimited
  products, pixels on.
- `resources/defaults/permissions.php` Users-role legacy limits untouched
  (deprecated path, still consulted by legacy permission checks).

### 12. Downgrade policy (documented)

On subscription expiry: `getSubscriptionProduct()` falls back to default plan.
Nothing deleted. New over-limit resources rejected at enforcement points.
Existing products continue selling; orders/downloads remain valid; pixels stop
executing but remain stored; upgrade restores immediately (all checks are
live).

## Error handling

All limit violations return 422/403 with domain messages containing the
configured plan name and value (e.g. "You've reached your Free plan limit of 5
paid products."). Upgrade CTA data flows through existing
`useShouldShowUpgradeMessage` machinery.

## Testing

Extend `tests/Feature/EntitlementSystemTest.php` (PHPUnit, Laravel feature tests):

1. New creator resolves default Free entitlement without payment/subscription.
2. Exactly one default plan; changing default is transactional; disabling/
   deleting default rejected.
3. Paid active subscription overrides default; expiry falls back.
4. Limits enforced via HTTP (bypassing frontend): storefronts, workspaces,
   storage (upload reject), free/paid products (create + update re-check),
   pixels.
5. Config-driven: change Free paid limit 5→7 via admin; 7th allowed, 8th
   blocked. Storage 1GB→2GB enforced immediately. Commission 5%→4% on next
   sale; historical orders unchanged.
6. Money: integer fee math for decimal amounts; snapshot immutability;
   refund pro-rata; creator net.
7. Downgrade: over-limit Pro creator loses Pro; data intact; no new resources;
   upgrade recovers.

## Out of scope

- Auto-charge subscription renewals (Chapa has no API for it).
- Processor/gateway fee modeling (Chapa integration exposes none).
- Free-product checkout bypass (Chapa transaction still used for free
  products; not a limit concern).
- `advanced_analytics_enabled` enforcement (no real feature to gate).

## Risks

- Upload-time storage rejection is a behavior change for over-quota workspaces
  (intended, surfaced with clear message).
- `active` column default true keeps existing plans valid.
- Removing tier fallback: any plan without benefits falls back to default
  plan's benefits → then config safety net; verify demo seeds carry benefits.
