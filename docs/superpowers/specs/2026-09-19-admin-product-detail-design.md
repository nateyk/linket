# Admin Product Detail + History Design

## Goal

Give admins a deep-linkable product detail page where they can inspect a
submission (cover, description, files, creator, placement, course summary) and
moderate it, with a **History** tab backed by the review-event audit trail added
in the product-approval-pipeline change.

## Background

The admin products list lives at `/admin/digital-products`. Its "Details"
dropdown item opens a small review dialog; there is no dedicated product page.
The list already supports `scope=updated` (unreviewed updates) and the backend
records every lifecycle transition in `digital_product_review_events`
(`App\Storefront\Models\DigitalProductReviewEvent`) with actor, from/to status,
reason, and meta.

There is no admin `show` endpoint and no detail route. This design adds one
read-only detail page plus its API.

### Existing patterns to follow

- `resources/client/admin/withdrawals/admin-withdrawal-review-page.tsx`: a
  fetch-by-route-param admin detail page with a metadata table and an activity
  timeline.
- `@shadcn/tabs` (`common/foundation/resources/client/shadcn/tabs/tabs.tsx`),
  Base UI based, supports a `line` variant.
- `AdminDigitalProductsController` for the admin gate and route conventions,
  and `AdminProductReviewResource` for the resource style.
- `DigitalProductResource` uses `whenLoaded` and always-present keys; products
  are serialized with explicit field maps.

## Decisions

- **Scope:** read-only Details tab and a History tab. Sales and review counts
  are shown as counters that link to the existing reviews page; reviews and
  orders are not embedded.
- **Actions:** approve/reject (reusing the existing endpoints), download the
  product's files, and "View live" to open the public product page. No admin
  edit and no delete in this change.
- **Data layer:** one `GET /api/v1/admin/digital-products/{id}` returning a
  dedicated admin resource that includes a capped history array. One request
  powers both tabs and the page is deep-linkable.
- **List entry:** the product title becomes a link to the detail page; the
  existing quick Review dialog stays for one-click moderation from the list.
- **History cap:** the newest 50 events, newest first. Deliberate YAGNI limit;
  paginate later if products ever accumulate more.

## Backend

### Route

In `common/foundation/routes/api.php`, in the admin group, add:

```php
Route::get('admin/digital-products/{digitalProduct}', [AdminDigitalProductsController::class, 'show'])
    ->whereNumber('digitalProduct');
```

`->whereNumber()` is required: without it the wildcard would shadow
`admin/digital-products/order-recovery-deliveries` and
`admin/digital-products/withdrawal-methods`, which are declared nearby.

### Controller — `show()`

`app/Storefront/Controllers/AdminDigitalProductsController.php`:

```php
public function show(Request $request, DigitalProduct $digitalProduct)
{
    Gate::authorize('admin.access');

    $digitalProduct->load([
        'creator',
        'cover',
        'files',
        'biolinks',
        'course' => fn ($q) => $q->withCount([
            'chapters',
            'lessons',
            'lessons as published_lessons_count' => fn ($q) => $q->where('status', 'published'),
        ]),
        'reviewEvents' => fn ($q) => $q
            ->with('actor')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(50),
    ])->loadCount([
        'orders as sales_count' => fn ($q) => $q->where('status', 'paid'),
        'reviews',
    ]);

    return new AdminDigitalProductResource($digitalProduct);
}
```

All relations are eager-loaded; `Model::preventLazyLoading()` is active outside
production, including tests, so a missed eager load throws.

### Event model

`app/Storefront/Models/DigitalProductReviewEvent.php` gains:

```php
public function actor(): BelongsTo
{
    return $this->belongsTo(\App\Models\User::class, 'actor_id');
}
```

### Resource — `AdminDigitalProductResource`

New `app/Storefront/Resources/AdminDigitalProductResource.php`, `#[SchemaName('AdminDigitalProduct')]`,
returning:

- Identity: `id`, `title`, `description`, `learning_outcomes`, `type`,
  `is_course`, `status`, `rejection_reason`, `review_requested_at`,
  `has_pending_update`, `approved_at`, `price_cents`, `currency`,
  `sales_count`, `reviews_count`, `created_at`, `updated_at`.
- `creator` (`whenLoaded`): `id`, `name`, `email`, `username`.
- `cover` (`whenLoaded`): `id`, `name`, `url` or null.
- `files` (`whenLoaded`): `id`, `name`, `file_size`, `extension`, `url`.
- `stores` (`whenLoaded` on `biolinks`): `id`, `name`, `short_url`.
- `course` (`whenLoaded`): `id`, `published_at`, `chapters_count`,
  `lessons_count`, `published_lessons_count`, or null.
