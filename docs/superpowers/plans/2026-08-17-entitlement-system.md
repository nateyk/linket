# Linket Entitlement System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make plan values a real backend business-rule engine: admin-configured plan entitlements (platform fee %, product limits, storage bytes, storefronts, workspaces, tracking pixels) enforced in the backend, with one authoritative `Entitlements` service consumed by enforcement, pricing UI, and usage UI.

**Architecture:** A central `App\Entitlements\Entitlements` service resolves the effective plan (`BaseUser::getSubscriptionProduct()` — already correct) and normalizes `storefront_benefits` (null = unlimited) as the single source of truth. All enforcement call sites (digital products, biolinks, workspaces, pixels, checkout, uploads, redirect render) read from it; the legacy tier-string fallback (`config('storefront.default_benefits.free|pro')`) is removed; a flat config safety net is kept. Money math moves to integer basis points.

**Tech Stack:** Laravel 12 (PHP 8.x, PHPUnit 11 feature tests via `ddev exec php artisan test`), MySQL (ddev), React 19 + TypeScript + Vite + shadcn form components (`@shadcn/forms/...`), Orval-generated API types (`resources/client/gen/`).

**Spec:** `docs/superpowers/specs/2026-08-17-entitlement-system-design.md` — approved by the user; this plan implements it section by section.

## Global Constraints

- **Null = unlimited.** Every `max_*` benefit is `int|null`; `null` means unlimited. Never invent magic numbers (no 999999).
- **No plan-name/tier conditionals.** No `free`/`pro` string comparisons at runtime. Plan name appears only inside user-facing limit messages.
- **Fee math is integer basis points**: `$feeCents = (int) round($grossCents * $bps / 10000);` — `commission_bps` is canonical; `platform_fee_percent` is a display snapshot only.
- **`advanced_analytics_enabled`** stays in stored plan config but is NEVER rendered in UI and NEVER enforced.
- **Fee snapshots** stay per-order; historical orders are never re-derived from the current plan.
- **Default plan safety**: exactly one `is_default` plan; the default plan cannot be disabled (`active=false`) or deleted.
- **Messages** contain the configured plan name and value, e.g. "You've reached your Free plan limit of 5 paid products."
- **Downgrade policy**: on expiry `getSubscriptionProduct()` falls back to the default plan. Nothing is deleted; over-limit creates are rejected; existing products keep selling; pixels keep storing but stop executing; upgrade restores immediately.
- All PHP changes must keep `ddev exec php artisan test --filter=EntitlementSystemTest` green (the file also covers legacy behavior). Frontend changes must pass `npm run build` and `npm run lint` (oxlint).
- No code comments unless matching existing file style.

## File Map

**Backend (app + common/foundation):**
- Create `app/Entitlements/Entitlements.php` — central service (planFor/limit/enabled/feeBps/benefitsFor/formatBytes/normalize).
- Create `app/Entitlements/AssertDigitalProductUploadAllowed.php` — upload-time storage quota action.
- Modify `app/Storefront/StorefrontBenefits.php` — becomes a thin facade delegating to `Entitlements`.
- Modify `app/Storefront/Controllers/DigitalProductsController.php` — use `Entitlements`, plan-named messages, update() limit re-check.
- Modify `app/Storefront/StorefrontCheckout.php` — integer bps fee math.
- Modify `app/Biolinks/Controllers/BiolinksController.php` — storefront limit via `Entitlements` + plan name.
- Modify `app/TrackingPixels/Controllers/TrackingPixelsController.php` — pixel gate via `Entitlements::enabled`.
- Modify `app/Providers/AppServiceProvider.php` — workspace creation listener via `Entitlements`.
- Modify `app/Links/Controllers/FallbackRouteController.php` — compute `pixelsEnabled` for the redirect interstitial.
- Modify `resources/views/redirects/direct.blade.php` — gate pixel injection on `$pixelsEnabled`.
- Modify `config/storefront.php` — flat `default_benefits` safety net + `demo_benefits` for seeds.
- Modify `common/foundation/src/Billing/Products/CrupdateProduct.php` — transactional, `active`, default-plan safety.
- Modify `common/foundation/src/Billing/Products/ProductsController.php` — reject deleting default plan.
- Modify `common/foundation/src/Billing/Models/Product.php` — add `active` cast.
- Create `database/migrations/2026_08_17_000001_add_active_to_products.php`.
- Modify `common/foundation/src/Billing/Products/ProductResource.php` — add computed `pricing_features`.
- Modify `common/foundation/src/Files/Controllers/FileEntriesController.php` + `common/foundation/src/Files/Tus/TusFileEntryController.php` — upload quota hook.
- Modify `app/Demo/Console/SeedDemoData.php` — canonical seed benefits from config, ETB prices.
- Modify `tests/Feature/EntitlementSystemTest.php` — new tests + setUp fix.

**Frontend:**
- Modify `common/foundation/resources/client/admin/plans/crupdate-plan-page/crupdate-plan-form.tsx` — sectioned form (General/Pricing/Commerce/Creator/Growth/Advanced) with Unlimited toggles.
- Modify `common/foundation/resources/client/admin/plans/crupdate-plan-page/edit-plan-page.tsx` + `create-plan-page.tsx` — new defaultValues (`active`, `is_default`, `storefront_benefits`).
- Modify `resources/client/dashboard/layout/sidenav/usage-dialog.tsx` — commerce usage entries + "Unlimited" rendering.
- Modify `common/foundation/resources/client/billing/pricing-table/product-feature-list.tsx` — render `pricing_features`.
- Regenerate `resources/client/gen/` (Scramble + Orval) after `ProductResource`/`CrupdateProductRequest` changes.

---

### Task 1: Central Entitlements service

**Files:**
- Create: `app/Entitlements/Entitlements.php`
- Modify: `config/storefront.php` (add flat `default_benefits` + `demo_benefits`; keep legacy `free`/`pro` keys until Task 2)
- Test: `tests/Feature/EntitlementSystemTest.php`

**Interfaces:**
- Produces: `Entitlements::planFor(User $creator): ?Product`, `Entitlements::benefitsFor(Product $plan): array`, `Entitlements::limit(User $creator, string $key): ?int`, `Entitlements::enabled(User $creator, string $key): bool`, `Entitlements::feeBps(User $creator): int`, `Entitlements::normalize(array $raw): array` (public static), `Entitlements::formatBytes(int $bytes): string` (public static). Later tasks consume these exact signatures.

- [ ] **Step 1: Write the failing tests**

Add to `tests/Feature/EntitlementSystemTest.php` (after the existing `testIsDefaultPlanResolvesWithoutSubscription` method; keep existing imports):

```php
public function testEntitlementsServiceResolvesPlanLimitsAndFees(): void
{
    $creator = $this->createCreator();
    $entitlements = app(\App\Entitlements\Entitlements::class);

    $plan = $entitlements->planFor($creator);
    $this->assertNotNull($plan);
    $this->assertTrue($plan->is_default || $plan->free);

    $this->assertIsInt($entitlements->limit($creator, 'max_free_products'));
    $this->assertSame(
        (int) config('storefront.default_benefits.commission_bps'),
        $entitlements->feeBps($creator),
    );
    $this->assertIsBool($entitlements->enabled($creator, 'tracking_pixels_enabled'));
    $this->assertSame(
        (int) config('storefront.default_benefits.max_upload_bytes'),
        $entitlements->limit($creator, 'max_upload_bytes'),
    );
}

public function testPlanWithoutBenefitsFallsBackToDefaultPlanBenefits(): void
{
    $creator = $this->createCreator();
    $defaultPlan = $creator->getSubscriptionProduct();
    $noBenefitsPlan = \Common\Billing\Models\Product::create([
        'name' => 'No Benefits',
        'uuid' => Str::uuid(),
        'free' => false,
        'position' => 99,
        'storefront_benefits' => [],
    ]);

    $benefits = app(\App\Entitlements\Entitlements::class)->benefitsFor($noBenefitsPlan);

    $this->assertSame(
        (int) $defaultPlan->storefront_benefits['commission_bps'],
        $benefits['commission_bps'],
    );
}

public function testFormatBytes(): void
{
    $this->assertSame('1 GB', \App\Entitlements\Entitlements::formatBytes(1073741824));
    $this->assertSame('25 GB', \App\Entitlements\Entitlements::formatBytes(26843545600));
    $this->assertSame('5 MB', \App\Entitlements\Entitlements::formatBytes(5242880));
    $this->assertSame('1.5 GB', \App\Entitlements\Entitlements::formatBytes(1610612736));
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `ddev exec php artisan test --filter=EntitlementSystemTest`
Expected: FAIL — `Class "App\Entitlements\Entitlements" not found`.

- [ ] **Step 3: Create the service**

Create `app/Entitlements/Entitlements.php`:

```php
<?php

namespace App\Entitlements;

use App\Models\User;
use Common\Billing\Models\Product;

final class Entitlements
{
    public function planFor(User $creator): ?Product
    {
        return $creator->getSubscriptionProduct();
    }

    public function benefitsFor(Product $plan): array
    {
        $configured = $plan->storefront_benefits;
        if (is_string($configured)) {
            $configured = json_decode($configured, true);
        }
        if (is_array($configured) && !empty($configured)) {
            return self::normalize($configured);
        }

        $defaultPlan = Product::where('is_default', true)
            ->where('id', '!=', $plan->id)
            ->first();
        if ($defaultPlan) {
            $defaultBenefits = $defaultPlan->storefront_benefits;
            if (is_string($defaultBenefits)) {
                $defaultBenefits = json_decode($defaultBenefits, true);
            }
            if (is_array($defaultBenefits) && !empty($defaultBenefits)) {
                return self::normalize($defaultBenefits);
            }
        }

        return self::normalize(config('storefront.default_benefits', []));
    }

