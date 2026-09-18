# Product Approval Pipeline Design

## Goal

Make the digital-product review lifecycle correct, auditable, and able to
distinguish an unreviewed **update** to a live product from a brand-new
submission. This is the foundation for the admin product detail/History view
and the nested Products → All / Updated admin navigation that follow.

## Background

Products move through a single `status` column:

```
create ──> draft
draft|rejected ──submit──> pending_approval ──approve──> approved
                                          └───reject───> rejected
approved ──creator edit──> draft   (only when updating_requires_review is on)
```

The storefront serves `status = 'approved'` only
(`app/Storefront/PublicDigitalProducts.php`).

Three problems were confirmed by audit:

1. **Policy bypass.** Update demotion is gated by
   `ProductSettings::updatingRequiresReview()`
   (`app/Storefront/DigitalProductMutationService.php:53`), but re-submission is
   gated by `addingRequiresReview()` (`app/Storefront/Controllers/DigitalProductsController.php`
   `submit()`). With `adding_requires_review = 0` and
   `updating_requires_review = 1`, editing a live product (which demotes it to
   `draft`) followed by Submit auto-approves the unreviewed change. Course
   submission has the same conflation through
   `addingRequiresReviewForCourse()`. Existing tests vary only one setting at a
   time, so the combination is untested.
2. **Silent storefront removal.** Editing a live product with update review on
   immediately demotes it to `draft` (and, for courses, unpublishes it), so it
   disappears from the storefront and checkout 404s before any reviewer acts.
   There is no admin queue for it and no notification to the creator.
3. **No history and no "Updated" state.** Nothing records who approved,
   rejected, or edited, or when. A new submission and a re-submission of a
   previously-approved product both sit in `pending_approval`, indistinguishable.
   `rejection_reason` is overwritten each cycle and `approved_at` is never
   cleared.

## Decisions

- **Post-moderation.** When a live product is edited and update review is on,
  the edited product **stays live and sellable** while it waits for review.
  Approving clears the flag; rejecting takes it offline.
- **State model A: flag + event table.** `status` remains the first-approval
  lifecycle. Unreviewed edits are carried by a nullable flag on the product.
  History is carried by a dedicated event table. No content versioning and no
  separate `review_state` enum (rejected as larger blast radius).
- Unreviewed edits on a live product auto-queue for review on save. A creator
  does not perform a second "submit" action for updates.

## Data Model

### `digital_products` (additive columns)

| Column | Type | Notes |
| --- | --- | --- |
| `review_requested_at` | timestamp, nullable, indexed | Non-null means an update to an approved product is awaiting review. |
| `review_requested_by` | foreign id `users`, nullable | Creator who triggered the update review. |

`approved_at` keeps its meaning: the most recent approval. It is **not** cleared
on update or reject, so `approved_at !== null` means "was approved at least
once". That is the signal used to choose the update review policy in `submit()`.

No backfill is required; existing rows have `review_requested_at = null`.

### `digital_product_review_events` (new)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | |
| `digital_product_id` | foreign id, cascade delete, indexed | |
| `actor_id` | foreign id `users`, nullable | Null for system events. |
| `actor_role` | string | `creator`, `admin`, or `system`. |
| `event` | string, indexed | See event list below. |
| `from_status` | string, nullable | Status before the event. |
| `to_status` | string, nullable | Status after the event. |
| `reason` | text, nullable | Rejection reason, when applicable. |
| `meta` | json, nullable | e.g. `{"changed": ["title", "price_cents"]}`. |
| `created_at` | timestamp | No `updated_at`; events are immutable. |

Composite index `(digital_product_id, created_at)`.

Events: `created`, `updated`, `submitted`, `update_submitted`, `approved`,
`rejected`, `update_approved`, `update_rejected`.

## State Machine

| From | Trigger | Condition | To |
| --- | --- | --- | --- |
| — | creator creates | — | `draft` |
| `draft` / `rejected` | creator submits | never approved, adding review on | `pending_approval` |
| `draft` / `rejected` | creator submits | never approved, adding review off | `approved` |
| `draft` / `rejected` | creator submits | was approved, update review on | `pending_approval` |
| `draft` / `rejected` | creator submits | was approved, update review off | `approved` |
| `approved` | creator edits | update review on | `approved` + flag set (stays live) |
| `approved` | creator edits | update review off | `approved`, no flag |
| `pending_approval` / `rejected` | creator edits | — | unchanged |
| `pending_approval` | admin approve / reject | — | `approved` / `rejected` (+reason) |
| `approved` + flag | admin approve-update | — | `approved`, flag cleared, `approved_at = now` |
| `approved` + flag | admin reject-update | — | `rejected`, flag cleared, +reason (offline) |

Definitions used above:

- **was approved** = `approved_at !== null`.
- **adding review** = `addingRequiresReview()`; for courses also
  `config('store.courses_require_approval')`.
- **update review** = `updatingRequiresReview()`; for courses also
  `config('store.courses_require_approval')`.

"Updated Items" (admin) = `status = 'approved' AND review_requested_at IS NOT NULL`.

## Backend Changes

### Models

- `App\Storefront\Models\DigitalProduct`:
  - add `review_requested_at`, `review_requested_by` to `$fillable`;
  - cast `review_requested_at` to `datetime`;
  - add `reviewRequestedBy(): BelongsTo` (users) and `events(): HasMany`;
  - add `hasPendingUpdate(): bool`.
- New `App\Storefront\Models\DigitalProductReviewEvent`.

### Audit writer

New `App\Storefront\ProductReviewHistory` service with a single method:

