# Product Update Revert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an admin rejects an update to a live product, restore the last approved content and keep the product live, and show admins what changed before deciding.

**Architecture:** A nullable JSON `pending_review_snapshot` column on `digital_products` holds the product-level content as of the last approval while a review is pending. It is captured in `DigitalProductMutationService::update()` before the edit when the edit first queues review. `AdminDigitalProductsController::decide()` clears it on approve, or restores it (keeping the product approved) on reject, recording a new `update_reverted` event. The admin detail resource exposes a derived `pending_changes` list.

**Tech Stack:** Laravel 11 (PHP 8.2), Eloquent, Pest/PHPUnit feature tests; React 19 + TypeScript admin detail page, Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-09-19-product-update-revert-design.md`

## Global Constraints

- Work on branch `feat/product-update-revert` (already rebased on the merged batching change).
- ddev project: run PHP/artisan/pest via `ddev exec` (e.g. `ddev exec ./vendor/bin/pest ...`).
- `Model::preventLazyLoading()` is active outside production (including tests) — eager-load relations; no lazy loads.
- Revert is **product-level content only**; course curriculum is not versioned. Rejecting an update with no snapshot keeps today's behavior (`status='rejected'`).
- A revert keeps `status='approved'` and leaves `approved_at` and store placement untouched.
- Do not touch or stage `NUL`, `public/build/manifest.json`, or the pre-existing `components.json` change.
- Verify before any PR: `npx tsc --noEmit --skipLibCheck`, `npm run test`, `npm run build`, `ddev exec ./vendor/bin/pest`, then `git restore public/build/manifest.json`.
- Do not commit, push, or open a PR unless the user explicitly asks.

---

## File Structure

**Create**
- `database/migrations/2026_09_19_000001_add_pending_review_snapshot_to_digital_products.php`
- `tests/Feature/ProductUpdateRevertTest.php`

**Modify**
- `app/Storefront/Models/DigitalProduct.php`
- `app/Storefront/DigitalProductMutationService.php`
- `app/Storefront/Controllers/AdminDigitalProductsController.php`
- `app/Storefront/Resources/AdminDigitalProductResource.php`
- `app/Storefront/Notifications/ProductModerationNotification.php`
- `resources/client/admin/digital-products/admin-digital-product-detail-page.tsx`
- `resources/client/admin/digital-products/admin-product-detail.test.ts`

---

## Task 1: Snapshot column and capture

**Files:**
- Create: `database/migrations/2026_09_19_000001_add_pending_review_snapshot_to_digital_products.php`
- Create: `tests/Feature/ProductUpdateRevertTest.php`
- Modify: `app/Storefront/Models/DigitalProduct.php`
- Modify: `app/Storefront/DigitalProductMutationService.php`

**Interfaces:**
- Produces: `DigitalProduct::$pending_review_snapshot` (array|null); the snapshot is stored when an edit first queues review.

- [ ] **Step 1: Write the migration**

`database/migrations/2026_09_19_000001_add_pending_review_snapshot_to_digital_products.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('digital_products', function (Blueprint $table) {
            $table->json('pending_review_snapshot')->nullable()->after('review_requested_by');
        });
    }

    public function down(): void
    {
        Schema::table('digital_products', function (Blueprint $table) {
            $table->dropColumn('pending_review_snapshot');
        });
    }
};
```

- [ ] **Step 2: Extend the model**

In `app/Storefront/Models/DigitalProduct.php`:

- add `'pending_review_snapshot',` to `$fillable` (next to `review_requested_by`),
- add `'pending_review_snapshot' => 'array'` to `$casts`.

- [ ] **Step 3: Write the failing test**

Create `tests/Feature/ProductUpdateRevertTest.php` (initial file, more tests are added in later tasks):

```php
<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Files\FileEntry;
use Common\Settings\Models\Setting;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductUpdateRevertTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Setting::query()->where('name', 'like', 'product.%')->delete();
        settings()->loadSettings();
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testFirstEditStoresSnapshotAndSecondDoesNotOverwrite(): void
    {
        settings()->save(['product.updating_requires_review' => 1]);
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'title' => 'Original',
            'price_cents' => 1000,
        ]);
        $product->files()->attach($file->id);

        $this->updateProduct($creator, $product, ['title' => 'First edit']);
        $snapshot = $product->fresh()->pending_review_snapshot;
        $this->assertIsArray($snapshot);
        $this->assertSame('Original', $snapshot['title']);
        $this->assertSame([$file->id], $snapshot['file_ids']);

        $this->updateProduct($creator, $product, ['title' => 'Second edit']);
        $this->assertSame('Original', $product->fresh()->pending_review_snapshot['title']);
    }

    public function testNoSnapshotWhenUpdateReviewIsDisabled(): void
    {
        settings()->save(['product.updating_requires_review' => 0]);
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $product = $this->product($workspace, $creator, ['status' => 'approved', 'approved_at' => now()]);
        $product->files()->attach($file->id);

        $this->updateProduct($creator, $product, ['title' => 'Edit']);

        $this->assertNull($product->fresh()->pending_review_snapshot);
    }

    private function updateProduct(User $creator, DigitalProduct $product, array $overrides = []): void
    {
        $this->stateful()->actingAs($creator)->putJson(
            "/api/v1/digital-products/{$product->id}",
            array_merge([
                'title' => $product->title,
                'price_cents' => $product->price_cents,
                'currency' => 'ETB',
                'file_ids' => $product->files()->pluck('file_entries.id')->all(),
            ], $overrides),
        )->assertOk();
    }

    private function product(Workspace $workspace, User $creator, array $attributes = []): DigitalProduct
    {
        return DigitalProduct::query()->create(array_merge([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Product ' . Str::random(6),
            'price_cents' => 1000,
            'currency' => 'ETB',
            'type' => 'digital',
        ], $attributes));
    }

    private function createFile(User $creator, Workspace $workspace): FileEntry
    {
        return FileEntry::query()->create([
            'name' => 'download.pdf',
            'file_name' => 'download.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 1024,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
    }

    private function store(User $creator, Workspace $workspace): Biolink
    {
        return Biolink::query()->create([
            'back_half' => Str::random(8),
            'name' => 'Store ' . Str::random(4),
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);
    }

    private function creatorContext(): array
    {
        $creator = User::query()->forceCreate([
            'name' => 'Creator ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        if (!Workspace::query()->where('owner_id', $creator->id)->where('is_personal', true)->exists()) {
            (new CreateWorkspace())->createPersonalWorkspace($creator);
        }
        ActiveWorkspace::clearCache();

        return [$creator, $creator->workspaces()->first()];
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `ddev exec php artisan migrate` (apply the new column) then
`ddev exec ./vendor/bin/pest tests/Feature/ProductUpdateRevertTest.php`
Expected: FAIL — `pending_review_snapshot` is null (capture not implemented).

- [ ] **Step 5: Capture the snapshot in the mutation service**

In `app/Storefront/DigitalProductMutationService.php`, in `update()`, capture the snapshot immediately **before** `$product->update([...])`:

```php
            $snapshot = [
                'title' => $product->title,
                'description' => $product->description,
                'learning_outcomes' => $product->learning_outcomes,
                'price_cents' => $product->price_cents,
                'currency' => $product->currency,
                'type' => $product->type ?? 'digital',
                'cover_file_entry_id' => $product->cover_file_entry_id,
                'file_ids' => $product->files()->pluck('file_entries.id')->sort()->values()->all(),
            ];
```

Change the queue call to pass the snapshot and store it:

```php
                $queuedReview = $this->queueUpdateReviewIfNeeded($product, $actor, $snapshot);
```

and rewrite `queueUpdateReviewIfNeeded()`:

```php
    private function queueUpdateReviewIfNeeded(DigitalProduct $product, ?User $actor, array $snapshot): bool
    {
        $requiresReview = $product->isCourse()
            ? app(ProductSettings::class)->updatingRequiresReviewForCourse()
            : app(ProductSettings::class)->updatingRequiresReview();

        if ($product->status !== 'approved' || !$requiresReview) {
            return false;
        }

        if ($product->review_requested_at !== null) {
            return false;
        }

        $product->update([
            'review_requested_at' => now(),
            'review_requested_by' => $actor?->id ?? $product->user_id,
            'pending_review_snapshot' => $snapshot,
        ]);

        return true;
    }
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductUpdateRevertTest.php tests/Feature/ProductApprovalPipelineTest.php`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add database/migrations/2026_09_19_000001_add_pending_review_snapshot_to_digital_products.php \
        app/Storefront/Models/DigitalProduct.php \
        app/Storefront/DigitalProductMutationService.php \
        tests/Feature/ProductUpdateRevertTest.php
git commit -m "feat(products): snapshot approved content when an update queues review"
```

---

## Task 2: Revert on reject

**Files:**
- Modify: `app/Storefront/Controllers/AdminDigitalProductsController.php`
- Modify: `tests/Feature/ProductUpdateRevertTest.php`

**Interfaces:**
- Consumes: `DigitalProduct::$pending_review_snapshot`.
- Produces: rejecting an update with a snapshot restores content + files, keeps `status='approved'`, records `update_reverted`.

- [ ] **Step 1: Write the failing tests**

Insert into `ProductUpdateRevertTest` before the `private function updateProduct` helper:

```php
    public function testRejectingAnUpdateRevertsToSnapshotAndStaysLive(): void
    {
        settings()->save(['product.updating_requires_review' => 1]);
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $store = $this->store($creator, $workspace);
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'title' => 'Original',
            'price_cents' => 1000,
        ]);
        $product->files()->attach($file->id);
        $product->biolinks()->attach($store->id);

        $this->updateProduct($creator, $product, ['title' => 'Edited', 'price_cents' => 2000]);
        $this->assertSame('Edited', $product->fresh()->title);

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/digital-products/{$product->id}/reject",
            ['reason' => 'Not acceptable'],
        )->assertOk();

        $fresh = $product->fresh();
        $this->assertSame('approved', $fresh->status);
        $this->assertSame('Original', $fresh->title);
        $this->assertSame(1000, $fresh->price_cents);
        $this->assertNull($fresh->review_requested_at);
        $this->assertNull($fresh->pending_review_snapshot);
        $this->assertSame([$file->id], $fresh->files()->pluck('file_entries.id')->all());

        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'update_reverted',
            'reason' => 'Not acceptable',
            'actor_role' => 'admin',
        ]);

        $listed = $this->stateful()->getJson("/api/v1/public/stores/{$store->id}/digital-products");
        $listed->assertOk();
        $this->assertNotNull(collect($listed->json('data'))->firstWhere('id', $product->id));
    }

    public function testRejectingAnUpdateWithoutSnapshotFallsBackToRejected(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
        ]);
        $this->assertNull($product->pending_review_snapshot);

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/digital-products/{$product->id}/reject",
            ['reason' => 'No'],
        )->assertOk();

        $this->assertSame('rejected', $product->fresh()->status);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'update_rejected',
        ]);
    }

    public function testFirstTimeRejectIsUnchanged(): void
    {
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, ['status' => 'pending_approval']);

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/digital-products/{$product->id}/reject",
            ['reason' => 'Nope'],
        )->assertOk();

        $this->assertSame('rejected', $product->fresh()->status);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'rejected',
        ]);
    }