    public function limit(User $creator, string $key): ?int
    {
        $plan = $this->planFor($creator);
        $benefits = $plan
            ? $this->benefitsFor($plan)
            : self::normalize(config('storefront.default_benefits', []));

        return $benefits[$key] ?? null;
    }

    public function enabled(User $creator, string $key): bool
    {
        $plan = $this->planFor($creator);
        $benefits = $plan
            ? $this->benefitsFor($plan)
            : self::normalize(config('storefront.default_benefits', []));

        return (bool) ($benefits[$key] ?? false);
    }

    public function feeBps(User $creator): int
    {
        $plan = $this->planFor($creator);
        $benefits = $plan
            ? $this->benefitsFor($plan)
            : self::normalize(config('storefront.default_benefits', []));

        return (int) ($benefits['commission_bps'] ?? 0);
    }

    public static function formatBytes(int $bytes): string
    {
        $gb = 1073741824;
        $mb = 1048576;

        return $bytes >= $gb
            ? rtrim(rtrim(number_format($bytes / $gb, 1), '0'), '.') . ' GB'
            : rtrim(rtrim(number_format($bytes / $mb, 1), '0'), '.') . ' MB';
    }

    public static function normalize(array $raw): array
    {
        $commissionBps = $raw['commission_bps'] ?? (int) round(($raw['platform_fee_percent'] ?? 0) * 100);

        return [
            'platform_fee_percent' => (float) ($raw['platform_fee_percent'] ?? round($commissionBps / 100, 4)),
            'commission_bps' => (int) $commissionBps,
            'max_products' => $raw['max_products'] ?? null,
            'max_free_products' => $raw['max_free_products'] ?? $raw['max_products'] ?? null,
            'max_paid_products' => $raw['max_paid_products'] ?? $raw['max_products'] ?? null,
            'max_upload_bytes' => $raw['max_upload_bytes'] ?? null,
            'max_storefronts' => $raw['max_storefronts'] ?? null,
            'max_workspaces' => $raw['max_workspaces'] ?? null,
            'tracking_pixels_enabled' => (bool) ($raw['tracking_pixels_enabled'] ?? false),
            'advanced_analytics_enabled' => (bool) ($raw['advanced_analytics_enabled'] ?? false),
        ];
    }
}
```

- [ ] **Step 4: Add the flat config keys**

Edit `config/storefront.php`. Replace the `'default_benefits' => [...]` block at the bottom with:

```php
    'default_benefits' => [
        'platform_fee_percent' => 5.0,
        'commission_bps' => 500,
        'max_products' => 5,
        'max_free_products' => 5,
        'max_paid_products' => 5,
        'max_upload_bytes' => 1073741824,
        'max_storefronts' => 1,
        'max_workspaces' => 1,
        'tracking_pixels_enabled' => false,
        'advanced_analytics_enabled' => false,
    ],
    'demo_benefits' => [
        'free' => [
            'platform_fee_percent' => 5.0,
            'commission_bps' => 500,
            'max_products' => 5,
            'max_free_products' => 5,
            'max_paid_products' => 5,
            'max_upload_bytes' => 1073741824,
            'max_storefronts' => 1,
            'max_workspaces' => 1,
            'tracking_pixels_enabled' => false,
            'advanced_analytics_enabled' => false,
        ],
        'pro' => [
            'platform_fee_percent' => 0.0,
            'commission_bps' => 0,
            'max_products' => null,
            'max_free_products' => null,
            'max_paid_products' => null,
            'max_upload_bytes' => 26843545600,
            'max_storefronts' => null,
            'max_workspaces' => 3,
            'tracking_pixels_enabled' => true,
            'advanced_analytics_enabled' => true,
        ],
    ],
```

Note: `default_benefits` (flat) and `demo_benefits.free` currently duplicate each other — that is intentional and temporary; Task 2 removes the legacy free/pro tier fallback from code, Task 12 makes `demo_benefits` the single literal home for seed values. Do NOT remove the legacy keys in this task.

- [ ] **Step 5: Run the full test file**

Run: `ddev exec php artisan test --filter=EntitlementSystemTest`
Expected: PASS (all previous tests + 3 new ones).

- [ ] **Step 6: Commit**

```bash
git add app/Entitlements/Entitlements.php config/storefront.php tests/Feature/EntitlementSystemTest.php
git commit -m "feat: add central entitlements service with config safety net"
```

---

### Task 2: StorefrontBenefits facade + call-site updates

**Files:**
- Modify: `app/Storefront/StorefrontBenefits.php` (whole file)
- Modify: `app/Biolinks/Controllers/BiolinksController.php` (store method)
- Modify: `app/TrackingPixels/Controllers/TrackingPixelsController.php` (store method)
- Modify: `app/Providers/AppServiceProvider.php` (workspace creating listener)
- Modify: `tests/Feature/EntitlementSystemTest.php` (setUp fix)

**Interfaces:**
- Consumes: `Entitlements::planFor/limit/enabled/benefitsFor/normalize` (Task 1).
- Produces: `StorefrontBenefits::forCreator(User $creator): array` — same signature as today (used by `UsageController` and the old tests); `Entitlements` used directly at all other call sites.

- [ ] **Step 1: Write the failing test first — update setUp for flat config**

Edit `tests/Feature/EntitlementSystemTest.php`. In `setUp()`, the line that creates the Free plan uses `config('storefront.default_benefits.free')` — change it to:

```php
'storefront_benefits' => config('storefront.default_benefits'),
```

Then run: `ddev exec php artisan test --filter=EntitlementSystemTest`
Expected: still PASS (config `default_benefits.free` still exists at this point; this step is a no-op until Step 3 removes the legacy keys).

- [ ] **Step 2: Refactor StorefrontBenefits to a thin facade**

Replace the entire contents of `app/Storefront/StorefrontBenefits.php` with:

```php
<?php

namespace App\Storefront;

use App\Entitlements\Entitlements;
use App\Models\User;

class StorefrontBenefits
{
    public function forCreator(User $creator): array
    {
        $plan = $creator->getSubscriptionProduct();

        return $plan
            ? app(Entitlements::class)->benefitsFor($plan)
            : Entitlements::normalize(config('storefront.default_benefits', []));
    }
}
```

- [ ] **Step 3: Remove the legacy tier keys from config**

Edit `config/storefront.php`: delete the `'default_benefits' => ['free' => [...], 'pro' => [...]]` legacy block entirely (the flat `default_benefits` + `demo_benefits` added in Task 1 remain). Keep only the flat array and `demo_benefits`.

Run: `ddev exec php artisan test --filter=EntitlementSystemTest`
Expected: PASS — nothing else references `default_benefits.free`/`default_benefits.pro` anymore.

- [ ] **Step 4: Update BiolinksController::store**

In `app/Biolinks/Controllers/BiolinksController.php`, replace the `store()` method's benefit block (currently `$benefits = app(StorefrontBenefits::class)->forCreator($request->user()); $maxStorefronts = $benefits['max_storefronts'] ?? null; if ($maxStorefronts !== null) { ... }`) with:

```php
$entitlements = app(Entitlements::class);
$creator = $request->user();
$maxStorefronts = $entitlements->limit($creator, 'max_storefronts');
if ($maxStorefronts !== null) {
    $count = Biolink::query()
        ->where('workspace_id', ActiveWorkspace::get()->id)
        ->whereNull('deleted_at')
        ->count();
    abort_if($count >= $maxStorefronts, 422, __(
        "You've reached your :plan limit of :count storefronts.",
        ['plan' => $entitlements->planFor($creator)?->name ?? 'plan', 'count' => $maxStorefronts],
    ));
}
```

Add imports at the top of the file:

```php
use App\Entitlements\Entitlements;
```

(Remove the now-unused `use App\Storefront\StorefrontBenefits;` import if no other method references it — check with grep; `UsageController` still uses it but that's a different file.)

- [ ] **Step 5: Update TrackingPixelsController::store**

In `app/TrackingPixels/Controllers/TrackingPixelsController.php`, replace:

```php
$benefits = app(StorefrontBenefits::class)->forCreator($request->user());
abort_if(!$benefits['tracking_pixels_enabled'], 403, __('Tracking Pixels are available on Pro.'));
```

with:

```php
$entitlements = app(Entitlements::class);
abort_if(
    !$entitlements->enabled($request->user(), 'tracking_pixels_enabled'),
    403,
    __('Tracking Pixels are not included in your current plan.'),
);
```

Add `use App\Entitlements\Entitlements;` and drop the `StorefrontBenefits` import if unused.

- [ ] **Step 6: Update AppServiceProvider workspace listener**

In `app/Providers/AppServiceProvider.php`, replace the `Workspace::creating(...)` closure body (currently uses `$benefits = app(StorefrontBenefits::class)->forCreator($owner); $limit = $benefits['max_workspaces'] ?? null;` and the message with `:limit`) with:

```php
Workspace::creating(function (Workspace $workspace): void {
    if ($workspace->is_personal) {
        return;
    }
    $owner = User::find($workspace->owner_id);
    if (!$owner) {
        return;
    }
    $entitlements = app(Entitlements::class);
    $limit = $entitlements->limit($owner, 'max_workspaces');
    if ($limit === null) {
        return;
    }
    $count = Workspace::where('owner_id', $owner->id)->where('is_personal', false)->count();
    abort_if($count >= $limit, 422, __(
        "You've reached your :plan limit of :count workspaces.",
        ['plan' => $entitlements->planFor($owner)?->name ?? 'plan', 'count' => $limit],
    ));
});
```

Add `use App\Entitlements\Entitlements;` to the file's imports and remove the `StorefrontBenefits` import if it becomes unused.

- [ ] **Step 7: Run the full test file**

Run: `ddev exec php artisan test --filter=EntitlementSystemTest`
Expected: PASS — `testStorefrontLimitEnforcedOnBiolinkCreationViaHttp`, `testTrackingPixelsBlockedWhenDisabled`, `testUsageApiReturnsCommerceMetrics` (UsageController still uses the `StorefrontBenefits` facade) all still green.

- [ ] **Step 8: Commit**

```bash
git add app/Storefront/StorefrontBenefits.php app/Biolinks/Controllers/BiolinksController.php app/TrackingPixels/Controllers/TrackingPixelsController.php app/Providers/AppServiceProvider.php config/storefront.php tests/Feature/EntitlementSystemTest.php
git commit -m "refactor: remove tier fallback, delegate entitlements to central service"
```

---

### Task 3: Integer basis-point fee math in checkout

**Files:**
- Modify: `app/Storefront/StorefrontCheckout.php` (create method, ~lines 14-25)
- Test: `tests/Feature/EntitlementSystemTest.php`

**Interfaces:**
- Consumes: `Entitlements::feeBps(User $creator): int` (Task 1).
- Produces: unchanged order columns — `commission_bps` (int), `platform_fee_percent` (float display snapshot = bps/100), `platform_fee_cents` (int), `creator_earnings_cents` (int).

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/EntitlementSystemTest.php` (after `testPlatformFeePercentSnapshotOnOrder`):

