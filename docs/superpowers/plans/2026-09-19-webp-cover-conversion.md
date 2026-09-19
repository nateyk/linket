# WebP Cover Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a product cover image is attached, convert it to WebP via a queued job and repoint the product's cover, keeping the original file.

**Architecture:** An admin-gated setting (`product.convert_covers_to_webp`, default on) plus a queued `ConvertProductCoverToWebp` job. The job race-guards on the current cover id, converts `jpg/jpeg/png/bmp` with GD, stores a new `linkImages` `FileEntry` (via `StoreFile` + `CreateFileEntry`), and repoints `cover_file_entry_id` conditionally. Dispatch happens after commit from the product create/update and course cover paths. Original entries are never deleted.

**Tech Stack:** Laravel 11 (PHP 8.2), GD WebP, queued jobs, Pest/PHPUnit; React/TS admin settings page, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-19-webp-cover-conversion-design.md`

## Global Constraints

- Work on branch `feat/webp-cover-conversion` (already created off `origin/main`).
- ddev project: run PHP/artisan/pest via `ddev exec` (e.g. `ddev exec ./vendor/bin/pest ...`).
- `Model::preventLazyLoading()` is active outside production (including tests) — eager-load or query; no lazy loads.
- Convert only `jpg`, `jpeg`, `png`, `bmp`; skip `webp`, `svg`, `gif`.
- Never delete the original cover `FileEntry`.
- Repoint the cover with a conditional update (`where cover_file_entry_id = <dispatch-time id>`) so concurrent changes are never clobbered.
- Dispatch the job **after** the surrounding DB transaction commits, by dispatching after `DB::transaction(...)` returns (not via `->afterCommit()`, which never fires under the test `DatabaseTransactions` wrapper).
- Do not touch or stage `NUL`, `public/build/manifest.json`, or the pre-existing `components.json` change.
- Verify before any PR: `npx tsc --noEmit --skipLibCheck`, `npm run test`, `npm run build`, `ddev exec ./vendor/bin/pest`, then `git restore public/build/manifest.json`.
- Do not commit, push, or open a PR unless the user explicitly asks.

---

## File Structure

**Create**
- `app/Storefront/Jobs/ConvertProductCoverToWebp.php`
- `app/Storefront/ProductCoverWebp.php` (dispatch helper)
- `tests/Feature/ProductSettingsWebpTest.php`
- `resources/client/admin/settings/product-settings-webp.test.ts`

**Modify**
- `app/Storefront/ProductSettings.php` (`convertsCoversToWebp()`)
- `resources/defaults/default-settings.php` (seed key)
- `app/Admin/ProductSettingsValidator.php` (add key to `KEYS`)
- `resources/client/admin/settings/product-settings.tsx` (switch)
- `app/Storefront/DigitalProductMutationService.php` (dispatch on create/update)
- `app/Courses/Controllers/CoursesController.php` (dispatch on cover change)

---

## Task 1: Setting and admin UI

**Files:**
- Modify: `app/Storefront/ProductSettings.php`
- Modify: `resources/defaults/default-settings.php`
- Modify: `app/Admin/ProductSettingsValidator.php`
- Modify: `resources/client/admin/settings/product-settings.tsx`
- Create: `resources/client/admin/settings/product-settings-webp.test.ts`

**Interfaces:**
- Produces: `ProductSettings::convertsCoversToWebp(): bool` (default `true`); setting key `product.convert_covers_to_webp`.

- [ ] **Step 1: Write the failing frontend test**

Create `resources/client/admin/settings/product-settings-webp.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve('resources/client/admin/settings/product-settings.tsx'),
  'utf8',
);