```

Add the `createAdmin` helper (used by these tests) after `creatorContext()`:

```php
    private function createAdmin(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'Admin ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $user->permissions()->attach(
            \Common\Permissions\Models\Permission::query()->firstOrCreate(['name' => 'admin']),
        );

        return $user;
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductUpdateRevertTest.php --filter=testRejectingAnUpdateRevertsToSnapshotAndStaysLive`
Expected: FAIL — status is `rejected` and the title is still `Edited`.

- [ ] **Step 3: Implement revert in decide()**

In `app/Storefront/Controllers/AdminDigitalProductsController.php`:

Add the import:

```php
use Common\Files\FileEntry;
```

In `decide()`, add `'pending_review_snapshot' => null` to the approve `$product->update([...])` array.

Replace the reject `else` branch body with:

```php
                $snapshot = $product->pending_review_snapshot;

                if ($isUpdate && is_array($snapshot)) {
                    $event = 'update_reverted';

                    $product->update([
                        'title' => $snapshot['title'] ?? $product->title,
                        'description' => $snapshot['description'] ?? null,
                        'learning_outcomes' => $snapshot['learning_outcomes'] ?? null,
                        'price_cents' => $snapshot['price_cents'] ?? $product->price_cents,
                        'currency' => $snapshot['currency'] ?? $product->currency,
                        'type' => $snapshot['type'] ?? $product->type,
                        'cover_file_entry_id' => $snapshot['cover_file_entry_id'] ?? null,
                        'status' => 'approved',
                        'rejection_reason' => null,
                        'review_requested_at' => null,
                        'review_requested_by' => null,
                        'pending_review_snapshot' => null,
                    ]);

                    $fileIds = FileEntry::query()
                        ->whereIn('id', $snapshot['file_ids'] ?? [])
                        ->where('workspace_id', $product->workspace_id)
                        ->pluck('id')
                        ->all();
                    $product->files()->sync($fileIds);

                    app(ProductReviewHistory::class)->record(
                        $product,
                        $event,
                        $from,
                        'approved',
                        $actor,
                        'admin',
                        $reason,
                        ['restored' => array_keys($snapshot)],
                    );
                } else {
                    $event = $isUpdate ? 'update_rejected' : 'rejected';

                    $product->update([
                        'status' => 'rejected',
                        'rejection_reason' => $reason,
                        'review_requested_at' => null,
                        'review_requested_by' => null,
                        'pending_review_snapshot' => null,
                    ]);

                    app(ProductReviewHistory::class)->record(
                        $product,
                        $event,
                        $from,
                        'rejected',
                        $actor,
                        'admin',
                        $reason,
                    );
                }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductUpdateRevertTest.php tests/Feature/AdminBulkProductModerationTest.php tests/Feature/AdminProductReviewQueueTest.php`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/Controllers/AdminDigitalProductsController.php tests/Feature/ProductUpdateRevertTest.php
git commit -m "feat(products): revert a rejected update to the approved snapshot"
```