```php
public function testFeeMathUsesIntegerBasisPoints(): void
{
    $creator = $this->createCreator();
    $workspace = $creator->workspaces()->first();

    $plan = $creator->getSubscriptionProduct();
    $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
        'platform_fee_percent' => 3.37,
        'commission_bps' => 337,
    ])]);
    $creator->refresh();

    $product = DigitalProduct::query()->create([
        'uuid' => Str::uuid(),
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Fee Math Product',
        'price_cents' => 10000,
        'currency' => 'ETB',
        'status' => 'approved',
    ]);

    $mockGateway = $this->getMockBuilder(ChapaGateway::class)
        ->disableOriginalConstructor()
        ->getMock();
    $mockGateway->method('createTransaction')->willReturn(
        new PaymentTransaction([
            'tx_ref' => 'test_tx_ref',
            'checkout_url' => 'https://checkout.chapa.com/test',
        ]),
    );
    app()->instance(ChapaGateway::class, $mockGateway);

    $order = app(StorefrontCheckout::class)->create(
        $product,
        null,
        ['name' => 'Buyer', 'email' => 'buyer@test.com'],
    );

    $this->assertSame(337, $order->commission_bps);
    $this->assertSame(337, $order->platform_fee_cents);
    $this->assertSame(9663, $order->creator_earnings_cents);
    $this->assertSame(3.37, (float) $order->platform_fee_percent);
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `ddev exec php artisan test --filter=testFeeMathUsesIntegerBasisPoints`
Expected: FAIL — current code computes `(int) round(10000 * (3.37 / 100))` = 337, but the assertion on `platform_fee_percent` (float 3.37) fails because current code stores the raw `platform_fee_percent` from benefits which is already 3.37... If it passes by accident, still run Step 4 — the rewrite is required by the spec regardless. (The meaningful failure is the derivation from bps; if this test passes today, extend it with a fractional bps case: `commission_bps => 337` with NO `platform_fee_percent` key, asserting `platform_fee_percent` === 3.37.)

- [ ] **Step 3: Implement integer math**

In `app/Storefront/StorefrontCheckout.php`, `create()` method, replace:

```php
$benefits = app(StorefrontBenefits::class)->forCreator($product->creator);
$gross = $product->price_cents;
$feePercent = $benefits['platform_fee_percent'];
$fee = (int) round($gross * ($feePercent / 100));
```

with:

```php
$entitlements = app(Entitlements::class);
$gross = $product->price_cents;
$bps = $entitlements->feeBps($product->creator);
$fee = (int) round($gross * $bps / 10000);
$feePercent = round($bps / 100, 4);
```

and update the `commission_bps` value in the `StorefrontOrder::create([...])` array from `$benefits['commission_bps']` to `$bps`.

Update the file's imports: replace `use App\Storefront\StorefrontBenefits;` with `use App\Entitlements\Entitlements;` (check no other usage remains).

- [ ] **Step 4: Run the fee tests**

Run: `ddev exec php artisan test --filter=EntitlementSystemTest`
Expected: PASS — `testPlatformFeePercentSnapshotOnOrder` (5% / 500 bps → fee 500, snapshot 5.0) and the new integer test both green.

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/StorefrontCheckout.php tests/Feature/EntitlementSystemTest.php
git commit -m "fix: use integer basis-point fee math in checkout"
```

---

### Task 4: products.active column + default-plan admin safety

**Files:**
- Create: `database/migrations/2026_08_17_000001_add_active_to_products.php`
- Modify: `common/foundation/src/Billing/Models/Product.php` (casts)
- Modify: `common/foundation/src/Billing/Products/CrupdateProduct.php` (transaction + active + default safety)
- Modify: `common/foundation/src/Billing/Products/CrupdateProductRequest.php` (add `active` validation rule)
- Modify: `common/foundation/src/Billing/Products/ProductsController.php` (destroy guard)
- Test: `tests/Feature/EntitlementSystemTest.php`

**Interfaces:**
- Consumes: nothing new.
- Produces: `products.active` boolean (default true); `CrupdateProduct::execute()` now wraps all writes in `DB::transaction`, accepts `active`, rejects `is_default && !active` with 422; `ProductsController::destroy` rejects deleting `is_default` plans with 422.

- [ ] **Step 1: Write the failing tests**

Add to `tests/Feature/EntitlementSystemTest.php`:

```php
private function createAdmin(): User
{
    return User::query()->forceCreate([
        'name' => 'Admin ' . Str::random(6),
        'username' => Str::lower(Str::random(10)),
        'email' => Str::random(8) . '@example.test',
        'password' => bcrypt('password'),
        'email_verified_at' => now(),
        'permissions' => ['admin', 'subscriptions.update'],
    ]);
}

public function testDefaultPlanCannotBeDeleted(): void
{
    $admin = $this->createAdmin();
    $defaultPlan = Product::where('is_default', true)->first();

    $response = $this->stateful()->actingAs($admin)
        ->delete("/api/v1/billing/products/{$defaultPlan->id}");

    $response->assertStatus(422);
}

public function testDefaultPlanCannotBeDisabled(): void
{
    $admin = $this->createAdmin();
    $defaultPlan = Product::where('is_default', true)->first();

    $response = $this->stateful()->actingAs($admin)
        ->put("/api/v1/billing/products/{$defaultPlan->id}", [
            'name' => $defaultPlan->name,
            'is_default' => true,
            'active' => false,
        ]);

    $response->assertStatus(422);
}

public function testMarkingNewDefaultPlanClearsOldDefault(): void
{
    $admin = $this->createAdmin();
    $defaultPlan = Product::where('is_default', true)->first();
    // free = true avoids gateway sync (SyncProductOnEnabledGateways) in the test env
    $newPlan = Product::create([
        'name' => 'New Default',
        'uuid' => Str::uuid(),
        'free' => true,
        'position' => 50,
    ]);

    $response = $this->stateful()->actingAs($admin)
        ->put("/api/v1/billing/products/{$newPlan->id}", [
            'name' => 'New Default',
            'is_default' => true,
        ]);

    $response->assertStatus(200);
    $this->assertSame(1, Product::where('is_default', true)->count());
    $this->assertFalse($defaultPlan->fresh()->is_default);
}
```

- [ ] **Step 2: Run to verify they fail**

Run: `ddev exec php artisan test --filter=EntitlementSystemTest`
Expected: FAIL — delete succeeds (200/204), disable succeeds, and `is_default` exclusivity may already pass (existing behavior). The delete/disable tests are the meaningful failures.

- [ ] **Step 3: Create the migration**

Create `database/migrations/2026_08_17_000001_add_active_to_products.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('active')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('active');
        });
    }
};
```

Run: `ddev exec php artisan migrate`

- [ ] **Step 4: Add the cast to the model**

In `common/foundation/src/Billing/Models/Product.php`, add to the `$casts` array (next to `'hidden' => 'boolean'`):

```php
'active' => 'boolean',
```

- [ ] **Step 5: Update CrupdateProduct**

In `common/foundation/src/Billing/Products/CrupdateProduct.php`:

1. Add `use Illuminate\Support\Facades\DB;` to the imports.
2. Wrap the method body in a transaction and add the `active` field + safety check. The method becomes:

```php
    public function execute(
        array $data,
        Product|null $originalProduct = null,
        $syncProduct = true,
    ): Product {
        return DB::transaction(function () use (
            $data,
            $originalProduct,
            $syncProduct,
        ): Product {
            $product =
                $originalProduct?->load('prices') ?:
                app(Product::class)->newModelInstance([
                    'uuid' => Str::uuid(),
                ]);

            $newData = [
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'hidden' => $data['hidden'] ?? false,
                'free' => $data['free'] ?? false,
                'active' => $data['active'] ?? $originalProduct?->active ?? true,
                'is_default' => $data['is_default'] ?? false,
                'recommended' => $data['recommended'] ?? false,
                'trial_period_days' => $data['trial_period_days'] ?? 0,
                'position' => $data['position'] ?? 0,
                'feature_list' => $data['feature_list'] ?? [],
                'storefront_benefits' => $data['storefront_benefits'] ?? null,
            ];

            $isDefault =
                $newData['is_default'] || ($originalProduct?->is_default ?? false);
            abort_if(
                $isDefault && !$newData['active'],
                422,
                __('The default plan cannot be disabled.'),
            );

            $product = $product->fill($newData);
            $product->save();

            if (!empty($newData['is_default'])) {
                Product::where('id', '!=', $product->id)->update([
                    'is_default' => false,
                ]);
            }

            // ... rest of the method unchanged (syncPermissions, prices, gateway sync) ...
            return $product;
        });
    }
```