- `history` (`whenLoaded` on `reviewEvents`): `id`, `event`, `actor_role`,
  `actor` (`{id, name}` or null), `from_status`, `to_status`, `reason`, `meta`,
  `created_at`.

Counts are coerced to `int`. The "View live" URL is built on the frontend from
the first store's `short_url` plus `/products/{id}`, matching the creator
dashboard's convention (`digital-products-page.tsx`).

## Frontend

### Route

`resources/client/admin/admin-routes.tsx`, after the existing
`digital-products/:productId/reviews` entry:

```tsx
{
  path: 'digital-products/:productId',
  lazy: () => import('@app/admin/digital-products/admin-digital-product-detail-page'),
},
```

### Query

New `resources/client/admin/digital-products/admin-digital-product-detail-queries.ts`:

```ts
export const adminDigitalProductDetailBaseKey = ['adminDigitalProductDetail'];

export const adminDigitalProductDetailOptions = (productId: string) =>
  queryOptions({
    queryKey: [...adminDigitalProductDetailBaseKey, productId],
    queryFn: () =>
      apiClient
        .get(`/api/v1/admin/digital-products/${productId}`)
        .then(response => response.data),
  });
```

### Page — `admin-digital-product-detail-page.tsx`

- `useParams()` for `productId`, `useSuspenseQuery(adminDigitalProductDetailOptions(productId))`,
  `StaticPageTitle` with the product title.
- **Header:** `Back to products` link, title, shared status badge; actions —
  `View live` (opens the first store's public product URL in a new tab;
  disabled when `stores` is empty), `Approve`, and `Reject`. Approve/Reject
  render only when `status === 'pending_approval' || has_pending_update`.
  Approve reuses the existing endpoint; Reject opens a reason dialog. Both
  invalidate the list key (`adminDigitalProductsBaseKey`) and the detail key.
- **Tabs** (`@shadcn/tabs`, `variant="line"`): `Details` and `History`.
  - **Details** (two columns):
    - main: cover image; description (render as `prose` HTML when it looks like
      HTML, else plain whitespace-pre-wrap); learning outcomes list; files table
      (name, `prettyBytes` from `@ui/utils/files/pretty-bytes`, extension,
      download link); course summary card when `is_course`.
    - sidebar: ID/SKU (`padStart(4,'0')`), type, price (`formatMoney`, "Free" at
      0), creator name + email, status, pending-update state, the rejection
      reason when `status === 'rejected'` and present, created/approved dates,
      store placements linking to public store pages.
  - **History**: a vertical timeline of events. Each entry shows an
    event-specific icon/label, actor name + role (`admin`/`creator`/`system`),
    `from_status → to_status`, the rejection reason when present, changed keys
    from `meta.changed` when present, and a timestamp. Empty state when there
    are no events.

### Shared badge refactor

Extract `ProductStatusBadge` and the `looksLikeHtml` helper from
`admin-digital-products-datatable-columns.tsx` into a new
`admin-digital-product-status-badge.tsx`, and import it from both the columns
file and the detail page. No behavior change.

### List entry

In `admin-digital-products-datatable-columns.tsx`, wrap the product title in
`<Link to={`/admin/digital-products/${product.id}`}>`. The quick Review dialog
is unchanged.

## Testing

Backend feature tests — new `tests/Feature/AdminDigitalProductDetailTest.php`:

1. Admin show returns creator, files, stores, course counts,
   `sales_count`/`reviews_count`, `has_pending_update`, and `history` newest
   first including actor names.
2. Non-admin creator receives 403.
3. Route-shadowing regression: `GET /api/v1/admin/digital-products/order-recovery-deliveries`
   and `.../withdrawal-methods` still resolve (not captured by the wildcard).
4. History cap: with 55 events, `history` has 50, newest first.
5. Course product returns chapter/lesson/published counts; a digital product
   returns `course: null`.

Frontend — a Vitest source-assertion test asserting: the detail route is
registered, the page references the `Details` and `History` panels, the history
entry keys are consumed (`event`, `actor_role`, `from_status`, `to_status`),
and the list title links to `/admin/digital-products/{id}`.

Full verification before any PR: `npx tsc --noEmit --skipLibCheck`,
`npm run test`, `npm run build`, `ddev exec ./vendor/bin/pest`, then
`git restore public/build/manifest.json`.

## Risks and Mitigations

- **Route shadowing** — `->whereNumber()` plus the regression test in #3.
- **Lazy loading** — eager loads only; the testing environment enforces
  `preventLazyLoading`.
- **Large history payload** — capped at 50.
- **"View live" with no store placement** — button disabled.

## Out of Scope

Admin edit/delete, embedded Reviews/Orders tabs, bulk approve/reject, the nested
Products sidebar, and creator notifications.