---

## Task 3: pending_changes API and update_reverted notification

**Files:**
- Modify: `app/Storefront/Resources/AdminDigitalProductResource.php`
- Modify: `app/Storefront/Notifications/ProductModerationNotification.php`
- Modify: `tests/Feature/ProductUpdateRevertTest.php`

**Interfaces:**
- Produces: resource field `pending_changes` (`{field,label,before,after}[]`|null); notification event `update_reverted`.

- [ ] **Step 1: Write the failing tests**

Insert into `ProductUpdateRevertTest` before the `private function updateProduct` helper:

```php
    public function testAdminDetailExposesPendingChanges(): void
    {
        settings()->save(['product.updating_requires_review' => 1]);
        $admin = $this->createAdmin();
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'title' => 'Original',
            'price_cents' => 1000,
        ]);
        $product->files()->attach($file->id);

        $this->updateProduct($creator, $product, ['title' => 'Edited', 'price_cents' => 2000]);

        $response = $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/digital-products/{$product->id}");

        $response->assertOk();
        $changes = collect($response->json('data.pending_changes'));
        $this->assertNotNull($changes->firstWhere('field', 'title'));
        $this->assertSame('Original', $changes->firstWhere('field', 'title')['before']);
        $this->assertSame('Edited', $changes->firstWhere('field', 'title')['after']);
        $this->assertNotNull($changes->firstWhere('field', 'price_cents'));
    }

    public function testUpdateRevertedNotificationCopy(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, ['status' => 'approved', 'approved_at' => now()]);

        $notification = new \App\Storefront\Notifications\ProductModerationNotification(
            $product->id,
            'update_reverted',
            'Nope',
        );

        $this->assertStringContainsString(
            'previous version is still live',
            $notification->toMail($creator)->render(),
        );

        $payload = $notification->toDatabase($creator);
        $this->assertStringContainsString('previous version is still live', $payload['lines'][0]['content']);
        $this->assertStringContainsString('Nope', $payload['lines'][1]['content']);
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductUpdateRevertTest.php --filter=testAdminDetailExposesPendingChanges`
Expected: FAIL — `data.pending_changes` is missing.