(The `// ... rest ...` marker means: keep the existing code between `$product->save();` and `return $product;` exactly as it is today — permissions sync, price delete/create, and gateway sync. Do not reorder or duplicate it.)

- [ ] **Step 6: Add the active validation rule**

In `common/foundation/src/Billing/Products/CrupdateProductRequest.php`, add to the `rules()` array (next to `'free' => 'boolean'`):

```php
'active' => 'boolean',
```

Without this rule `active` never reaches `$request->validated()` and the admin switch would be dead.

- [ ] **Step 7: Guard product deletion**

In `common/foundation/src/Billing/Products/ProductsController.php`, `destroy()` method, after `Gate::authorize('destroy', $product);`, add:

```php
abort_if(
    $product->is_default,
    422,
    __('The default plan cannot be deleted.'),
);
```

- [ ] **Step 7: Run the tests**

Run: `ddev exec php artisan test --filter=EntitlementSystemTest`
Expected: PASS — all three new tests green (delete → 422, disable → 422, new default → 1 default + old cleared).

- [ ] **Step 8: Commit**

```bash
git add database/migrations/2026_08_17_000001_add_active_to_products.php common/foundation/src/Billing/Models/Product.php common/foundation/src/Billing/Products/CrupdateProduct.php common/foundation/src/Billing/Products/ProductsController.php tests/Feature/EntitlementSystemTest.php
git commit -m "feat: add active flag to plans with default-plan admin safety"
```

---

### Task 5: DigitalProductsController rewrite (Entitlements + update re-check)

**Files:**
- Modify: `app/Storefront/Controllers/DigitalProductsController.php`
- Test: `tests/Feature/EntitlementSystemTest.php`

**Interfaces:**
- Consumes: `Entitlements::planFor/limit` (Task 1).
- Produces: `enforceProductLimit(?int $freeLimit, ?int $paidLimit, int $priceCents, ?string $planName, ?int $existingId): void` — private; `syncFiles(DigitalProduct $product, array $ids, ?int $maxBytes): void` — private (signature unchanged); both `store()` and `update()` enforce limits; `update()` re-checks limits excluding the edited product.

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/EntitlementSystemTest.php`:

```php
public function testProductUpdateReChecksPaidLimitWhenPriceChanges(): void
{
    $creator = $this->createCreator();
    $workspace = $creator->workspaces()->first();

    $plan = $creator->getSubscriptionProduct();
    $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
        'max_free_products' => 1,
        'max_paid_products' => 1,
    ])]);
    $creator->refresh();

    $file = FileEntry::query()->create([
        'name' => 'test.pdf',
        'file_name' => 'test.pdf',
        'mime' => 'application/pdf',
        'extension' => 'pdf',
        'file_size' => 100,
        'workspace_id' => $workspace->id,
        'owner_id' => $creator->id,
    ]);

    DigitalProduct::query()->create([
        'uuid' => Str::uuid(),
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Existing Paid',
        'price_cents' => 1000,
        'currency' => 'ETB',
        'status' => 'draft',
    ]);
    $freeProduct = DigitalProduct::query()->create([
        'uuid' => Str::uuid(),
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Existing Free',
        'price_cents' => 0,
        'currency' => 'ETB',
        'status' => 'draft',
    ]);

    $response = $this->stateful()->actingAs($creator)
        ->put("/api/v1/digital-products/{$freeProduct->id}", [
            'title' => 'Existing Free',
            'price_cents' => 1500,
            'currency' => 'ETB',
            'file_ids' => [$file->id],
        ]);

    $response->assertStatus(422);

    $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
        'max_paid_products' => 2,
    ])]);
    $creator->refresh();

    $response = $this->stateful()->actingAs($creator)
        ->put("/api/v1/digital-products/{$freeProduct->id}", [
            'title' => 'Existing Free',
            'price_cents' => 1500,
            'currency' => 'ETB',
            'file_ids' => [$file->id],
        ]);

    $response->assertStatus(200);
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `ddev exec php artisan test --filter=testProductUpdateReChecksPaidLimitWhenPriceChanges`
Expected: FAIL — today `update()` does not enforce limits, so the first PUT returns 200 instead of 422.

- [ ] **Step 3: Rewrite the controller**

In `app/Storefront/Controllers/DigitalProductsController.php`:

1. Replace the import `use App\Storefront\StorefrontBenefits;` with `use App\Entitlements\Entitlements;`.
2. Replace `store()` with:

```php
    public function store(Request $request)
    {
        $data = $this->validated($request);
        $creator = $request->user();
        $entitlements = app(Entitlements::class);
        $this->enforceProductLimit(
            $entitlements->limit($creator, 'max_free_products'),
            $entitlements->limit($creator, 'max_paid_products'),
            $data['price_cents'],
            $entitlements->planFor($creator)?->name,
            null,
        );

        return DB::transaction(function () use ($data, $creator, $entitlements): DigitalProduct {
            $product = DigitalProduct::create([
                ...Arr::except($data, ['file_ids', 'biolink_ids']),
                'user_id' => $creator->id,
                'currency' => $data['currency'] ?? config('storefront.currency'),
            ]);
            $this->syncFiles(
                $product,
                $data['file_ids'],
                $entitlements->limit($creator, 'max_upload_bytes'),
            );
            app(DigitalProductVisibility::class)->sync($product, $data['biolink_ids'] ?? []);

            return new DigitalProductResource($product->load(['files', 'cover', 'biolinks']));
        });
    }
```

3. Replace `update()` with:

```php
    public function update(Request $request, DigitalProduct $digitalProduct)
    {
        $this->assertOwner($digitalProduct, $request);
        $data = $this->validated($request);
        $creator = $request->user();
        $entitlements = app(Entitlements::class);
        $this->enforceProductLimit(
            $entitlements->limit($creator, 'max_free_products'),
            $entitlements->limit($creator, 'max_paid_products'),
            $data['price_cents'],
            $entitlements->planFor($creator)?->name,
            $digitalProduct->id,
        );

        return DB::transaction(function () use ($digitalProduct, $data, $creator, $entitlements): DigitalProduct {
            $digitalProduct->update([
                ...Arr::except($data, ['file_ids', 'biolink_ids']),
                'currency' => $data['currency'] ?? $digitalProduct->currency,
                'status' => $digitalProduct->status === 'approved' ? 'draft' : $digitalProduct->status,
            ]);
            $this->syncFiles(
                $digitalProduct,
                $data['file_ids'],
                $entitlements->limit($creator, 'max_upload_bytes'),
            );
            app(DigitalProductVisibility::class)->sync(
                $digitalProduct,
                $data['biolink_ids'] ?? $digitalProduct->biolinks()->pluck('biolinks.id')->all(),
            );

            return new DigitalProductResource($digitalProduct->fresh()->load(['files', 'cover', 'biolinks']));
        });
    }
```

4. Replace `enforceProductLimit()` with:

```php
    private function enforceProductLimit(
        ?int $freeLimit,
        ?int $paidLimit,
        int $priceCents,
        ?string $planName,
        ?int $existingId,
    ): void {
        $isFree = $priceCents <= 0;
        $limit = $isFree ? $freeLimit : $paidLimit;
        if ($limit === null) {
            return;
        }
        $query = DigitalProduct::query()
            ->where('workspace_id', ActiveWorkspace::get()->id)
            ->whereNull('deleted_at');
        if ($existingId !== null) {
            $query->where('id', '!=', $existingId);
        }
        $query->where('price_cents', $isFree ? '<=' : '>', 0);
        $count = $query->count();
        abort_if($count >= $limit, 422, $isFree
            ? __("You've reached your :plan limit of :count free products.", ['plan' => $planName ?? 'plan', 'count' => $limit])
            : __("You've reached your :plan limit of :count paid products.", ['plan' => $planName ?? 'plan', 'count' => $limit]));
    }
```

5. In `syncFiles()`, the "exceed your plan's storage allowance of :limit" message currently calls the private `$this->formatBytes($maxBytes)` — replace with `Entitlements::formatBytes($maxBytes)` and delete the private `formatBytes()` method. The message strings themselves stay.

- [ ] **Step 4: Run the tests**

Run: `ddev exec php artisan test --filter=EntitlementSystemTest`
Expected: PASS — `testPaidProductLimitEnforcedViaHttp` (store 422), the new update re-check test, and all others green.

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/Controllers/DigitalProductsController.php tests/Feature/EntitlementSystemTest.php
git commit -m "feat: enforce plan limits on product update and plan-named messages"
```

---

### Task 6: Upload-time storage quota enforcement

**Files:**
- Create: `app/Entitlements/AssertDigitalProductUploadAllowed.php`
- Modify: `common/foundation/src/Files/Controllers/FileEntriesController.php` (store method)
- Modify: `common/foundation/src/Files/Tus/TusFileEntryController.php` (store method)
- Test: `tests/Feature/EntitlementSystemTest.php`

**Interfaces:**
- Consumes: `Entitlements::limit(User, 'max_upload_bytes')`, `Entitlements::formatBytes(int)` (Task 1).
- Produces: `AssertDigitalProductUploadAllowed::execute(int $fileSize, int $workspaceId): void` — aborts 422 with "Uploading this file would exceed your :size storage allowance." when over quota; no-op when limit is null.

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/EntitlementSystemTest.php`. The upload route gates on `files.create`, which comes from the default Users role — attach it to the creator first:

```php
public function testUploadTimeStorageQuotaEnforced(): void
{
    $creator = $this->createCreator();
    $workspace = $creator->workspaces()->first();

    $role = \Common\Roles\Models\Role::where('default', true)->first();
    $creator->roles()->attach($role->id);

    $plan = $creator->getSubscriptionProduct();
    $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
        'max_upload_bytes' => 200,
    ])]);
    $creator->refresh();

    $file = \Illuminate\Http\UploadedFile::fake()->create('file.pdf', 1);

    $response = $this->stateful()->actingAs($creator)
        ->post('/api/v1/file-entries', [
            'file' => $file,
            'workspaceId' => $workspace->id,
            'uploadType' => 'digitalProductFiles',
        ]);

    $response->assertStatus(422);

    $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
        'max_upload_bytes' => 1073741824,
    ])]);
    $creator->refresh();

    $file2 = \Illuminate\Http\UploadedFile::fake()->create('file2.pdf', 1);

    $response = $this->stateful()->actingAs($creator)
        ->post('/api/v1/file-entries', [
            'file' => $file2,
            'workspaceId' => $workspace->id,
            'uploadType' => 'digitalProductFiles',
        ]);

    $response->assertStatus(200);
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `ddev exec php artisan test --filter=testUploadTimeStorageQuotaEnforced`
Expected: FAIL — first POST returns 200 today (only the per-file 100MB cap is enforced in the upload path).

- [ ] **Step 3: Create the action**

Create `app/Entitlements/AssertDigitalProductUploadAllowed.php`:

```php
<?php

namespace App\Entitlements;

use Common\Workspaces\Models\Workspace;
use Illuminate\Support\Facades\DB;

class AssertDigitalProductUploadAllowed
{
    public function execute(int $fileSize, int $workspaceId): void
    {
        $workspace = Workspace::findOrFail($workspaceId);
        $workspace->loadMissing('members.user');
        $owner = $workspace->getOwnerUser();

        $limit = app(Entitlements::class)->limit($owner, 'max_upload_bytes');
        if ($limit === null) {
            return;
        }

        $used = (int) DB::table('digital_product_files')
            ->join('file_entries', 'file_entries.id', '=', 'digital_product_files.file_entry_id')
            ->where('file_entries.workspace_id', $workspaceId)
            ->sum('file_entries.file_size');

        abort_if(
            $used + $fileSize > $limit,
            422,
            __("Uploading this file would exceed your :size storage allowance.", [
                'size' => Entitlements::formatBytes($limit),
            ]),
        );
    }
}
```

- [ ] **Step 4: Hook into the multipart upload**

In `common/foundation/src/Files/Controllers/FileEntriesController.php`, `store()` method, immediately after the `$request->validate([...])` call and before `(new StoreFile())->execute(...)`, add:

```php
if (
    $payload->uploadType->name === 'digitalProductFiles' &&
    $payload->workspaceId
) {
    app(\App\Entitlements\AssertDigitalProductUploadAllowed::class)
        ->execute($payload->size, $payload->workspaceId);
}
```

- [ ] **Step 5: Hook into the TUS finalize**

In `common/foundation/src/Files/Tus/TusFileEntryController.php`, `store()` method, immediately after `Gate::authorize('store', [...])` and before `(new StoreFile())->execute(...)`, add:

```php
if (
    $payload->uploadType->name === 'digitalProductFiles' &&
    $payload->workspaceId
) {
    app(\App\Entitlements\AssertDigitalProductUploadAllowed::class)
        ->execute($payload->size, $payload->workspaceId);
}
```

Note: in this controller `$metadata['size'] = $tusData['size'];` is already assigned before `$payload` is built, so `$payload->size` is correct. `FileEntryPayload` already reads `workspaceId` from the metadata sent by the frontend.

- [ ] **Step 6: Run the tests**

Run: `ddev exec php artisan test --filter=EntitlementSystemTest`
Expected: PASS — upload over quota → 422, then after raising the limit → 200.

- [ ] **Step 7: Commit**

```bash
git add app/Entitlements/AssertDigitalProductUploadAllowed.php common/foundation/src/Files/Controllers/FileEntriesController.php common/foundation/src/Files/Tus/TusFileEntryController.php tests/Feature/EntitlementSystemTest.php
git commit -m "feat: enforce storage quota at upload time for digital product files"
```

---

### Task 7: Tracking pixel execution gate

**Files:**
- Modify: `app/Links/Controllers/FallbackRouteController.php` (getLinkeableResponse + new private method)
- Modify: `resources/views/redirects/direct.blade.php`
- Test: `tests/Feature/EntitlementSystemTest.php`

**Interfaces:**
- Consumes: `Entitlements::enabled(User, 'tracking_pixels_enabled')` (Task 1).
- Produces: `$pixelsEnabled` boolean passed into the `redirects.direct` view; the blade renders pixel includes only when true.

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/EntitlementSystemTest.php`:

```php
public function testPixelExecutionSkippedWhenPlanDoesNotEnableTrackingPixels(): void
{
    $creator = $this->createCreator();
    $workspace = $creator->workspaces()->first();

    $plan = $creator->getSubscriptionProduct();
    $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
        'tracking_pixels_enabled' => false,
    ])]);
    $creator->refresh();

    $link = \App\Links\Models\Link::query()->create([
        'type' => 'direct',
        'back_half' => Str::random(6),
        'long_url' => 'https://example.com/redirect-target',
        'user_id' => $creator->id,
        'workspace_id' => $workspace->id,
    ]);
    $pixel = \App\TrackingPixels\Models\TrackingPixel::query()->create([
        'name' => 'Test Pixel',
        'type' => 'facebook',
        'pixel_id' => '123456',
        'user_id' => $creator->id,
        'workspace_id' => $workspace->id,
    ]);
    $link->pixels()->attach($pixel->id);

    $response = $this->get('/' . $link->back_half);

    $response->assertStatus(301);
    $this->assertStringNotContainsString('facebook.com', $response->getContent() ?? '');

    $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
        'tracking_pixels_enabled' => true,
    ])]);
    $creator->refresh();

    $response = $this->get('/' . $link->back_half);
    $this->assertStringContainsString('facebook.com', $response->getContent() ?? '');
}
```

Note: check the exact pixel script markup in `resources/views/pixels/facebook.blade.php` — if it references `facebook.com` (it should, per the existing pixel view), the assertions above hold; otherwise assert on the pixel's type/id string that appears in the rendered include.

- [ ] **Step 2: Run to verify it fails**

Run: `ddev exec php artisan test --filter=testPixelExecutionSkippedWhenPlanDoesNotEnableTrackingPixels`
Expected: FAIL — pixel include renders today regardless of plan.

- [ ] **Step 3: Compute the gate in the controller**

In `app/Links/Controllers/FallbackRouteController.php`, inside `getLinkeableResponse()`, in the `RENDER_TYPE_REDIRECT_WITH_DELAY` branch, replace:

```php
$data = $linkeable->getFrontendRenderData();
return response()->view(
    'redirects.direct',
    $data,
    301,
    $redirectHeaders,
);
```

with:

```php
$data = $linkeable->getFrontendRenderData();
$data['pixelsEnabled'] = $this->pixelsEnabledForLinkeable($linkeable);
return response()->view(
    'redirects.direct',
    $data,
    301,
    $redirectHeaders,
);
```

Add this private method to the same controller:

```php
private function pixelsEnabledForLinkeable(Linkeable $linkeable): bool
{
    $ownerId = $linkeable->workspace_id
        ? \DB::table('workspaces')->where('id', $linkeable->workspace_id)->value('owner_id')
        : $linkeable->user_id;
    $owner = $ownerId ? \App\Models\User::find($ownerId) : null;

    return $owner
        ? app(\App\Entitlements\Entitlements::class)->enabled(
            $owner,
            'tracking_pixels_enabled',
        )
        : true;
}
```

