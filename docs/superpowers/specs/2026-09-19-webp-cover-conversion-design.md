# WebP Cover Conversion Design

## Goal

Convert a digital product's cover image to WebP when it is attached, so
storefronts serve smaller images, without changing bio/link images or
destroying the original file.

## Background

- A product cover is `digital_products.cover_file_entry_id`, a `FileEntry`
  whose `upload_type` is `linkImages`.
- `linkImages` is **shared** with biolink/link images (`config/filesystems.php`),
  so conversion cannot be targeted at upload time for covers alone.
- The host supports WebP (`gd_info()['WebP Support'] === true` and the Imagick
  extension is present).
- The repository already ships **`intervention/image` v3** (used as the encoder;
  no new dependency).
- The product-update-revert change snapshots `cover_file_entry_id`, so the
  original cover file must survive conversion or a revert would point at a
  missing file.

## Decisions

- **Attach-time queued job.** When a cover is set/changed on a product, a queued
  job converts it and repoints the product cover.
- **New FileEntry, original kept.** The WebP is stored as a new `linkImages`
  FileEntry in the same workspace; the product cover is repointed to it. The
  original entry is never deleted.
- **Admin-controlled, default ON.** `product.convert_covers_to_webp` gates the
  job; default `true`, seeded like the other product settings.
- **Raster only.** Convert `jpg`, `jpeg`, `png`, `bmp`. Skip `webp` (already),
  `svg` (vector), and `gif` (animation cannot be preserved by GD). If the GD
  extension (or WebP encoding) is unavailable the job no-ops.

## Setting

`resources/defaults/default-settings.php`:

```php
['name' => 'product.convert_covers_to_webp', 'value' => true],
```

`App\Storefront\ProductSettings`:

```php
public function convertsCoversToWebp(): bool
{
    return $this->settingEnabled('product.convert_covers_to_webp', true);
}
```

Admin UI: a switch on Admin → Settings → Product (Images/Files panel), using the
existing `NumericSwitch` pattern, bound to `client.product.convert_covers_to_webp`.

## Job

`App\Storefront\Jobs\ConvertProductCoverToWebp` — queued (`ShouldQueue`),
`tries = 3`, `backoff [60, 300, 900]`, `onQueue('default')`.

```php
public function __construct(
    public int $productId,
    public int $coverFileEntryId,
) {}
```

`handle()`:

1. Return unless `app(ProductSettings::class)->convertsCoversToWebp()`.
2. Load the product; return if missing.
3. **Race guard:** return if `$product->cover_file_entry_id !== $this->coverFileEntryId`
   (the cover changed after this job was dispatched).
4. Load the `FileEntry`; return unless it exists, is an image (`str_starts_with($mime, 'image/')`),
   and its lowercase extension is in `['jpg', 'jpeg', 'png', 'bmp']`.
5. Return unless `extension_loaded('gd')`.
6. Read the bytes from the entry's disk (`$entry->getDisk()->get($entry->getStoragePath())`).
   Return if the read fails.
7. Encode with `intervention/image` v3: `ImageManager::gd()->read($bytes)->toWebp(quality: 82)`
   cast to string. Return if decoding/encoding throws.
8. Store the bytes and create a new FileEntry via the existing upload actions,
   mirroring `FileEntriesController::store` (`FileEntryPayload` → `StoreFile` with
   `['contents' => $webp]` → `CreateFileEntry`): same `workspace_id`, `owner_id`,
   `upload_type = 'linkImages'`, public visibility, name `<original name>.webp`,
   extension `webp`, mime `image/webp`, size `strlen($webp)`.
9. Repoint the cover with a conditional update so a concurrent cover change is
   never clobbered:

```php
DigitalProduct::query()
    ->whereKey($this->productId)
    ->where('cover_file_entry_id', $this->coverFileEntryId)
    ->update(['cover_file_entry_id' => $newEntry->id]);
```

10. Do not delete the original entry.

Failures are caught and logged (`Log::error`) rather than thrown, so a bad image
never leaves a failed job spamming the queue; unexpected exceptions may still
retry via the queue.

## Dispatch

One helper, e.g. `App\Storefront\ProductCoverWebp::dispatchFor(DigitalProduct $product): void`,
which dispatches the job with the product's current cover id when a cover is set.

Called after the mutation commits in:

- `DigitalProductMutationService::create()` — when the created product has a cover.
- `DigitalProductMutationService::update()` — when the cover was newly set or changed.
- `CoursesController::update()` — when the course product's cover changed.

Use `->afterCommit()` (or dispatch after the surrounding transaction) so the job
only runs once the cover reference persists.

## Testing

`tests/Feature/ProductSettingsWebpTest.php`:

1. **Converts a JPG cover:** create an approved product with a JPG `linkImages`
   cover and run the job; assert a new `linkImages` FileEntry exists with
   `mime = 'image/webp'` and extension `webp`, the product cover id points at it,
   and the **original entry still exists**.
2. **Setting off:** with `product.convert_covers_to_webp = 0` the job is a no-op
   (cover unchanged, no new entry).
3. **Skipped types:** a WebP, SVG, or GIF cover is left unchanged.
4. **Race guard:** if the product's cover changes after dispatch, the job does not
   repoint (cover id stays the newer value).
5. **Dispatch:** creating a product with a JPG cover pushes the job
   (`Queue::fake` + `assertPushed`); updating without changing the cover does not.
6. **Default:** `convertsCoversToWebp()` is true when the setting row is absent.

A minimal in-test JPG fixture is generated with GD (`imagecreatetruecolor` +
`imagejpeg`) and attached as a real `FileEntry` file on the test disk, or via the
upload endpoint; the plan will pick the smallest reliable construction.

Frontend: a Vitest source-assertion test that the Product settings page renders
the WebP switch bound to `client.product.convert_covers_to_webp`.

Full verification before any PR: `npx tsc --noEmit --skipLibCheck`,
`npm run test`, `npm run build`, `ddev exec ./vendor/bin/pest`, then
`git restore public/build/manifest.json`.

## Dependencies / Assumptions

- The product-update-revert change (PR #29) snapshots `cover_file_entry_id`.
  Keeping originals makes this WebP change compatible with it; the explicit
  "revert after conversion" test is added once #29 is on `main`.

## Out of Scope

Converting biolink/link images, in-place file replacement, deleting originals,
animated GIF→WebP, client-side conversion, resizing/cropping, and converting
non-cover product images.

## Risks

- **Payload construction:** the new FileEntry must match the upload pipeline's
  disk/prefix/visibility; the plan mirrors `FileEntriesController::store`.
- **Storage growth:** originals are retained (required for revert), so a converted
  cover uses additional space; this is bounded to cover images.
- **Remote disks:** reading bytes through `$entry->getDisk()` works for local and
  cloud disks; network failures are logged and retried.