```php
public function record(
    DigitalProduct $product,
    string $event,
    ?string $from,
    ?string $to,
    ?User $actor,
    ?string $reason = null,
    array $meta = [],
): void;
```

`actor_role` is `admin` for admin endpoints, `creator` for creator endpoints,
and `system` when the actor is null. Every state change records an event inside
the same database transaction as the state change.

### Mutation service

`App\Storefront\DigitalProductMutationService`:

- `create()` records `created` (`from = null`, `to = draft`).
- `update()`:
  - receives the acting user (`?User $actor`) in addition to existing
    arguments;
  - **removes the `approved → draft` demotion**;
  - when `status === 'approved'` and update review is on, sets
    `review_requested_at = now` and `review_requested_by` **only if the flag is
    not already set** (one queue entry per review cycle), leaving `status`
    `approved`;
  - always records `updated` with `meta.changed` listing the changed keys.

### Creator controller

`App\Storefront\Controllers\DigitalProductsController`:

- `submit()` chooses the policy from `approved_at !== null`:
  `updatingRequiresReview()` when previously approved, otherwise
  `addingRequiresReview()` (courses OR `courses_require_approval`). This is the
  fix for the policy bypass.
- `submit()` records `submitted` when the product was never approved and
  `update_submitted` otherwise.
- `update()` passes the acting user to the mutation service.

### Course flow

- `App\Courses\Controllers\CoursesController::update()` and
  `App\Courses\Services\CourseService::revertApprovalForContentChange()` set the
  review flag instead of demoting to `draft` / unpublishing. The course remains
  published and sellable while its edit awaits review; record `updated`.

### Admin controller

`App\Storefront\Controllers\AdminDigitalProductsController`:

- `index()` accepts `scope=updated`, which forces
  `status = 'approved' AND review_requested_at IS NOT NULL` and composes with
  search, sort, and pagination. Adds an `updated` counter to `meta.counters`.
- `approve()` is allowed when `status === 'pending_approval'` **or**
  (`status === 'approved'` and the flag is set). The update path clears
  `review_requested_at` / `review_requested_by`, sets `approved_at = now`, and
  records `update_approved`; the initial path records `approved`.
- `reject()` is broadened the same way. The update path sets
  `status = 'rejected'`, clears the flag, stores the reason, and records
  `update_rejected`; the initial path records `rejected`.
- Both run in `DB::transaction` and return the fresh product with
  `creator`, `cover`, `files`, and `biolinks`.

### Resource

`App\Storefront\Resources\DigitalProductResource` exposes
`review_requested_at` and `has_pending_update`.

### Routes

No new routes in this change.

## Frontend Changes

- **Creator dashboard** (`resources/client/dashboard/digital-products/digital-products-page.tsx`):
  add an "Update under review" badge for `status === 'approved' &&
  has_pending_update`. Submit remains limited to `draft` / `rejected`.
- **Admin list** (`resources/client/admin/digital-products/`):
  - `admin-digital-products-queries.ts` passes the `scope` param through;
  - `admin-digital-products-page.tsx` adds an "Updates pending" metric card
    sourced from `meta.counters.updated`, which sets `scope=updated`;
  - the columns file shows the approve/reject actions for `approved + flag` rows
    and a small "Update" badge beside the status;
  - `AdminDigitalProduct` (local type) gains `review_requested_at` and
    `has_pending_update`.
- The nested Products → All / Updated sidebar navigation is **out of scope**
  here; the API supports it and it ships with the detail view.

## Out of Scope

- Admin product detail / History page (uses the event table, next change).
- Nested Products sidebar (All Products / Updated Products).
- Creator notifications on approve/reject.
- Bulk approve/reject.
- Content versioning / reverting to a previous revision.

## Testing

Pest feature tests (new `ProductUpdateReviewPolicyTest`):

1. `adding_requires_review = 0`, `updating_requires_review = 1`: editing an
   approved product keeps it `approved` and sets the flag; the storefront still
   lists it; `scope=updated` includes it.
2. `adding_requires_review = 1`, `updating_requires_review = 0`: editing an
   approved product keeps it `approved` with no flag.
3. Update rejected: product becomes `rejected`, flag cleared, reason stored,
   removed from the storefront; a creator edit + submit then uses the update
   policy (with adding review off) and lands in `pending_approval` — proving the
   bypass is fixed.
4. A never-approved product still uses the adding policy (with adding review
   off, submit auto-approves) — proving the fix does not over-gate first-time
   submissions.
5. Audit rows are written for `created`, `submitted`, `approved`, `rejected`,
   `updated`, `update_approved`, and `update_rejected` with the correct
   `actor_role`.
6. Course lesson edit with update review on stays `approved` + published + flag;
   with review off it stays `approved` with no flag.
7. Admin index `updated` counter and `scope=updated` filtering.

Update the two now-stale assertions in
`tests/Feature/ProductSettingsReviewPolicyTest`:
`testUpdateRevertsToDraftWhenUpdatingReviewEnabled` and
`testDefaultsRequireReview` change from expecting `draft` after an edit to
expecting `approved` plus the flag.

Vitest: admin `scope`/`updated` counter mapping and the creator "Update under
review" badge.

Full verification required before commit: `tsc`, `vitest`, `build`, full `pest`,
restoring `public/build/manifest.json`.

## Rollout and Risk

- One additive migration and one new table; no data backfill.
- The behavioral change is the removal of the `approved → draft` demotion.
  Accepted trade-off: a bad edit stays purchasable until an admin acts
  (post-moderation).
- Branch `feat/product-approval-pipeline` off `origin/main`; PR only, merged
  only with explicit approval.