The file already imports `Linkeable` (it type-hints it elsewhere); add `use App\Entitlements\Entitlements;` to imports (use the file's existing import style — if `DB`/`User` are not imported, keep the fully-qualified `\DB`/`\App\Models\User` forms shown above).

- [ ] **Step 4: Gate the blade include**

In `resources/views/redirects/direct.blade.php`, replace:

```blade
@foreach ($data->getTrackingPixels() as $pixel)
    @include("pixels.{$pixel['type']}", ['pixel' => $pixel])
@endforeach
```

with:

```blade
@if ($pixelsEnabled ?? true)
    @foreach ($data->getTrackingPixels() as $pixel)
        @include("pixels.{$pixel['type']}", ['pixel' => $pixel])
    @endforeach
@endif
```

- [ ] **Step 5: Run the tests**

Run: `ddev exec php artisan test --filter=EntitlementSystemTest`
Expected: PASS — pixel script absent when disabled, present when enabled.

- [ ] **Step 6: Commit**

```bash
git add app/Links/Controllers/FallbackRouteController.php resources/views/redirects/direct.blade.php tests/Feature/EntitlementSystemTest.php
git commit -m "feat: gate tracking pixel execution on plan entitlement"
```

---

### Task 8: ProductResource pricing_features + regenerate API types

**Files:**
- Modify: `common/foundation/src/Billing/Products/ProductResource.php`
- Regenerate: `resources/client/gen/` (Scramble + Orval)
- Test: `tests/Feature/EntitlementSystemTest.php`

**Interfaces:**
- Consumes: `Entitlements::benefitsFor(Product)` (Task 1).
- Produces: `ProductResource` JSON gains `pricing_features: string[]` (e.g. "5 paid products", "1 GB storage", "Unlimited products"). Gen schema `Product` type gains `pricing_features?: string[]`.

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/EntitlementSystemTest.php`:

```php
public function testPricingFeaturesDerivedFromPlanBenefits(): void
{
    $plan = Product::where('is_default', true)->first();

    $resource = new \Common\Billing\Products\ProductResource($plan);
    $data = $resource->toArray(request());

    $this->assertIsArray($data['pricing_features']);
    $this->assertContains('5 free products', $data['pricing_features']);
    $this->assertContains('5 paid products', $data['pricing_features']);
    $this->assertContains('1 GB storage', $data['pricing_features']);
    $this->assertContains('5% platform fee', $data['pricing_features']);
}
```

Note: this test assumes the default plan in the test DB carries the canonical Free benefits (5 free/5 paid, 1 GB, 5%). If the live DB's default plan differs, adjust the expected strings to its actual `storefront_benefits` values — the derivation logic is what's under test.

- [ ] **Step 2: Run to verify it fails**

Run: `ddev exec php artisan test --filter=testPricingFeaturesDerivedFromPlanBenefits`
Expected: FAIL — `pricing_features` key does not exist yet.

- [ ] **Step 3: Implement pricing_features**

In `common/foundation/src/Billing/Products/ProductResource.php`:

1. Add `'pricing_features' => $this->pricingFeatures(),` to the returned array (after `'storefront_benefits' => $this->storefront_benefits,`).
2. Add this private method to the resource class:

```php
    private function pricingFeatures(): array
    {
        $benefits = app(\App\Entitlements\Entitlements::class)
            ->benefitsFor($this->resource);
        $features = [];

        $free = $benefits['max_free_products'] ?? null;
        $paid = $benefits['max_paid_products'] ?? null;
        if ($free === null && $paid === null) {
            $features[] = 'Unlimited products';
        } else {
            $features[] = $free === null
                ? 'Unlimited free products'
                : "$free free products";
            $features[] = $paid === null
                ? 'Unlimited paid products'
                : "$paid paid products";
        }

        $bytes = $benefits['max_upload_bytes'] ?? null;
        $features[] = $bytes === null
            ? 'Unlimited storage'
            : \App\Entitlements\Entitlements::formatBytes($bytes) . ' storage';

        $storefronts = $benefits['max_storefronts'] ?? null;
        $features[] = $storefronts === null
            ? 'Unlimited storefronts'
            : "$storefronts storefronts";

        $workspaces = $benefits['max_workspaces'] ?? null;
        $features[] = $workspaces === null
            ? 'Unlimited workspaces'
            : "$workspaces workspaces";

        $fee = (float) ($benefits['platform_fee_percent'] ?? 0);
        $features[] = $fee > 0
            ? rtrim(rtrim(number_format($fee, 2), '0'), '.') . '% platform fee'
            : 'No platform fees';

        if (!empty($benefits['tracking_pixels_enabled'])) {
            $features[] = 'Tracking pixels';
        }

        return $features;
    }
```

- [ ] **Step 4: Run the test**

Run: `ddev exec php artisan test --filter=testPricingFeaturesDerivedFromPlanBenefits`
Expected: PASS.

- [ ] **Step 5: Regenerate API types**

Run:

```bash
ddev exec php artisan scramble:export --path=resources/client/api.json --api=internal
npx orval
```

Verify `resources/client/gen/schemas/product.ts` now includes `pricingFeatures?: string[];` (Orval camelizes JSON keys) and `resources/client/gen/schemas/crupdate-product-body.ts` includes `active?: boolean;`.

- [ ] **Step 6: Commit**

```bash
git add common/foundation/src/Billing/Products/ProductResource.php tests/Feature/EntitlementSystemTest.php resources/client/api.json resources/client/gen/
git commit -m "feat: expose plan pricing features from product resource"
```

---

### Task 9: Admin plan form sections with Unlimited toggles

**Files:**
- Modify: `common/foundation/resources/client/admin/plans/crupdate-plan-page/crupdate-plan-form.tsx`
- Modify: `common/foundation/resources/client/admin/plans/crupdate-plan-page/edit-plan-page.tsx`
- Modify: `common/foundation/resources/client/admin/plans/crupdate-plan-page/create-plan-page.tsx`

**Interfaces:**
- Consumes: `CrupdateProductBody` gen type (now includes `active`, `storefront_benefits` with `max_*` nullable numbers).
- Produces: form values `{active: boolean, is_default: boolean, storefront_benefits: {platform_fee_percent?: number, max_free_products: number|null, max_paid_products: number|null, max_upload_bytes: number|null (bytes), max_storefronts: number|null, max_workspaces: number|null, tracking_pixels_enabled?: boolean}}`. Nulls are submitted as JSON `null` and stored as `null` = unlimited.

- [ ] **Step 1: Update form default values (edit page)**

In `edit-plan-page.tsx`, add to `defaultValues`:

```tsx
active: product.active,
is_default: product.is_default,
storefront_benefits: product.storefront_benefits ?? {},
```

- [ ] **Step 2: Update form default values (create page)**

In `create-plan-page.tsx`, add to `defaultValues`:

```tsx
active: true,
is_default: false,
storefront_benefits: {
  platform_fee_percent: 5,
  max_free_products: 5,
  max_paid_products: 5,
  max_upload_bytes: 1073741824,
  max_storefronts: 1,
  max_workspaces: 1,
  tracking_pixels_enabled: false,
},
```

- [ ] **Step 3: Restructure the form component**

In `crupdate-plan-form.tsx`, replace the `CrupdatePlanForm` body so it renders sections instead of the current inline layout. Keep `PricingListForm`, `FeatureListForm`, `PriceForm`, `positionItems` (move/extend). New structure:

```tsx
export function CrupdatePlanForm() {
  return (
    <div className="flex flex-col gap-10">
      <GeneralSection />
      <PricingListForm />
      <CommerceSection />
      <CreatorSection />
      <GrowthSection />
      <AdvancedSection />
    </div>
  );
}
```

`GeneralSection` = the existing name/description/position `Field.Group` + the trial days field (move the `TrialSection` content here: `HookForm.Field name="trial_period_days"` with its `NumberField`) + the Visibility `FieldSet` (recommended, hidden, free switches) plus two new switches in that FieldSet:

```tsx
<HookForm.Field name="active">
  <Field.Label>
    <Switch />
    <Trans message="Active" />
  </Field.Label>
  <Field.Description>
    <Trans message="Disabled plans are never assigned to users." />
  </Field.Description>
  <Field.Error />
</HookForm.Field>

<HookForm.Field name="is_default">
  <Field.Label>
    <Switch />
    <Trans message="Default plan" />
  </Field.Label>
  <Field.Description>
    <Trans message="Assigned to users without an active subscription. The default plan cannot be disabled or deleted." />
  </Field.Description>
  <Field.Error />
</HookForm.Field>
```

- [ ] **Step 4: Add the Commerce, Creator, Growth sections**

Add the following components to `crupdate-plan-form.tsx` (place them after `TrialSection`; `useFormContext`, `Switch`, `Input`, `Field.Group`, `FieldSet.Root`, `FieldSet.Legend`, `Trans` are already imported; add `useState` from react and `ReactNode` type import):

```tsx
function CommerceSection() {
  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <Trans message="Commerce" />
      </FieldSet.Legend>
      <Field.Group>
        <PlatformFeeField />
        <LimitField
          name="storefront_benefits.max_free_products"
          label={<Trans message="Free products" />}
          description={<Trans message="Maximum number of free products a creator can sell." />}
        />
        <LimitField
          name="storefront_benefits.max_paid_products"
          label={<Trans message="Paid products" />}
          description={<Trans message="Maximum number of paid products a creator can sell." />}
        />
        <StorageLimitField />
      </Field.Group>
    </FieldSet.Root>
  );
}

function CreatorSection() {
  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <Trans message="Creator" />
      </FieldSet.Legend>
      <Field.Group>
        <LimitField
          name="storefront_benefits.max_storefronts"
          label={<Trans message="Storefronts" />}
          description={<Trans message="Maximum number of storefronts (link in bio) per workspace." />}
        />
        <LimitField
          name="storefront_benefits.max_workspaces"
          label={<Trans message="Workspaces" />}
          description={<Trans message="Maximum number of workspaces per user." />}
        />
      </Field.Group>
    </FieldSet.Root>
  );
}

function GrowthSection() {
  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <Trans message="Growth" />
      </FieldSet.Legend>
      <Field.Group>
        <HookForm.Field name="storefront_benefits.tracking_pixels_enabled">
          <Field.Label>
            <Switch />
            <Trans message="Tracking pixels" />
          </Field.Label>
          <Field.Description>
            <Trans message="Creators can add tracking pixels to their links." />
          </Field.Description>
          <Field.Error />
        </HookForm.Field>
      </Field.Group>
    </FieldSet.Root>
  );
}

type LimitFieldProps = {
  name:
    | 'storefront_benefits.max_free_products'
    | 'storefront_benefits.max_paid_products'
    | 'storefront_benefits.max_storefronts'
    | 'storefront_benefits.max_workspaces';
  label: ReactNode;
  description?: ReactNode;
};

function LimitField({name, label, description}: LimitFieldProps) {
  const {watch, setValue} = useFormContext<CrupdatePlanFormValues>();
  const value = watch(name) as number | null | undefined;
  const unlimited = value === null || value === undefined;

  return (
    <Field.Group>
      <Field.Label>{label}</Field.Label>
      <div className="flex items-center gap-3">
        <Input
          type="number"
          min={0}
          step={1}
          className="max-w-32"
          value={unlimited ? '' : value}
          disabled={unlimited}
          onChange={e =>
            setValue(name, Number(e.target.value), {shouldDirty: true})
          }
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={unlimited}
            onCheckedChange={checked =>
              setValue(name, checked ? null : 0, {shouldDirty: true})
            }
          />
          <Trans message="Unlimited" />
        </label>
      </div>
      {description && <Field.Description>{description}</Field.Description>}
    </Field.Group>
  );
}