- [ ] **Step 3: Add pending_changes to the resource**

In `app/Storefront/Resources/AdminDigitalProductResource.php`, add to `toArray()` (after `'history' => ...`):

```php
            'pending_changes' => $this->pendingChanges(),
```

Add these private methods to the class:

```php
    private function pendingChanges(): ?array
    {
        $snapshot = $this->pending_review_snapshot;

        if (!is_array($snapshot)) {
            return null;
        }

        $changes = [];

        $scalar = [
            'title' => __('Title'),
            'description' => __('Description'),
            'price_cents' => __('Price'),
            'type' => __('Type'),
        ];

        foreach ($scalar as $field => $label) {
            $before = $snapshot[$field] ?? null;
            $after = $this->{$field};

            if ((string) $before === (string) $after) {
                continue;
            }

            $changes[] = [
                'field' => $field,
                'label' => $label,
                'before' => $this->displayValue($before, $field),
                'after' => $this->displayValue($after, $field),
            ];
        }

        $beforeOutcomes = count($snapshot['learning_outcomes'] ?? []);
        $afterOutcomes = count($this->learning_outcomes ?? []);
        if ($beforeOutcomes !== $afterOutcomes) {
            $changes[] = [
                'field' => 'learning_outcomes',
                'label' => __('Learning outcomes'),
                'before' => (string) $beforeOutcomes,
                'after' => (string) $afterOutcomes,
            ];
        }

        if (($snapshot['cover_file_entry_id'] ?? null) !== $this->cover_file_entry_id) {
            $changes[] = [
                'field' => 'cover',
                'label' => __('Cover image'),
                'before' => __('Changed'),
                'after' => __('Changed'),
            ];
        }

        $beforeFiles = count($snapshot['file_ids'] ?? []);
        $afterFiles = $this->relationLoaded('files') ? $this->files->count() : $beforeFiles;
        if ($beforeFiles !== $afterFiles) {
            $changes[] = [
                'field' => 'files',
                'label' => __('Files'),
                'before' => (string) $beforeFiles,
                'after' => (string) $afterFiles,
            ];
        }

        return $changes === [] ? null : $changes;
    }

    private function displayValue(mixed $value, string $field): string
    {
        if ($value === null || $value === '') {
            return '—';
        }

        if ($field === 'price_cents') {
            return number_format(((int) $value) / 100, 2);
        }

        return \Illuminate\Support\Str::limit(trim(strip_tags((string) $value)), 120);
    }
```

