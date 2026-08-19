# Digital Product Reviews & Ratings — Design

Date: 2026-08-12
Status: Approved (revised — package-based)
Scope: Storefront (digital products) — public buyer reviews, creator read view, admin moderation.

## Goal

Buyers who purchased a digital product can leave a 1–5 star review (title + optional body) on the product's public page. Reviews appear immediately and are displayed as social proof for other buyers. Admins can hide/unhide/delete reviews after the fact. Creators can read reviews on their own products (no replies, no delete). Reviews are removed when the underlying order is fully refunded.

## Decisions

- **Single 1–5 star rating** (diget reference pattern), not multi-dimensional.
- **Immediate visibility** with an `approved` flag (default true) — admin can hide later.
- **No seller replies** — reviews are read-only for creators.
- **Use `codebyray/laravel-review-rateable` v2 (^2.0) as the review/rating storage + math layer** (revised from fully-custom Approach A):
  - Package `reviews` table has `user_id` **nullable** → fits guest-buyer reviews (pass `null`).
  - Package `approved` column maps 1:1 to hide-later moderation.
  - Built-in rating math: `averageRating()`, `ratingCounts()`, `ratingStats()` → removes the need for denormalized counters on `digital_products`.
  - Configure a single rating key `overall` (min 1, max 5) → one-star model via config, no code.
  - Polymorphic `reviewable` → `DigitalProduct` via the `ReviewRateable` trait.
  - Actively maintained (v2.1.4, 2026-07, Laravel 10–13, 358k installs, 0 open issues); PHP 8.1+; MIT.
  - We still own: published migration extension (order-tie + buyer display + hide metadata columns), verification auth (recovery cookie), refund removal, notifications, admin moderation, and all UI.
- **Buyer verification via existing order-recovery session** (`OrderRecoveryService` cookie, used by `/find-my-purchase/orders` and downloads). Review is tied to a paid `storefront_order_id` (unique column added to the published `reviews` migration), so purchase eligibility is enforced by the FK + status check.
- **Entry point**: public product page, with inline "Verify your purchase" (order UUID + buyer email) fallback when no recovery cookie exists. No post-purchase email follow-up and no success-page form (kept out for simplicity).
- **Notification**: email to the product creator on every new review (queued, mirrors `SendStorefrontReceipt`).
- **Remove on refund**: on full refund, delete the review for that order (inside `DigitalProductRefundService::record()`, which already detects `$isFull`).

## Section 1 — Data Model

Install and publish the package:

```
composer require codebyray/laravel-review-rateable:^2.0
php artisan vendor:publish --provider="Codebyray\ReviewRateable\ReviewRateableServiceProvider" --tag=config
php artisan vendor:publish --provider="Codebyray\ReviewRateable\ReviewRateableServiceProvider" --tag=migrations
```

Config `config/review-rateable.php`:
- `user_model` → `App\Models\User::class`
- `min_rating_value` = 1, `max_rating_value` = 5
- `approved_review` = **true** (immediate visibility)
- `departments.default.ratings` = `['overall' => 'Overall Rating']` (single key = single star)

Package tables (from published migrations):
- `reviews`: id, reviewable_type, reviewable_id (morph), user_id **nullable**, review (text), department, recommend, approved (bool), timestamps
- `ratings`: id, review_id (FK cascade), key ("overall"), value (tinyint 1–5), timestamps

**Extension** — the published `create_reviews_table.php` becomes ours; add:
- `storefront_order_id` bigint unsigned **nullable, unique** FK → storefront_orders (cascade)
- `buyer_email` varchar(254) nullable, indexed (copied from order for display)
- `buyer_name` varchar(120) nullable (copied from order for display)
- `title` varchar(120) nullable (review headline)
- `hidden_by` int unsigned nullable FK → users
- `hidden_reason` varchar(255) nullable
- `hidden_at` timestamp nullable
- index `(reviewable_id, reviewable_type, approved, created_at)`

No denormalized counters on `digital_products` — averages/counts come from package methods.

Models:
- `DigitalProduct` gets `use ReviewRateable;`
- New `App\Storefront\Models\ProductReview extends Codebyray\ReviewRateable\Models\Review` — adds `storefront_order_id`, `buyer_email`, `buyer_name`, `title`, `hidden_*` to fillable; `order()` belongsTo StorefrontOrder; `product()` belongsTo DigitalProduct (via reviewable_type/id); `hidden_at` cast datetime.

Authorization to post a review: existing `OrderRecoveryService::current($request)` cookie session; order must belong to this product and be `status=paid`. If no cookie, buyer verifies via order UUID + buyer_email using `OrderRecoveryService::request/redeem` (existing flow), then posts.

One review per paid order: enforced by the unique `storefront_order_id` column + find-or-update logic in the controller.

Full refund → delete review for `storefront_order_id` (added to `DigitalProductRefundService::record()`).

## Section 2 — API & Backend

Controllers in `App\Storefront\Controllers`:

### 1. `ProductReviewsController` — public read + verified buyer posting (routes in `routes/api.php`)

| method | route | purpose |
|---|---|---|
| GET | `public/biolinks/{biolink}/digital-products/{product}/reviews` | paginated approved reviews (public) |
| POST | `public/biolinks/{biolink}/digital-products/{product}/reviews` | create/update review; requires recovery session + paid order for this product |
| GET | `public/biolinks/{biolink}/digital-products/{product}/reviews/{order}` | buyer's existing review for their order (prefill edit form) |

- POST: look up `ProductReview::where('storefront_order_id', $order->id)->first()`; if exists → `$product->updateReview($review->id, $data)` else `$product->addReview($data, null)` (guest) — pass `auth()->id()` when the buyer happens to be logged in. Data: `review` (body), `title` (our column), `ratings => ['overall' => stars]`, `approved => true`.
- Buyer identity from order (`buyer_email`/`buyer_name`); no account required.
- New `PublicProductReviewResource`: id, stars, title, body, masked buyer_name ("J***n"), created_at.
- `PublicDigitalProductResource` gains `reviews_count` + `reviews_avg` computed via `totalReviews()`/`averageRating('overall')`.

### 2. `CreatorProductReviewsController` — creator read-only

`GET dashboard/digital-products/{product}/reviews` — creator must own product (`assertOwner` pattern). Returns all reviews on the product (approved + hidden, hidden flagged), plus distribution via `ratingStats()` (1–5 counts, average, total). No reply/delete.

### 3. `AdminProductReviewsController` — moderation

| method | route | purpose |
|---|---|---|
| GET | `admin/digital-products/reviews` | paginated all reviews; filters: product title, stars, approved status |
| POST | `admin/digital-products/reviews/{review}/hide` | approved=false; store hidden_by/hidden_at/hidden_reason |
| POST | `admin/digital-products/reviews/{review}/unhide` | approved=true; clear hide fields |
| DELETE | `admin/digital-products/reviews/{review}` | permanent delete |

Hide/unhide are direct `ProductReview` updates (package has `approveReview()` for unhide; hide is a plain `approved=false` update). Admin sees buyer_email unmasked plus hide metadata.

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
- Multi-dimensional ratings, departments (only `default`/`overall` used), recommend flag.
- Reviews on anything other than digital products.
- Upgrading/migrating between package v1 and v2 (fresh install).