function PlatformFeeField() {
  const {watch, setValue} = useFormContext<CrupdatePlanFormValues>();
  const value = watch('storefront_benefits.platform_fee_percent') as
    | number
    | null
    | undefined;

  return (
    <Field.Group>
      <Field.Label>
        <Trans message="Platform fee" />
      </Field.Label>
      <div className="flex items-center gap-3">
        <Input
          type="number"
          min={0}
          max={100}
          step={0.5}
          className="max-w-32"
          value={value ?? 0}
          onChange={e =>
            setValue(
              'storefront_benefits.platform_fee_percent',
              Number(e.target.value),
              {shouldDirty: true},
            )
          }
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>
      <Field.Description>
        <Trans message="Percentage of each sale deducted as platform commission." />
      </Field.Description>
    </Field.Group>
  );
}

function StorageLimitField() {
  const {watch, setValue} = useFormContext<CrupdatePlanFormValues>();
  const bytes = watch('storefront_benefits.max_upload_bytes') as
    | number
    | null
    | undefined;
  const unlimited = bytes === null || bytes === undefined;
  const [gb, setGb] = useState<number>(bytes == null ? 1 : bytes / 1073741824);

  return (
    <Field.Group>
      <Field.Label>
        <Trans message="Storage" />
      </Field.Label>
      <div className="flex items-center gap-3">
        <Input
          type="number"
          min={0}
          step={0.1}
          className="max-w-32"
          value={unlimited ? '' : gb}
          disabled={unlimited}
          onChange={e => {
            const next = Number(e.target.value);
            setGb(next);
            setValue(
              'storefront_benefits.max_upload_bytes',
              Math.round(next * 1073741824),
              {shouldDirty: true},
            );
          }}
        />
        <span className="text-sm text-muted-foreground">
          <Trans message="GB" />
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={unlimited}
            onCheckedChange={checked => {
              if (checked) {
                setValue('storefront_benefits.max_upload_bytes', null, {
                  shouldDirty: true,
                });
              } else {
                setGb(1);
                setValue('storefront_benefits.max_upload_bytes', 1073741824, {
                  shouldDirty: true,
                });
              }
            }}
          />
          <Trans message="Unlimited" />
        </label>
      </div>
      <Field.Description>
        <Trans message="Total size of all downloadable product files per workspace." />
      </Field.Description>
    </Field.Group>
  );
}
```

- [ ] **Step 5: Move legacy editors behind an Advanced disclosure**

Add:

```tsx
function AdvancedSection() {
  return (
    <Accordion.Root variant="separated">
      <Accordion.Item value="advanced">
        <Accordion.Trigger>
          <Trans message="Advanced (deprecated)" />
        </Accordion.Trigger>
        <Accordion.Content>
          <FeatureListForm />
          <FieldSet.Root>
            <FieldSet.Legend>
              <Trans message="Legacy permissions" />
            </FieldSet.Legend>
            <FieldSet.Description>
              <Trans message="Deprecated. Prefer the plan limits configured above." />
            </FieldSet.Description>
            <FormPermissionSelector name="permissions" roleType="users" />
          </FieldSet.Root>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}
```

`Accordion`, `FieldSet` are already imported in the file; keep the old `FieldSet.Root` Permissions block only inside `AdvancedSection` (delete the old standalone Permissions `FieldSet.Root` from `CrupdatePlanForm`).

- [ ] **Step 6: Build and lint**

Run: `npm run build` and `npm run lint`
Expected: both pass. If `watch(name)`/`setValue` on dot-paths type-error because `CrupdatePlanFormValues` derives from the gen schema, ensure Task 8's regen ran (schema now carries `storefront_benefits` with the nullable number fields) and that `CrupdatePlanFormValues` includes it via `Omit<CrupdateProductBody, 'feature_list'>`.

- [ ] **Step 7: Commit**

```bash
git add common/foundation/resources/client/admin/plans/crupdate-plan-page/
git commit -m "feat: sectioned plan form with unlimited toggles"
```

---

### Task 10: Usage meter/dialog — commerce entries + Unlimited rendering

**Files:**
- Modify: `resources/client/dashboard/layout/sidenav/usage-dialog.tsx`

**Interfaces:**
- Consumes: `GetUsage200Data` gen type (already exposes `digital_products`, `free_products`, `paid_products`, `storage`, `storefronts`, `workspaces` — the backend `UsageController` returns them all today), `prettyBytes` from `@ui/utils/files/pretty-bytes` (exists).
- Produces: usage dialog showing commerce limits with "Unlimited" text (no progress bar) when `total === null`.

- [ ] **Step 1: Extend usageLabels**

Replace the `usageLabels` definition in `resources/client/dashboard/layout/sidenav/usage-dialog.tsx` with:

```tsx
export const usageLabels: Partial<
  Record<
    keyof GetUsage200Data,
    {
      label: ReactNode;
      icon: ReactNode;
      formatUsed?: (used: number) => ReactNode;
    }
  >
> = {
  storefronts: {
    label: <Trans message="Storefronts" />,
    icon: <StoreIcon className="size-4" />,
  },
  tracked_events: {
    label: <Trans message="Tracked events" />,
    icon: <MousePointerClickIcon className="size-4" />,
  },
  tracking_pixels: {
    label: <Trans message="Tracking pixels" />,
    icon: sharedDashboardIcons.pixels,
  },
  digital_products: {
    label: <Trans message="Products" />,
    icon: <PackageIcon className="size-4" />,
  },
  free_products: {
    label: <Trans message="Free products" />,
    icon: <GiftIcon className="size-4" />,
  },
  paid_products: {
    label: <Trans message="Paid products" />,
    icon: <CircleDollarSignIcon className="size-4" />,
  },
  storage: {
    label: <Trans message="Storage" />,
    icon: <HardDriveIcon className="size-4" />,
    formatUsed: used => prettyBytes(used),
  },
  workspaces: {
    label: <Trans message="Workspaces" />,
    icon: <UsersIcon className="size-4" />,
  },
} as const;
```

Add imports:

```tsx
import {prettyBytes} from '@ui/utils/files/pretty-bytes';
import {
  CircleDollarSignIcon,
  GiftIcon,
  HardDriveIcon,
  MousePointerClickIcon,
  PackageIcon,
  StoreIcon,
  UsersIcon,
} from 'lucide-react';
```

(`StoreIcon`, `MousePointerClickIcon`, `CircleDollarSignIcon` are already imported — merge with the new ones.)

- [ ] **Step 2: Update GridItem for unlimited + per-type formatting**

Replace the `GridItemProps` type and `GridItem` function with:

```tsx
type GridItemProps = {
  label: NonNullable<(typeof usageLabels)[keyof typeof usageLabels]>;
  usage: {used: number; total: number | null};
};

function GridItem({label, usage}: GridItemProps) {
  const unlimited = usage.total === null;
  const isAtOrOverLimit = usage.total !== null && usage.used >= usage.total;

  const formattedUsed = label.formatUsed
    ? label.formatUsed(usage.used)
    : <FormattedNumber value={usage.used} notation="compact" />;

  const meterValue = unlimited ? (
    <Trans message="Unlimited" />
  ) : (
    <Trans
      message=":used of :total"
      values={{
        used: formattedUsed,
        total: <FormattedNumber value={usage.total!} notation="compact" />,
      }}
    />
  );

  return (
    <Meter value={unlimited ? 0 : usage.used}>
      <MeterLabel>
        {label.icon} {label.label}
      </MeterLabel>
      {meterValue}
      {!unlimited && (
        <MeterTrack>
          <MeterIndicator
            className={isAtOrOverLimit ? 'bg-destructive' : 'bg-primary'}
          />
        </MeterTrack>
      )}
    </Meter>
  );
}
```

Note: the `biolinks` entry is removed because `storefronts` (plan-limited) supersedes it and the counts are identical — no other component references `usageLabels.biolinks` (verified: only this file uses `usageLabels`).

- [ ] **Step 3: Build and lint**

Run: `npm run build` and `npm run lint`
Expected: both pass. (The `formatUsed` path `label.formatUsed` returns `ReactNode` — the union in `usageLabels` includes entries without it; TS narrows via `'formatUsed' in label` — if oxlint/TS complains, switch to `label.formatUsed ? ... : ...` which is what's shown and is fine because the property is optional.)

- [ ] **Step 4: Commit**

```bash
git add resources/client/dashboard/layout/sidenav/usage-dialog.tsx
git commit -m "feat: show commerce limits with unlimited state in usage dialog"
```

---

### Task 11: Pricing table renders plan limits

**Files:**
- Modify: `common/foundation/resources/client/billing/pricing-table/product-feature-list.tsx`

**Interfaces:**
- Consumes: `Product.pricing_features?: string[]` gen type (Task 8).

- [ ] **Step 1: Implement the pricing_features block**

Replace the body of `ProductFeatureList` in `common/foundation/resources/client/billing/pricing-table/product-feature-list.tsx` with:

```tsx
export function ProductFeatureList({product}: FeatureListProps) {
  const hasPricingFeatures =
    product.pricing_features && product.pricing_features.length > 0;

  if (!hasPricingFeatures && !product.feature_list.length) {
    return null;
  }

  return (
    <div className="mt-8 border-t pt-6">
      <div className="mb-2.5 text-sm font-semibold">
        <Trans message="What's included" />
      </div>
      {hasPricingFeatures &&
        product.pricing_features.map(feature => (
          <div
            key={feature}
            className="flex items-center gap-2.5 py-1.5 text-sm"
          >
            <CheckIcon className="size-4 text-primary" />
            {feature}
          </div>
        ))}
      {product.feature_list.map(feature => (
        <div key={feature} className="flex items-center gap-2.5 py-1.5 text-sm">
          <CheckIcon className="size-4 text-primary" />
          <Trans message={feature} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Build and lint**

Run: `npm run build` and `npm run lint`
Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add common/foundation/resources/client/billing/pricing-table/product-feature-list.tsx
git commit -m "feat: render plan limits on pricing table"
```

---

### Task 12: Seeds use canonical benefit values

**Files:**
- Modify: `app/Demo/Console/SeedDemoData.php` (generateFreePlan + generateProPlan)
- Test: `tests/Feature/EntitlementSystemTest.php` (no change needed — setUp already fixed in Task 2)

**Interfaces:**
- Consumes: `config('storefront.demo_benefits.free'|'pro')` (Task 1).

- [ ] **Step 1: Replace literal benefit arrays**

In `app/Demo/Console/SeedDemoData.php`, in `generateFreePlan()`, replace the whole `'storefront_benefits' => [ ... ]` literal with:

```php
'storefront_benefits' => config('storefront.demo_benefits.free'),
```

and in `generateProPlan()`, replace the whole `'storefront_benefits' => [ ... ]` literal with:

```php
'storefront_benefits' => config('storefront.demo_benefits.pro'),
```

- [ ] **Step 2: Fix seed price currencies to ETB**

In `generateFreePlan()`, change the free plan price `'currency' => 'USD'` to `'currency' => 'ETB'`.
In `generateProPlan()`, change all three price entries' `'currency' => 'USD'` to `'currency' => 'ETB'`.

- [ ] **Step 3: Verify seeds work**

Run: `ddev exec php artisan demo:seed`
Expected: completes without error; then `ddev exec php artisan test --filter=EntitlementSystemTest` still passes (seeded plans now carry `active` from the migration default).

Note: `demo:seed` rebuilds the demo plans in the dev DB. If running it is undesirable in the current environment, verify at the config level instead: `ddev exec php artisan tinker --execute="dump(config('storefront.demo_benefits.free'));"` and `ddev exec php artisan tinker --execute="dump(config('storefront.demo_benefits.pro'));"` — both must dump the canonical arrays.

- [ ] **Step 4: Commit**

```bash
git add app/Demo/Console/SeedDemoData.php
git commit -m "refactor: seed plans from canonical benefit config with ETB prices"
```

---

### Task 13: Config-driven + downgrade end-to-end tests, full verification

**Files:**
- Test: `tests/Feature/EntitlementSystemTest.php`

- [ ] **Step 1: Write the config-driven test**

Add to `tests/Feature/EntitlementSystemTest.php`:

```php
public function testConfigDrivenLimitChangeAppliesImmediately(): void
{
    $creator = $this->createCreator();
    $workspace = $creator->workspaces()->first();

    $plan = $creator->getSubscriptionProduct();
    $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
        'max_paid_products' => 2,
    ])]);
    $creator->refresh();

    $file = FileEntry::query()->create([
        'name' => 'test.pdf',
        'file_name' => 'test.pdf',
        'mime' => 'application/pdf',
        'extension' => 'pdf',
        'file_size' => 100,
        'workspace_id' => $workspace->id,
        'owner_id' => $creator->id,
    ]);

    foreach ([1000, 2000] as $price) {
        DigitalProduct::query()->create([
            'uuid' => Str::uuid(),
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => "Product $price",
            'price_cents' => $price,
            'currency' => 'ETB',
            'status' => 'draft',
        ]);
    }

    $response = $this->stateful()->actingAs($creator)
        ->post('/api/v1/digital-products', [
            'title' => 'Third Product',
            'price_cents' => 3000,
            'currency' => 'ETB',
            'file_ids' => [$file->id],
        ]);
    $response->assertStatus(422);

    $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
        'max_paid_products' => 3,
    ])]);
    $creator->refresh();

    $response = $this->stateful()->actingAs($creator)
        ->post('/api/v1/digital-products', [
            'title' => 'Third Product',
            'price_cents' => 3000,
            'currency' => 'ETB',
            'file_ids' => [$file->id],
        ]);
    $response->assertStatus(200);

    $response = $this->stateful()->actingAs($creator)
        ->post('/api/v1/digital-products', [
            'title' => 'Fourth Product',
            'price_cents' => 4000,
            'currency' => 'ETB',
            'file_ids' => [$file->id],
        ]);
    $response->assertStatus(422);
}
```

- [ ] **Step 2: Write the downgrade test**

Add to `tests/Feature/EntitlementSystemTest.php`:

```php
public function testDowngradeFallsBackToDefaultPlanDataIntact(): void
{
    $creator = $this->createCreator();
    $workspace = $creator->workspaces()->first();
    $freePlan = Product::where('is_default', true)->first();

    $proPlan = Product::create([
        'name' => 'Pro Test',
        'uuid' => Str::uuid(),
        'free' => false,
        'position' => 3,
        'storefront_benefits' => [
            'platform_fee_percent' => 0.0,
            'commission_bps' => 0,
            'max_products' => null,
            'max_free_products' => null,
            'max_paid_products' => null,
            'max_upload_bytes' => null,
            'max_storefronts' => null,
            'max_workspaces' => null,
            'tracking_pixels_enabled' => true,
        ],
    ]);
    $subscription = \Common\Billing\Subscription::factory()
        ->active()
        ->create([
            'user_id' => $creator->id,
            'product_id' => $proPlan->id,
        ]);
    $creator->refresh();

    // over free limits while on Pro
    foreach ([1000, 2000, 3000] as $price) {
        DigitalProduct::query()->create([
            'uuid' => Str::uuid(),
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => "Pro Product $price",
            'price_cents' => $price,
            'currency' => 'ETB',
            'status' => 'approved',
        ]);
    }
    \App\Biolinks\Models\Biolink::query()->create([
        'back_half' => Str::random(5),
        'name' => 'Second Storefront',
        'user_id' => $creator->id,
        'workspace_id' => $workspace->id,
    ]);

    // expire subscription
    $subscription->update(['ends_at' => now()->subDay(), 'renews_at' => null]);
    $creator->refresh();

    // effective plan falls back to default
    $this->assertSame($freePlan->id, $creator->getSubscriptionProduct()->id);

    // data intact
    $this->assertSame(
        3,
        DigitalProduct::where('workspace_id', $workspace->id)->count(),
    );

    // no new resources allowed
    $file = FileEntry::query()->create([
        'name' => 'test.pdf',
        'file_name' => 'test.pdf',
        'mime' => 'application/pdf',
        'extension' => 'pdf',
        'file_size' => 100,
        'workspace_id' => $workspace->id,
        'owner_id' => $creator->id,
    ]);
    $response = $this->stateful()->actingAs($creator)
        ->post('/api/v1/digital-products', [
            'title' => 'Downgrade Product',
            'price_cents' => 5000,
            'currency' => 'ETB',
            'file_ids' => [$file->id],
        ]);
    $response->assertStatus(422);

    // upgrade restores immediately
    $subscription->update(['ends_at' => null]);
    $creator->refresh();
    $response = $this->stateful()->actingAs($creator)
        ->post('/api/v1/digital-products', [
            'title' => 'Upgraded Product',
            'price_cents' => 5000,
            'currency' => 'ETB',
            'file_ids' => [$file->id],
        ]);
    $response->assertStatus(200);
}
```

- [ ] **Step 3: Run the new tests**

Run: `ddev exec php artisan test --filter=EntitlementSystemTest`
Expected: PASS — the two new tests plus all existing ones.

- [ ] **Step 4: Run the whole suite**

Run: `ddev exec php artisan test`
Expected: PASS (any failures in unrelated tests: report, don't fix silently).

- [ ] **Step 5: Full frontend verification**

Run: `npm run build` and `npm run lint`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add tests/Feature/EntitlementSystemTest.php
git commit -m "test: config-driven limit changes and downgrade fallback"
```

