# Digital Product Reviews & Ratings — Design

Date: 2026-08-12
Status: Approved
Scope: Storefront (digital products) — public buyer reviews, creator read view, admin moderation.

## Goal

Buyers who purchased a digital product can leave a 1–5 star review (title + optional body) on the product's public page. Reviews appear immediately and are displayed as social proof for other buyers. Admins can hide/unhide/delete reviews after the fact. Creators can read reviews on their own products (no replies, no delete). Reviews are removed when the underlying order is fully refunded.

## Decisions

- **Single 1–5 star rating** (diget reference pattern), not multi-dimensional.
- **Immediate visibility** with an `approved` flag (default true) — admin can hide later.
- **No seller replies** — reviews are read-only for creators.
- **Custom implementation** (Approach A), not `codebyray/laravel-review-rateable`:
  - Single-star + no-reply scope makes the package's polymorphism/multi-ratings/departments overkill.
  - Package's `user_id`-based auth does not fit the guest-buyer recovery-cookie model.
  - No dependency on a brand-new v2 rewrite; mirrors diget reference.
- **Buyer verification via existing order-recovery session** (`OrderRecoveryService` cookie, used by `/find-my-purchase/orders` and downloads). Review is tied to a paid `storefront_order_id`, so purchase eligibility is enforced by the FK + status check.
- **Entry point**: public product page, with inline "Verify your purchase" (order UUID + buyer email) fallback when no recovery cookie exists. No post-purchase email follow-up and no success-page form (kept out for simplicity).
- **Notification**: email to the product creator on every new review (queued, mirrors `SendStorefrontReceipt`).
- **Remove on refund**: on full refund, delete the review for that order (inside `DigitalProductRefundService::record()`, which already detects `$isFull`).

## Section 1 — Data Model

New table `product_reviews` in `App\Storefront\Models`:

| column | type | notes |
|---|---|---|
| id | bigint unsigned PK | |
| digital_product_id | bigint unsigned FK -> digital_products (cascade) | |
| storefront_order_id | bigint unsigned FK -> storefront_orders (cascade) | ties review to a paid order |
| workspace_id | int unsigned | denormalized for cheap workspace scoping |
| buyer_email | varchar(254) | copied from order, display + uniqueness |
| buyer_name | varchar(120) nullable | copied from order |
| stars | tinyint | 1..5 |
| title | varchar(120) | |
| body | text nullable | max ~2000 chars |
| approved | boolean default true | hide-later moderation |
| hidden_reason | varchar(255) nullable | |
| hidden_by | int unsigned nullable FK -> users | |
| hidden_at | timestamp nullable | |
| created_at / updated_at | timestamps | |

Constraints: `UNIQUE (storefront_order_id)` (one review per paid order); `INDEX (digital_product_id, approved, created_at)`; `INDEX (workspace_id)`.

Denormalized counters on `digital_products`:
- `reviews_count int default 0` — count of approved reviews
- `reviews_avg decimal(3,2) default 0` — average stars over approved reviews

Updated by `ProductReview` model boot events (created/updated/deleted), mirroring diget `ItemReview::updateItemAndAuthorReviews()`.

Authorization to post a review: existing `OrderRecoveryService::current($request)` cookie session; order must belong to this product and be `status=paid`. If no cookie, buyer verifies via order UUID + buyer_email using `OrderRecoveryService::request/redeem` (existing flow), then posts.

Full refund → delete review for `storefront_order_id` (added to `DigitalProductRefundService::record()`).

## Section 2 — API & Backend

Controllers in `App\Storefront\Controllers`:

### 1. `ProductReviewsController` — public read + verified buyer posting (routes in `routes/api.php`)

| method | route | purpose |
|---|---|---|
| GET | `public/biolinks/{biolink}/digital-products/{product}/reviews` | paginated approved reviews (public) |
| POST | `public/biolinks/{biolink}/digital-products/{product}/reviews` | create/update review; requires recovery session + paid order for this product |
| GET | `public/biolinks/{biolink}/digital-products/{product}/reviews/{order}` | buyer's existing review for their order (prefill edit form) |

- One review per order via `updateOrCreate` on `storefront_order_id`; second post updates.
- Buyer identity from order (`buyer_email`/`buyer_name`); no account required.
- New `PublicProductReviewResource`: id, stars, title, body, masked buyer_name ("J***n"), created_at.
- `PublicDigitalProductResource` gains `reviews_count` + `reviews_avg`.

### 2. `CreatorProductReviewsController` — creator read-only

`GET dashboard/digital-products/{product}/reviews` — creator must own product (`assertOwner` pattern). Returns all reviews on the product (approved + hidden, hidden flagged), plus distribution (1–5 counts, average, total). No reply/delete.

### 3. `AdminProductReviewsController` — moderation

| method | route | purpose |
|---|---|---|
| GET | `admin/digital-products/reviews` | paginated all reviews; filters: product title, stars, approved status |
| POST | `admin/digital-products/reviews/{review}/hide` | approved=false; store hidden_by/hidden_at/hidden_reason |
| POST | `admin/digital-products/reviews/{review}/unhide` | approved=true; clear hide fields |
| DELETE | `admin/digital-products/reviews/{review}` | permanent delete |

Admin sees buyer_email unmasked plus hide metadata.

### 4. Notifications

Queued `SendStorefrontReviewNotification` (mirrors `SendStorefrontReceipt` job) emails the product creator on every new review: product title, stars, review excerpt, link to dashboard reviews tab. Uses existing mail queue.

## Section 3 — Frontend (React)

shadcn components (`Card`, `Table`, `Badge`, `Dialog`, `Button`), lucide icons, `Trans` for all text, existing query-options pattern. Three query files: `product-reviews-queries.ts`, `creator-product-reviews-queries.ts`, `admin-product-reviews-queries.ts`.

### 1. Public product page (pageName `digital-product`)

`ProductReviews` block under product details:
- Summary row: average (number + stars), count, 1–5 star distribution bars.
- Review list: paginated approved reviews — masked buyer name, stars, title, body, relative date. Empty state: "No reviews yet. Be the first."
- "Write a review" button:
  - recovery session + paid order for this product → form directly (stars, title, body).
  - no session → inline "Verify your purchase" (order UUID + buyer email), sets recovery cookie, then form.
  - existing review for that order → prefilled edit mode.
- `productReviewsOptions` query + `productReviewKeys` invalidation.

### 2. Creator dashboard (`/dashboard/my-products/:productId/reviews`)

Read-only "Reviews" tab/page on the product details route (nested route under `/dashboard/my-products/:productId`, rendered inside the product details layout):
- Summary card: average, total, star distribution.
- List of all reviews on this product; hidden ones get a "Hidden" badge.
- No reply, no delete.

### 3. Admin (`/admin/digital-products/reviews`)

Datatable page matching `domains-datatable-page` pattern:
- Columns: product title (link), buyer name + email, stars, title/body excerpt, approved badge, date.
- Filters: product title, stars, approved status.
- Row actions: Hide (dialog with optional reason), Unhide, Delete (confirm dialog).
- Sidebar nav item "Product Reviews" (`StarIcon`), admin-permission gated, settings flag to enable/disable reviews globally (default on).

## Out of Scope

- Seller replies to reviews.
- Post-purchase review email follow-up / scheduling.
- Review form on order-success page.
- Multi-dimensional ratings, departments, recommend flag.
- Reviews on anything other than digital products.
