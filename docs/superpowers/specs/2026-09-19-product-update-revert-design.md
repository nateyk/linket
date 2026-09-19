# Product Update Revert Design

## Goal

When a creator edits a live product and an admin rejects that update, restore the
last approved content and keep the product live, instead of taking the product
offline with the unreviewed changes. Also let admins see what changed before
deciding.

## Background

Products are a single row mutated in place. When update review is on, an edit
keeps `status='approved'` and sets `review_requested_at`, so the new content is
live immediately (post-moderation). Today, rejecting such an update sets
`status='rejected'` — the product goes offline, and the last approved revision is
lost. `digital_product_review_events` is an audit trail but stores no content.

## Decisions

- **Snapshot storage:** a nullable JSON column `pending_review_snapshot` on
  `digital_products`, holding the last approved product-level content while a
  review is pending. No revision history (a later enhancement).
- **Revert-and-stay-live:** rejecting an update that has a snapshot restores the
  snapshot and keeps `status='approved'` (product stays served).
- **Scope:** product-level content only — `title`, `description`,
  `learning_outcomes`, `price_cents`, `currency`, `type`, `cover_file_entry_id`,
  and attached `file_ids`. Course **curriculum** (chapters/lessons/quizzes/
  resources) is not versioned.
- **Fallback:** rejecting an update with no snapshot (a first-time submission, or
  a course-curriculum-only change) keeps today's behavior — `status='rejected'`.
- **Diff:** the admin product detail shows a `pending_changes` list
  (`{field, label, before, after}`) derived from the snapshot vs the current row.

### Known caveat

A course that had **both** a product-field edit (snapshot taken) and a
curriculum edit in one review cycle will, on reject, revert only the
product-level fields and leave the curriculum change. Curriculum versioning is
out of scope.

## Data Model

`digital_products` gains:

```php
$table->json('pending_review_snapshot')->nullable()->after('review_requested_by');
```

`DigitalProduct`: add `pending_review_snapshot` to `$fillable` and cast to
`array`.

Snapshot shape:

```php
[
    'title' => string,
    'description' => ?string,
    'learning_outcomes' => ?array,
    'price_cents' => int,
    'currency' => string,
    'type' => string,
    'cover_file_entry_id' => ?int,
    'file_ids' => int[],
]
```

## Capture

In `DigitalProductMutationService::update()`, capture the product-level snapshot
**before** applying the edit:

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

`queueUpdateReviewIfNeeded()` receives the snapshot and stores it when it sets
the review flag (only the first edit of a cycle, because it returns early when
`review_requested_at !== null`):

```php
$product->update([
    'review_requested_at' => now(),
    'review_requested_by' => $actor?->id ?? $product->user_id,
    'pending_review_snapshot' => $snapshot,
]);
```

No snapshot is taken when update review is off, or for edits that do not queue a
review.

## Resolution

`AdminDigitalProductsController::decide()`:

- **Approve** (`approved` / `update_approved`): keep the new content; clear
  `pending_review_snapshot`.
- **Reject with a snapshot** (`status='approved'` + `pending_review_snapshot`):
  restore the snapshot fields, re-sync `file_ids` (filtered to file entries that
  still exist in the product's workspace), keep `status='approved'`, clear
  `rejection_reason`, `review_requested_at`, `review_requested_by`, and
  `pending_review_snapshot`; record event **`update_reverted`** with the reason
  and restored keys in `meta`; notify with event `update_reverted`.
- **Reject without a snapshot** (first-time submission or curriculum-only
  update): set `status='rejected'`, store the reason, clear the review flag and
  snapshot, record `update_rejected` (or `rejected`), as today.

`approved_at` and store placement are not touched by a revert.

### File restore

```php
$ids = FileEntry::query()
    ->whereIn('id', $snapshot['file_ids'] ?? [])
    ->where('workspace_id', $product->workspace_id)
    ->pluck('id')
    ->all();

$product->files()->sync($ids);
```

## Audit Events

The review-event vocabulary gains `update_reverted`. It records
`from_status = 'approved'`, `to_status = 'approved'`, the rejection `reason`, and
`meta.restored` (the field names restored).

## API

`AdminDigitalProductResource` gains `pending_changes`: an array of
`{field, label, before, after}` for fields that differ between the snapshot and
the current row, or `null` when there is no snapshot. Compared fields: `title`,
`description`, `price_cents`, `type`, `learning_outcomes` (rendered as counts),
`cover_file_entry_id` (rendered as changed/unchanged), and `file_ids` (rendered
as added/removed counts). Values are stringified/truncated (HTML stripped,
~120 chars) for display.

## Admin UI

`admin-digital-product-detail-page.tsx` renders a compact **Pending changes**
card above the Details content when `has_pending_update` and `pending_changes`
is non-empty, listing `label: before → after`. No new tab.

## Notifications

`ProductModerationNotification` learns `update_reverted`:

- `isRejection()` includes `update_reverted`.
- Subject: "Your product update was rejected".
- Summary: `Your update to "X" was rejected. Your previous version is still live.`
- Reason line included when present.
- Action: "Fix and resubmit" to the product edit page.

Dispatch is unchanged — the event string is passed through from `decide()`.

## Testing

New `tests/Feature/ProductUpdateRevertTest.php`:

1. First edit of an approved product (update review on) stores a snapshot; a
   second edit does not overwrite it; no snapshot when review is off.
2. Approving an update keeps the new content and clears the snapshot.
3. Rejecting an update with a snapshot restores title/description/price/
   learning outcomes/cover/`file_ids`, keeps `status='approved'`, keeps the
   product served by the public storefront endpoint, clears the flag and
   snapshot, records `update_reverted`, and notifies with `update_reverted`.
4. Rejecting an update with no snapshot falls back to `rejected` /
   `update_rejected`.
5. First-time submission reject is unchanged.
6. `pending_changes` is exposed on the admin detail resource with correct
   before/after values.
7. `ProductModerationNotification` renders `update_reverted` mail and in-app
   payloads (including the reason and escaping).

Frontend: a Vitest source-assertion test for the Pending changes card.

Full verification before any PR: `npx tsc --noEmit --skipLibCheck`,
`npm run test`, `npm run build`, `ddev exec ./vendor/bin/pest`, then
`git restore public/build/manifest.json`.

## Out of Scope

Revision history / multiple snapshots, course-curriculum versioning, per-field
approval, and reverting store placement.

## Risks

- **Capture ordering** — the snapshot must be read before the row is mutated;
  a test asserts the restored title differs from the rejected edit.
- **Deleted files** — restore filters `file_ids` to existing workspace file
  entries so a since-deleted file cannot break the sync.
- **Type changes** — reverting `type` is rare; accepted for v1.
- **Mixed course edit** — documented caveat above.
