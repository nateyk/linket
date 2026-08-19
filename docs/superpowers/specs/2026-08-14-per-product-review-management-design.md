# Per-Product Review Management (Admin) — Design

Date: 2026-08-14
Status: Approved (approach A — scoped endpoint + dedicated page)
Scope: Storefront admin — replace the global bulk reviews list with per-product review management.

## Goal

Admins manage reviews per product instead of from a global bulk list. Each product row in the admin digital products list shows a review-count badge (total, plus hidden count) and a "Reviews" dropdown item leading to a dedicated per-product reviews page that shows the product title in its header. The global `/admin/digital-products/reviews` page, its route, its header button, and its sidebar entry are removed entirely.

## Decisions

- **Approach A**: new scoped admin endpoint `GET admin/digital-products/{digitalProduct}/reviews` (model-bound → 404 for missing products; product title available server-side for the page header), and the existing admin reviews datatable page becomes the per-product page.
- **Reuse moderation behavior**: hide/unhide/delete endpoints and the hide dialog stay exactly as they are (model-bound `ProductReview`).
- **Count badge on the list**: `AdminDigitalProductsController@index` gains `withCount` for `reviews_count` and `hidden_reviews_count` (approved = false). The list response is the paginator's `toArray()`, so the counts flow through without a resource change.
- **Removals**: global route `GET admin/digital-products/reviews`, the page at `/admin/digital-products/reviews`, the header "Product reviews" button in the products list, and the sidebar `StarIcon` entry for that path.

## Section 1 — API & Backend

### `AdminProductReviewsController@index` — becomes product-scoped

```php
public function index(Request $request, DigitalProduct $digitalProduct): JsonResponse
```

- Query base: `$digitalProduct->reviews()->with(['ratings', 'product'])` instead of `ProductReview::query()`.
- Existing `search` (review/title/buyer_email/buyer_name) and `status` (hidden/visible → `approved`) filters unchanged.
- Response shape changes from the bare `AdminProductReviewResource` collection to a JSON payload that wraps the pagination with the product for the page header:

```php
return response()->json([
    'product' => ['id' => $digitalProduct->id, 'title' => $digitalProduct->title],
    ...$query->latest()->paginate($perPage)->toArray(),
]);
```

### `AdminDigitalProductsController@index` — review counts

- Add to the existing eager loads: `withCount(['reviews', 'reviews as hidden_reviews_count' => fn ($q) => $q->where('approved', false)])`.
- The paginator `toArray()` already serializes `reviews_count` and `hidden_reviews_count` per row; no resource changes.

### Routes (`common/foundation/routes/api.php`, admin group)

- **Remove**: `Route::get('admin/digital-products/reviews', [AdminProductReviewsController::class, 'index']);`
- **Add**: `Route::get('admin/digital-products/{digitalProduct}/reviews', [AdminProductReviewsController::class, 'index']);`
- **Keep unchanged**: hide, unhide, delete routes (model-bound `ProductReview`).

## Section 2 — Frontend

### `admin-product-reviews-page.tsx` — becomes the per-product page

- Read `:productId` from the route (`useParams`).
- Fetch `/api/v1/admin/digital-products/{productId}/reviews` (same pagination/filter query building as today, URL path swapped).
- Header shows the product title from the response's `product` field plus a back link to `/admin/digital-products`.
- Search + status filter, hide dialog (reason), unhide, delete — all unchanged.

### `admin-digital-products-page.tsx` — badge + dropdown item

- Each row dropdown gains a "Reviews" item (`StarIcon`) linking to `/admin/digital-products/:id/reviews`.
- New Reviews cell: `StarIcon` + `reviews_count`; when `hidden_reviews_count > 0`, show a muted "Y hidden" subtitle.
- **Remove** the header "Product reviews" button (currently a `Link` to `/admin/digital-products/reviews`).

### Removals

- `admin-routes.tsx`: delete the global route entry `'digital-products/reviews'`; add `'digital-products/:productId/reviews'`.
- `admin-config.tsx`: delete the sidebar `StarIcon` entry for `/admin/digital-products/reviews`.

## Section 3 — Error Handling

- Missing product → 404 via route model binding; no controller code needed.
- Page keeps the existing error banner on fetch failure (shows "not found" text when the response is a 404).

## Section 4 — Testing

- Update `tests/Unit/ProductReviewTest.php` admin index test(s) to call the scoped controller method with a `DigitalProduct`; assert:
  - per-product isolation (reviews of a second product are not returned),
  - search and status filters still work scoped to the product,
  - response includes `product` (id + title).
- Add an `AdminDigitalProductsController@index` assertion: two products, reviews on one (one approved, one hidden) → `reviews_count`/`hidden_reviews_count` present and correct; second product 0/0.
- Frontend: `tsc` + `oxlint` + `build`; manual browser check of the list badge, dropdown item, per-product page, and moderation actions.