- [ ] **Step 4: Add update_reverted to the notification**

In `app/Storefront/Notifications/ProductModerationNotification.php`:

- `isRejection()` → include `'update_reverted'`:
```php
    private function isRejection(): bool
    {
        return in_array($this->event, ['rejected', 'update_rejected', 'update_reverted'], true);
    }
```
- Add a `subject()` arm:
```php
            'update_reverted' => __('Your product update was rejected'),
```
- Add a `summary()` arm:
```php
            'update_reverted' => __('Your update to ":title" was rejected. Your previous version is still live.', ['title' => $product->title]),
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductUpdateRevertTest.php`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add app/Storefront/Resources/AdminDigitalProductResource.php \
        app/Storefront/Notifications/ProductModerationNotification.php \
        tests/Feature/ProductUpdateRevertTest.php
git commit -m "feat(admin): expose pending update changes and revert notification copy"
```

---

## Task 4: Admin detail Pending changes card

**Files:**
- Modify: `resources/client/admin/digital-products/admin-digital-product-detail-page.tsx`
- Modify: `resources/client/admin/digital-products/admin-product-detail.test.ts`

**Interfaces:**
- Consumes: `pending_changes` from the detail resource.

- [ ] **Step 1: Write the failing test**

Append to `resources/client/admin/digital-products/admin-product-detail.test.ts`:

```ts
describe('admin product pending changes', () => {
  test('renders a Pending changes card from the resource', () => {
    expect(page).toContain('<Trans message="Pending changes" />');
    expect(page).toContain('pending_changes');
    expect(page).toContain('change.before');
    expect(page).toContain('change.after');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- resources/client/admin/digital-products/admin-product-detail.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add the type and card**

In `resources/client/admin/digital-products/admin-digital-product-detail-page.tsx`:

Add to the `AdminProductDetail` type (after `has_pending_update?: boolean;`):

```ts
  pending_changes?: Array<{
    field: string;
    label: string;
    before: string;
    after: string;
  }> | null;
```

In `DetailsPanel`, insert this card as the first child of the main column (`<div className="space-y-4 lg:col-span-2">`), before the existing cover card:

```tsx
        {product.pending_changes && product.pending_changes.length > 0 && (
          <Card.Root>
            <Card.Header>
              <Card.Title>
                <Trans message="Pending changes" />
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-2 text-sm">
              {product.pending_changes.map(change => (
                <div
                  key={change.field}
                  className="flex flex-wrap items-baseline gap-2"
                >
                  <span className="font-medium">{change.label}</span>
                  <span className="text-muted-foreground line-through">
                    {change.before}
                  </span>
                  <span aria-hidden="true">→</span>
                  <span>{change.after}</span>
                </div>
              ))}
            </Card.Content>
          </Card.Root>
        )}
```

- [ ] **Step 4: Run the test and type-check**

Run: `npm run test -- resources/client/admin/digital-products/admin-product-detail.test.ts`
Expected: all pass.

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add resources/client/admin/digital-products/admin-digital-product-detail-page.tsx \
        resources/client/admin/digital-products/admin-product-detail.test.ts
git commit -m "feat(admin): show pending update changes on the product detail page"
```

---

## Task 5: Full verification

**Files:** none.

- [ ] **Step 1: Type-check** — `npx tsc --noEmit --skipLibCheck` → exit 0.
- [ ] **Step 2: Frontend tests** — `npm run test` → all pass.
- [ ] **Step 3: Build** — `npm run build` → `✓ built in ...`.
- [ ] **Step 4: Restore artifact** — `git restore public/build/manifest.json`.
- [ ] **Step 5: Backend tests** — `ddev exec ./vendor/bin/pest` → 0 failures.
- [ ] **Step 6: Report** the raw output and wait for approval before any PR.

---

## Self-Review Notes

- **Spec coverage:** snapshot column/capture (Task 1), revert-and-stay-live + fallback + `update_reverted` event (Task 2), `pending_changes` + notification copy (Task 3), admin Pending changes card (Task 4), verification (Task 5). Out-of-scope items (revision history, curriculum, per-field approval) have no tasks.
- **Type consistency:** snapshot keys used in Task 2 are exactly those written in Task 1 (`title, description, learning_outcomes, price_cents, currency, type, cover_file_entry_id, file_ids`). `update_reverted` is produced in Task 2, handled by the notification in Task 3, and asserted in tests.
- **Known deliberate detail:** `pending_changes` compares a display-truncated `description`, so a whitespace-only description change may not surface — acceptable for a diff summary.