describe('product settings webp switch', () => {
  test('binds a convert-covers-to-webp toggle', () => {
    expect(source).toContain('client.product.convert_covers_to_webp');
    expect(source).toContain('<Trans message="Convert cover images to WebP" />');
    expect(source).toContain('convert_covers_to_webp');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- resources/client/admin/settings/product-settings-webp.test.ts`
Expected: FAIL — strings absent.

- [ ] **Step 3: Add the setting method and seed**

In `app/Storefront/ProductSettings.php`, add after `updatingRequiresReviewForCourse()`:

```php
    public function convertsCoversToWebp(): bool
    {
        return $this->settingEnabled('product.convert_covers_to_webp', true);
    }
```

In `resources/defaults/default-settings.php`, add after the `product.updating_requires_review` row:

```php
    ['name' => 'product.convert_covers_to_webp', 'value' => true],
```

In `app/Admin/ProductSettingsValidator.php`, add the key to `KEYS`:

```php
    const KEYS = ['product.min_price_cents', 'product.max_price_cents', 'product.allow_free_products', 'product.max_file_bytes', 'product.convert_covers_to_webp'];
```

- [ ] **Step 4: Add the UI switch**

In `resources/client/admin/settings/product-settings.tsx`:

Add to the `product?:` type (after `max_file_bytes`):

```ts
      convert_covers_to_webp?: string | number | boolean;
```

Add to `defaultValues` (after `max_file_bytes`):

```ts
          convert_covers_to_webp:
            data.client.product?.convert_covers_to_webp ?? 1,
```

In the Files `SettingsPanel`'s `Field.Group`, after the `client.product.max_file_bytes` field, add:

```tsx
          <HookForm.Field name="client.product.convert_covers_to_webp">
            <Field.Label>
              <NumericSwitch />
              <Trans message="Convert cover images to WebP" />
            </Field.Label>
            <Field.Description>
              <Trans message="When a product cover is attached, convert it to WebP for smaller images. The original file is kept." />
            </Field.Description>
          </HookForm.Field>
```

- [ ] **Step 5: Run the test and type-check**

Run: `npm run test -- resources/client/admin/settings/product-settings-webp.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit --skipLibCheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add app/Storefront/ProductSettings.php \
        resources/defaults/default-settings.php \
        app/Admin/ProductSettingsValidator.php \
        resources/client/admin/settings/product-settings.tsx \
        resources/client/admin/settings/product-settings-webp.test.ts
git commit -m "feat(settings): add convert-covers-to-webp product setting"
```

---

## Task 2: Conversion job

**Files:**
- Create: `app/Storefront/Jobs/ConvertProductCoverToWebp.php`
- Create: `tests/Feature/ProductSettingsWebpTest.php`

**Interfaces:**
- Consumes: `ProductSettings::convertsCoversToWebp()`; `Common\Files\Actions\StoreFile`, `Common\Files\Actions\CreateFileEntry`, `Common\Files\FileEntryPayload`.
- Produces: `ConvertProductCoverToWebp::__construct(int $productId, int $coverFileEntryId)`; `handle(): void`.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/ProductSettingsWebpTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Jobs\ConvertProductCoverToWebp;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\ProductSettings;
use Common\Files\FileEntry;
use Common\Settings\Models\Setting;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductSettingsWebpTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Setting::query()->where('name', 'like', 'product.%')->delete();
        settings()->loadSettings();
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testConvertsJpgCoverToWebpAndKeepsOriginal(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $cover = $this->createImageEntry($creator, $workspace, 'jpg');
        $product = $this->product($workspace, $creator, ['cover_file_entry_id' => $cover->id]);

        (new ConvertProductCoverToWebp($product->id, $cover->id))->handle();

        $fresh = $product->fresh();
        $this->assertNotSame($cover->id, $fresh->cover_file_entry_id);

        $newCover = FileEntry::query()->findOrFail($fresh->cover_file_entry_id);
        $this->assertSame('image/webp', $newCover->mime);
        $this->assertSame('webp', $newCover->extension);

        // Original is retained.
        $this->assertNotNull(FileEntry::query()->find($cover->id));
    }

    public function testDoesNothingWhenSettingDisabled(): void
    {
        settings()->save(['product.convert_covers_to_webp' => 0]);
        [$creator, $workspace] = $this->creatorContext();
        $cover = $this->createImageEntry($creator, $workspace, 'jpg');
        $product = $this->product($workspace, $creator, ['cover_file_entry_id' => $cover->id]);

        (new ConvertProductCoverToWebp($product->id, $cover->id))->handle();

        $this->assertSame($cover->id, $product->fresh()->cover_file_entry_id);
    }

    public function testSkipsAlreadyWebpCover(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $cover = FileEntry::query()->create([
            'name' => 'cover.webp',
            'file_name' => 'cover.webp',
            'mime' => 'image/webp',
            'extension' => 'webp',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
            'upload_type' => 'linkImages',
            'public' => true,
        ]);
        $product = $this->product($workspace, $creator, ['cover_file_entry_id' => $cover->id]);

        (new ConvertProductCoverToWebp($product->id, $cover->id))->handle();

        $this->assertSame($cover->id, $product->fresh()->cover_file_entry_id);
    }

    public function testRaceGuardDoesNotClobberANewerCover(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $first = $this->createImageEntry($creator, $workspace, 'jpg');
        $second = $this->createImageEntry($creator, $workspace, 'jpg');
        $product = $this->product($workspace, $creator, ['cover_file_entry_id' => $second->id]);

        // Job was dispatched for $first, but the cover is now $second.
        (new ConvertProductCoverToWebp($product->id, $first->id))->handle();

        $this->assertSame($second->id, $product->fresh()->cover_file_entry_id);
    }

    public function testDefaultConversionIsEnabled(): void
    {
        Setting::query()->where('name', 'product.convert_covers_to_webp')->delete();
        settings()->loadSettings();

        $this->assertTrue(app(ProductSettings::class)->convertsCoversToWebp());
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

    private function createImageEntry(User $creator, Workspace $workspace, string $extension): FileEntry
    {
        $image = imagecreatetruecolor(12, 12);
        imagefilledrectangle($image, 0, 0, 12, 12, imagecolorallocate($image, 200, 20, 20));

        ob_start();
        $extension === 'png' ? imagepng($image) : imagejpeg($image);
        $bytes = ob_get_clean();
        imagedestroy($image);

        $response = $this->stateful()->actingAs($creator)->post('/api/v1/file-entries', [
            'file' => UploadedFile::fake()->createWithContent("cover.{$extension}", $bytes),
            'workspaceId' => $workspace->id,
            'uploadType' => 'linkImages',
        ]);
        $response->assertOk();

        return FileEntry::query()->findOrFail($response->json('fileEntry.id'));
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

- [ ] **Step 2: Run the tests to verify they fail**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductSettingsWebpTest.php`
Expected: FAIL — class `ConvertProductCoverToWebp` not found.

- [ ] **Step 3: Create the job**

Create `app/Storefront/Jobs/ConvertProductCoverToWebp.php`:

```php
<?php

namespace App\Storefront\Jobs;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\ProductSettings;
use Common\Files\Actions\CreateFileEntry;
use Common\Files\Actions\StoreFile;
use Common\Files\FileEntry;
use Common\Files\FileEntryPayload;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Intervention\Image\ImageManager;

class ConvertProductCoverToWebp implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        public int $productId,
        public int $coverFileEntryId,
    ) {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        if (!app(ProductSettings::class)->convertsCoversToWebp() || !extension_loaded('gd')) {
            return;
        }

        $product = DigitalProduct::query()->find($this->productId);
        if (!$product || $product->cover_file_entry_id !== $this->coverFileEntryId) {
            return;
        }

        $entry = FileEntry::query()->find($this->coverFileEntryId);
        if (
            !$entry ||
            $entry->upload_type !== 'linkImages' ||
            !str_starts_with((string) $entry->mime, 'image/') ||
            !in_array(strtolower((string) $entry->extension), ['jpg', 'jpeg', 'png', 'bmp'], true)
        ) {
            return;
        }

        try {
            $webp = $this->convert($entry);
            if ($webp === null) {
                return;
            }

            $newEntry = $this->store($entry, $webp);

            DigitalProduct::query()
                ->whereKey($this->productId)
                ->where('cover_file_entry_id', $this->coverFileEntryId)
                ->update(['cover_file_entry_id' => $newEntry->id]);
        } catch (\Throwable $e) {
            Log::error('Failed to convert product cover to WebP', [
                'product_id' => $this->productId,
                'file_entry_id' => $this->coverFileEntryId,
                'message' => $e->getMessage(),
            ]);
        }
    }

    private function convert(FileEntry $entry): ?string
    {
        $contents = $entry->getDisk()->get($entry->getStoragePath());
        if ($contents === null || $contents === false) {
            return null;
        }

        try {
            return (string) ImageManager::gd()
                ->read($contents)
                ->toWebp(quality: 82);
        } catch (\Throwable) {
            return null;
        }
    }

    private function store(FileEntry $entry, string $webp): FileEntry
    {
        $payload = new FileEntryPayload([
            'uploadType' => 'linkImages',
            'type' => 'file',
            'clientName' => pathinfo($entry->name, PATHINFO_FILENAME) . '.webp',
            'clientMime' => 'image/webp',
            'clientExtension' => 'webp',
            'size' => strlen($webp),
            'workspaceId' => $entry->workspace_id,
            'ownerId' => $entry->owner_id,
        ]);

        $tmp = tempnam(sys_get_temp_dir(), 'webp');
        file_put_contents($tmp, $webp);

        try {
            (new StoreFile())->execute($payload, ['file' => new \Illuminate\Http\File($tmp)]);
        } finally {
            @unlink($tmp);
        }

        return (new CreateFileEntry())->execute($payload);
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductSettingsWebpTest.php`
Expected: 5 passed.

If the created entry's disk path/visibility diverges from a normal `linkImages` upload, compare against `FileEntriesController::store` and adjust the `FileEntryPayload`/`StoreFile` call (the goal is an entry indistinguishable from an uploaded public linkImage).

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/Jobs/ConvertProductCoverToWebp.php tests/Feature/ProductSettingsWebpTest.php
git commit -m "feat(products): convert attached cover images to webp"
```

---

## Task 3: Dispatch on cover attach

**Files:**
- Create: `app/Storefront/ProductCoverWebp.php`
- Modify: `app/Storefront/DigitalProductMutationService.php`
- Modify: `app/Courses/Controllers/CoursesController.php`
- Modify: `tests/Feature/ProductSettingsWebpTest.php`

**Interfaces:**
- Consumes: `ConvertProductCoverToWebp`.
- Produces: `ProductCoverWebp::dispatchFor(DigitalProduct $product): void`.

- [ ] **Step 1: Write the failing tests**

Insert into `ProductSettingsWebpTest` before the `private function product(...)` helper:

```php
    public function testCreateWithCoverDispatchesConversion(): void
    {
        Queue::fake();
        [$creator, $workspace] = $this->creatorContext();
        $cover = $this->createImageEntry($creator, $workspace, 'jpg');

        $this->stateful()->actingAs($creator)->postJson('/api/v1/digital-products', [
            'title' => 'With Cover',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'file_ids' => [$this->createPdfEntry($creator, $workspace)->id],
            'cover_file_entry_id' => $cover->id,
        ])->assertCreated();

        Queue::assertPushed(ConvertProductCoverToWebp::class);
    }

    public function testUpdateWithoutCoverChangeDoesNotDispatch(): void
    {
        Queue::fake();
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createPdfEntry($creator, $workspace);
        $product = $this->product($workspace, $creator);
        $product->files()->attach($file->id);

        $this->stateful()->actingAs($creator)->putJson("/api/v1/digital-products/{$product->id}", [
            'title' => 'Renamed',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'file_ids' => [$file->id],
        ])->assertOk();

        Queue::assertNotPushed(ConvertProductCoverToWebp::class);
    }

    public function testUpdateChangingCoverDispatchesConversion(): void
    {
        Queue::fake();
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createPdfEntry($creator, $workspace);
        $cover = $this->createImageEntry($creator, $workspace, 'jpg');
        $product = $this->product($workspace, $creator);
        $product->files()->attach($file->id);

        $this->stateful()->actingAs($creator)->putJson("/api/v1/digital-products/{$product->id}", [
            'title' => $product->title,
            'price_cents' => 1000,
            'currency' => 'ETB',
            'file_ids' => [$file->id],
            'cover_file_entry_id' => $cover->id,
        ])->assertOk();

        Queue::assertPushed(ConvertProductCoverToWebp::class);
    }

    private function createPdfEntry(User $creator, Workspace $workspace): FileEntry
    {
        return FileEntry::query()->create([
            'name' => 'guide.pdf',
            'file_name' => 'guide.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 1024,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
            'upload_type' => 'digitalProductFiles',
        ]);
    }
```

Add `use App\Storefront\Jobs\ConvertProductCoverToWebp;` (already present) and `use Illuminate\Support\Facades\Queue;` to the test imports.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductSettingsWebpTest.php --filter=testCreateWithCoverDispatchesConversion`
Expected: FAIL — nothing dispatched.

- [ ] **Step 3: Create the dispatch helper**

Create `app/Storefront/ProductCoverWebp.php`:

```php
<?php

namespace App\Storefront;

use App\Storefront\Jobs\ConvertProductCoverToWebp;
use App\Storefront\Models\DigitalProduct;

final class ProductCoverWebp
{
    public function dispatchFor(DigitalProduct $product): void
    {
        if (!$product->cover_file_entry_id) {
            return;
        }

        ConvertProductCoverToWebp::dispatch($product->id, $product->cover_file_entry_id);
    }
}
```

- [ ] **Step 4: Wire the product create/update paths**

In `app/Storefront/DigitalProductMutationService.php`, dispatch after the transaction so tests and production both run the job post-commit.

In `create()`, change the shape from `return DB::transaction(...)` to:

```php
        $product = DB::transaction(function () use ($data, $creator, $maxUploadBytes): DigitalProduct {
            // ...existing body unchanged...
            return $product->fresh()->load(['files', 'cover', 'biolinks', 'course']);
        });

        app(ProductCoverWebp::class)->dispatchFor($product);

        return $product;
```

In `update()`, capture the cover before the transaction and dispatch only when it changed:

```php
    public function update(DigitalProduct $product, array $data, ?int $maxUploadBytes, ?User $actor = null): DigitalProduct
    {
        $coverBefore = $product->cover_file_entry_id;

        $updated = DB::transaction(function () use ($product, $data, $maxUploadBytes, $actor): DigitalProduct {
            // ...existing body unchanged, ending with:
            return $product->fresh()->load(['files', 'cover', 'biolinks', 'course']);
        });

        if ($updated->cover_file_entry_id && $updated->cover_file_entry_id !== $coverBefore) {
            app(ProductCoverWebp::class)->dispatchFor($updated);
        }

        return $updated;
    }
```

- [ ] **Step 5: Wire the course cover path**

In `app/Courses/Controllers/CoursesController.php`, the `update()` method wraps its work in `DB::transaction(...)`. Capture the cover before the transaction and dispatch after it commits, comparing the final cover:

```php
        $coverBefore = $course->product->cover_file_entry_id;

        $result = DB::transaction(function () use (/* existing captures */) {
            // ...existing body unchanged, including the review block...
            // ...return the existing value...
        });

        $product = $course->product()->first();
        if ($product && $product->cover_file_entry_id && $product->cover_file_entry_id !== $coverBefore) {
            app(\App\Storefront\ProductCoverWebp::class)->dispatchFor($product);
        }

        return $result;
```

Adapt the variable names/return to the method's existing shape. The job itself is idempotent (it converts only non-WebP covers) and race-guarded.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `ddev exec ./vendor/bin/pest tests/Feature/ProductSettingsWebpTest.php`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add app/Storefront/ProductCoverWebp.php \
        app/Storefront/DigitalProductMutationService.php \
        app/Courses/Controllers/CoursesController.php \
        tests/Feature/ProductSettingsWebpTest.php
git commit -m "feat(products): dispatch webp conversion when a cover is attached"
```

---

## Task 4: Full verification

**Files:** none.

- [ ] **Step 1: Type-check** — `npx tsc --noEmit --skipLibCheck` → exit 0.
- [ ] **Step 2: Frontend tests** — `npm run test` → all pass.
- [ ] **Step 3: Build** — `npm run build` → `✓ built in ...`.
- [ ] **Step 4: Restore artifact** — `git restore public/build/manifest.json`.
- [ ] **Step 5: Backend tests** — `ddev exec ./vendor/bin/pest` → 0 failures.
- [ ] **Step 6: Report** the raw output and wait for approval before any PR.

---

## Self-Review Notes

- **Spec coverage:** setting + seed + UI (Task 1); job with race guard, type skipping, GD conversion, new FileEntry, conditional repoint, original retained (Task 2); dispatch on create/update/course (Task 3); verification (Task 4). Out-of-scope items (bio images, in-place replacement, deleting originals, animation) have no tasks.
- **Type consistency:** `ConvertProductCoverToWebp(int $productId, int $coverFileEntryId)` is constructed identically in the helper and tests; `ProductCoverWebp::dispatchFor(DigitalProduct)` is the only dispatch entry point.
- **Known deliberate detail:** the job builds the new `FileEntry` via `FileEntryPayload` + `StoreFile` + `CreateFileEntry`; if disk/visibility diverges from a normal `linkImages` upload, mirror `FileEntriesController::store` exactly.