---

## Verification checklist (run before claiming done)

- [ ] `ddev exec php artisan test` — full suite green.
- [ ] `npm run build` — Vite build green.
- [ ] `npm run lint` — oxlint clean.
- [ ] `ddev exec php artisan migrate` — no pending migrations.
- [ ] `ddev exec php artisan scramble:export --path=resources/client/api.json --api=internal` + `npx orval` produce no unexpected diffs in `resources/client/gen/`.
- [ ] Manual smoke (browser): admin → Plans → edit Free plan shows Active/Default switches, Commerce/Creator/Growth sections, Unlimited toggles; a creator's usage dialog shows Products/Storage/Storefronts/Workspaces with "Unlimited" where applicable; pricing page shows plan limits.

## Spec coverage map

| Spec section | Task(s) |
|---|---|
| §1 Central Entitlements service | Task 1, Task 2 |
| §2 Plan schema keys + validation | Task 1 (normalize), Task 9 (form), validation untouched in `CrupdateProductRequest` |
| §3 Default plan + admin safety | Task 4 |
| §4 Money safety | Task 3 |
| §5 Product update re-check | Task 5 |
| §6 Upload-time storage enforcement | Task 6 |
| §7 Tracking pixel execution gate | Task 7 |
| §8 Advanced analytics stored-only | Task 9 (Growth section omits the field) |
| §9 Admin plan form | Task 9 |
| §10 Pricing page + usage UI | Task 8, Task 10, Task 11 |
| §11 Seeds / defaults | Task 1 (config), Task 12 |
| §12 Downgrade policy | Task 13 (documented in spec; enforced by existing resolution) |
| Testing | Tasks 1-7, 13 |
