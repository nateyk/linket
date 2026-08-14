# Per-Product Review Management (Admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin's global bulk reviews list with per-product review management — a scoped reviews endpoint, a per-product reviews page, and review-count badges on the products list.

**Architecture:** Add a model-bound scoped admin route `admin/digital-products/{digitalProduct}/reviews` whose response wraps the existing paginated `AdminProductReviewResource` collection with the product's `{id, title}`. The products-list index gains `withCount` aggregates (`reviews_count`, `hidden_reviews_count`). Frontend: the existing reviews datatable page reads a `:productId` route param and shows the product title in its header; the products list gains a "Reviews" dropdown item and a count badge, and the global reviews route, header button, and sidebar entry are removed.

**Tech Stack:** Laravel 12 (PHP 8.4) via ddev; `codebyray/laravel-review-rateable` v2 (polymorphic `reviews()` morphMany on `DigitalProduct`); React 19 + shadcn/Base UI + react-router; Vite + oxlint + TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-14-per-product-review-management-design.md`

## Global Constraints

- Backend commands run inside the ddev container: `ddev exec php artisan test --filter=ProductReviewTest`. No host PHP.
- Reviews are polymorphic on `DigitalProduct` via the `ReviewRateable` trait (`$digitalProduct->reviews()`), `reviewable_id`/`reviewable_type`.
- Review rows carry `approved` (bool, true = visible), `hidden_at`, `hidden_by`, `hidden_reason`; a review is "hidden" when `approved = false`.
- Route file: `common/foundation/routes/api.php` (admin group). Frontend routes: `resources/client/admin/admin-routes.tsx`; sidebar icons: `resources/client/admin/admin-config.tsx`.
- The admin products-list index (`AdminDigitalProductsController@index`) does NOT use `DigitalProductResource`; it returns the paginator's `toArray()`, so `withCount` columns flow straight into each row.
- Gate `admin.access` passes if the authenticated user has the `admin` or `admin.access` permission (`hasPermission` treats `admin` as wildcard).
- Frontend verification: `npm run lint` (oxlint) and `npm run build` (vite). Project has no `typecheck` script; rely on oxlint + build.
- Product title in the per-product page header comes from the endpoint response's `product` key (server is the source of truth; no title passed via router state).

---

### Task 1: Scoped admin reviews endpoint (backend)

**Files:**
- Modify: `app/Storefront/Controllers/AdminProductReviewsController.php:13-33`
- Modify: `common/foundation/routes/api.php:256-259`
- Test: `tests/Unit/ProductReviewTest.php:347-373`

**Interfaces:**
- Consumes: `DigitalProduct` (route model binding via `{digitalProduct}`); existing `AdminProductReviewResource`.
- Produces: `index(Request $request, DigitalProduct $digitalProduct): AnonymousResourceCollection` whose JSON top level has `data`, `links`, `meta`, and `product: {id, title}` (added via `->additional()`). Later tasks (Task 3) consume `product.id`/`product.title` from `response.data.product` and `response.data.meta`.

- [ ] **Step 1: Update the failing test to the new signature and add per-product isolation + product payload assertions**

Replace `testAdminIndexFiltersByStatusAndSearch` in `tests/Unit/ProductReviewTest.php` and add two new tests:

```php
public function testAdminIndexFiltersByStatusAndSearchScopedToProduct(): void
{
    [$product] = $this->makeProductOnBiolink();
    [$otherProduct] = $this->makeProductOnBiolink();
    ProductReview::unguarded(fn() => $product->addReview([
        'review' => 'Keep',
        'approved' => true,
        'ratings' => ['overall' => 5],
    ]));
    ProductReview::unguarded(fn() => $product->addReview([
        'review' => 'Drop',
        'approved' => false,
        'ratings' => ['overall' => 2],
    ]));
    ProductReview::query()
        ->where('reviewable_id', $product->id)
        ->where('review', 'Drop')
        ->update(['hidden_at' => now(), 'hidden_by' => 7]);

    // review on the *other* product must never appear for this product
    ProductReview::unguarded(fn() => $otherProduct->addReview([
        'review' => 'Other',
        'approved' => true,
        'ratings' => ['overall' => 4],
    ]));

    $response = (new \App\Storefront\Controllers\AdminProductReviewsController())->index(
        Request::create('http://127.0.0.1/api/v1/admin/digital-products/' . $product->id . '/reviews', 'GET', ['status' => 'hidden']),
        $product,
    );

    $this->assertSame(15, $response->resource->perPage());
    $payload = $response->response()->getData(true);
    $this->assertSame(['id' => $product->id, 'title' => 'Ebook'], $payload['product']);
    $reviews = collect($payload['data']);
    $this->assertCount(1, $reviews->where('review', 'Drop'));
    $this->assertEmpty($reviews->where('review', 'Keep'));
    $this->assertEmpty($reviews->where('review', 'Other'));
}

public function testAdminIndexIsScopedToProduct(): void
{
    [$product] = $this->makeProductOnBiolink();
    [$otherProduct] = $this->makeProductOnBiolink();
    ProductReview::unguarded(fn() => $product->addReview([
        'review' => 'Mine',
        'approved' => true,
        'ratings' => ['overall' => 5],
    ]));
    ProductReview::unguarded(fn() => $otherProduct->addReview([
        'review' => 'Theirs',
        'approved' => true,
        'ratings' => ['overall' => 4],
    ]));

    $response = (new \App\Storefront\Controllers\AdminProductReviewsController())->index(
        Request::create('http://127.0.0.1/api/v1/admin/digital-products/' . $product->id . '/reviews', 'GET'),
        $product,
    );
    $reviews = collect($response->response()->getData(true)['data']);
    $this->assertCount(1, $reviews);
    $this->assertSame('Mine', $reviews->first()['review']);
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `ddev exec php artisan test --filter=ProductReviewTest`
Expected: FAIL — `index()` signature mismatch (`ArgumentCountError` / too few arguments), and the existing test no longer compiles.

- [ ] **Step 3: Implement the scoped controller**

Change the `index` method in `app/Storefront/Controllers/AdminProductReviewsController.php`:

```php
use App\Storefront\Models\DigitalProduct;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

public function index(Request $request, DigitalProduct $digitalProduct): AnonymousResourceCollection
{
    $perPage = min(max($request->integer('per_page', 15), 1), 100);
    $query = $digitalProduct->reviews()
        ->with(['ratings', 'product']);

    if ($search = $request->string('search')->trim()) {
        $query->where(function ($q) use ($search) {
            $q->where('review', 'like', "%{$search}%")
                ->orWhere('title', 'like', "%{$search}%")
                ->orWhere('buyer_email', 'like', "%{$search}%")
                ->orWhere('buyer_name', 'like', "%{$search}%");
        });
    }

    if (in_array($request->string('status')->toString(), ['hidden', 'visible'], true)) {
        $query->where('approved', $request->string('status')->is('visible'));
    }

    return AdminProductReviewResource::collection($query->latest()->paginate($perPage))
        ->additional(['product' => [
            'id' => $digitalProduct->id,
            'title' => $digitalProduct->title,
        ]]);
}
```

Add `use App\Storefront\Models\DigitalProduct;` to the imports (keep `use App\Storefront\Models\ProductReview;` for hide/unhide/destroy).

- [ ] **Step 4: Update the routes**

In `common/foundation/routes/api.php`:

- Remove line 256:
  ```php
  Route::get('admin/digital-products/reviews', [AdminProductReviewsController::class, 'index']);
  ```
- Replace it with:
  ```php
  Route::get('admin/digital-products/{digitalProduct}/reviews', [AdminProductReviewsController::class, 'index']);
  ```
- Leave the `hide`/`unhide`/`destroy` routes (lines 257-259) unchanged.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `ddev exec php artisan test --filter=ProductReviewTest`
Expected: PASS for all `testAdminIndex*` and the hide/unhide/destroy tests.

- [ ] **Step 6: Commit**

```bash
git add app/Storefront/Controllers/AdminProductReviewsController.php common/foundation/routes/api.php tests/Unit/ProductReviewTest.php
git commit -m "feat: scope admin product reviews index to a single product"
```

---

### Task 2: Review counts on the admin products list (backend)

**Files:**
- Modify: `app/Storefront/Controllers/AdminDigitalProductsController.php:19`
- Test: `tests/Unit/ProductReviewTest.php`

**Interfaces:**
- Consumes: nothing new — the existing `index` and its paginator `toArray()` response.
- Produces: each product row now includes `reviews_count` and `hidden_reviews_count` integers. Task 4 consumes these on the frontend (`Product.reviews_count`, `Product.hidden_reviews_count`).

- [ ] **Step 1: Write the failing test**

Add to `tests/Unit/ProductReviewTest.php`:

```php
public function testAdminProductsListIncludesReviewCounts(): void
{
    $admin = \App\Models\User::query()->forceCreate([
        'name' => 'Admin ' . Str::random(8),
        'username' => Str::lower(Str::random(12)),
        'email' => Str::random(12) . '@example.test',
        'password' => bcrypt('password'),
        'email_verified_at' => now(),
    ]);
    $admin->permissions()->attach(
        \Common\Permissions\Models\Permission::query()->firstOrCreate(['name' => 'admin']),
    );
    \Illuminate\Support\Facades\Auth::login($admin);

    [$product] = $this->makeProductOnBiolink();
    [$otherProduct] = $this->makeProductOnBiolink();
    ProductReview::unguarded(fn() => $product->addReview([
        'review' => 'A', 'approved' => true, 'ratings' => ['overall' => 5],
    ]));
    ProductReview::unguarded(fn() => $product->addReview([
        'review' => 'B', 'approved' => false, 'ratings' => ['overall' => 2],
    ]));

    $request = Request::create('http://127.0.0.1/api/v1/admin/digital-products', 'GET');
    $request->setUserResolver(fn() => $admin);
    $response = (new \App\Storefront\Controllers\AdminDigitalProductsController())->index($request);

    $products = collect($response->getData(true)['data']);
    $withReviews = $products->firstWhere('id', $product->id);
    $withoutReviews = $products->firstWhere('id', $otherProduct->id);

    $this->assertSame(2, $withReviews['reviews_count']);
    $this->assertSame(1, $withReviews['hidden_reviews_count']);
    $this->assertSame(0, $withoutReviews['reviews_count']);
    $this->assertSame(0, $withoutReviews['hidden_reviews_count']);
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `ddev exec php artisan test --filter=testAdminProductsListIncludesReviewCounts`
Expected: FAIL — `reviews_count`/`hidden_reviews_count` are undefined on the rows.

- [ ] **Step 3: Implement the `withCount`**

In `app/Storefront/Controllers/AdminDigitalProductsController.php`, change line 19:

```php
$query = DigitalProduct::query()
    ->with(['creator', 'cover', 'files', 'biolinks'])
    ->withCount([
        'reviews',
        'reviews as hidden_reviews_count' => fn ($q) => $q->where('approved', false),
    ]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `ddev exec php artisan test --filter=testAdminProductsListIncludesReviewCounts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/Controllers/AdminDigitalProductsController.php tests/Unit/ProductReviewTest.php
git commit -m "feat: include review counts on admin digital products list"
```

---

### Task 3: Per-product reviews page (frontend)

**Files:**
- Modify: `resources/client/admin/digital-products/admin-product-reviews-page.tsx`
- Modify: `resources/client/admin/admin-routes.tsx:114-120`

**Interfaces:**
- Consumes: Task 1's scoped endpoint `GET /api/v1/admin/digital-products/{productId}/reviews` returning `data`, `meta`, `product: {id, title}`. Task 1's hide/unhide/delete routes are unchanged.
- Produces: page at `/admin/digital-products/:productId/reviews` that reads `productId` from the URL and shows the product title in the header.

- [ ] **Step 1: Update the route**

In `resources/client/admin/admin-routes.tsx`, change the reviews route:

```tsx
{
  path: 'digital-products/:productId/reviews',
  lazy: () =>
    import('@app/admin/digital-products/admin-product-reviews-page'),
},
```

- [ ] **Step 2: Update the page component**

In `resources/client/admin/digital-products/admin-product-reviews-page.tsx`:

1. Add imports at the top:
   ```tsx
   import {ArrowLeftIcon} from 'lucide-react';
   import {Link, useParams} from 'react-router';
   ```
2. Add a `product` state next to the other state, and read the route param inside `Component()`:
   ```tsx
   const {productId} = useParams();
   const [product, setProduct] = useState<{id: number; title: string}>();
   ```
3. In `load`, change the URL to the scoped endpoint and capture the product:
   ```tsx
   const response = await apiClient.get(
     `/api/v1/admin/digital-products/${productId}/reviews?${params.toString()}`,
   );
   setReviews(response.data.data ?? []);
   setProduct(response.data.product);
   setMeta(response.data.meta);
   ```
   Add `productId` to the `load` `useCallback` dependency array.
4. Update the `SectionHeader` to show a back link and the product title:
   ```tsx
   <DashboardLayout.SectionHeader>
     <DashboardLayout.SidebarToggle />
     <DashboardLayout.SectionTitle>
       <Trans message="Product Reviews" />
     </DashboardLayout.SectionTitle>
     <Button
       variant="outline"
       nativeButton={false}
       render={<Link to="/admin/digital-products" />}
     >
       <ArrowLeftIcon />
       <Trans message="Back to products" />
     </Button>
   </DashboardLayout.SectionHeader>
   ```
5. Above the `Card.Root`, add a product-title heading (fall back gracefully if `product` is still loading):
   ```tsx
   {product && (
     <h1 className="mb-4 text-lg font-semibold">{product.title}</h1>
   )}
   ```

- [ ] **Step 3: Run the frontend checks**

Run: `npm run lint` then `npm run build`
Expected: no oxlint errors; build succeeds.

- [ ] **Step 4: Manual browser verification**

Open the app, log in as admin, navigate to `/admin/digital-products/1/reviews`. Confirm:
- the page loads only product 1's reviews,
- the header shows the product title and a "Back to products" link,
- hide (with reason), restore, and delete still work,
- the search and status filters work.

- [ ] **Step 5: Commit**

```bash
git add resources/client/admin/digital-products/admin-product-reviews-page.tsx resources/client/admin/admin-routes.tsx
git commit -m "feat: per-product admin reviews page with product header"
```

---

### Task 4: Products-list badge, dropdown item, and removals (frontend)

**Files:**
- Modify: `resources/client/admin/digital-products/admin-digital-products-page.tsx`
- Modify: `resources/client/admin/admin-config.tsx:43`

**Interfaces:**
- Consumes: Task 2's `reviews_count`/`hidden_reviews_count` on each product row; Task 3's route `/admin/digital-products/:productId/reviews`.
- Produces: products list shows a "Reviews" count badge and a "Reviews" dropdown item per row; the global header "Product reviews" button, sidebar entry, and leftover global route no longer exist.

- [ ] **Step 1: Remove the global header button and sidebar entry**

1. In `resources/client/admin/digital-products/admin-digital-products-page.tsx`, delete the "Product reviews" header `<Button>` block (lines 202-209):
   ```tsx
   <Button
     variant="outline"
     nativeButton={false}
     render={<Link to="/admin/digital-products/reviews" />}
   >
     <StarIcon />
     <Trans message="Product reviews" />
   </Button>
   ```
   If `StarIcon` is no longer used elsewhere in this file, remove it from the lucide import list (it will still be used by the new badge, so keep it).
2. In `resources/client/admin/admin-config.tsx`, remove line 43:
   ```tsx
   '/admin/digital-products/reviews': <StarIcon />,
   ```
   If `StarIcon` becomes unused in `admin-config.tsx`, remove it from that file's lucide import.

- [ ] **Step 2: Extend the `Product` type**

In `resources/client/admin/digital-products/admin-digital-products-page.tsx`, add to the `Product` type:

```tsx
type Product = {
  id: number;
  title: string;
  // ...existing fields...
  reviews_count?: number;
  hidden_reviews_count?: number;
};
```

- [ ] **Step 3: Add the Reviews column**

Add a header cell after the "Status" head and a body cell after the status cell:

```tsx
<Table.Head className="text-center">
  <Trans message="Reviews" />
</Table.Head>
```

```tsx
<Table.Cell className="text-center">
  <div className="inline-flex flex-col items-center">
    <span className="inline-flex items-center gap-1 text-foreground">
      <StarIcon className="size-3.5 text-amber-500" />
      {product.reviews_count ?? 0}
    </span>
    {(product.hidden_reviews_count ?? 0) > 0 && (
      <span className="text-xs text-muted-foreground">
        <Trans message=":count hidden" values={{count: product.hidden_reviews_count}} />
      </span>
    )}
  </div>
</Table.Cell>
```

Update both `colSpan={7}` cells to `colSpan={8}`.

- [ ] **Step 4: Add the "Reviews" dropdown item**

In the row's `<Dropdown.Content>`, after the existing "Details" item, add a link item. Add `const navigate = useNavigate();` (from `react-router`) inside `Component()`, then:

```tsx
<Dropdown.Item onClick={() => navigate(`/admin/digital-products/${product.id}/reviews`)}>
  <StarIcon />
  <Trans message="Reviews" />
</Dropdown.Item>
```

Add `useNavigate` to the existing `import {Link} from 'react-router';` line: `import {Link, useNavigate} from 'react-router';`.

- [ ] **Step 5: Run the frontend checks**

Run: `npm run lint` then `npm run build`
Expected: no oxlint errors; build succeeds.

- [ ] **Step 6: Manual browser verification**

Open the app as admin, go to `/admin/digital-products`. Confirm:
- each product row shows the Reviews count badge (total, and "N hidden" subtitle when hidden > 0),
- the "Reviews" dropdown item navigates to `/admin/digital-products/:id/reviews`,
- the header no longer shows the "Product reviews" button,
- the sidebar has no separate "reviews" entry,
- the products list and review pages both still load.

- [ ] **Step 7: Commit**

```bash
git add resources/client/admin/digital-products/admin-digital-products-page.tsx resources/client/admin/admin-config.tsx
git commit -m "feat: per-product review badge and dropdown in admin products list"
```

---

### Task 5: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full backend test suite**

Run: `ddev exec php artisan test --compact`
Expected: all tests pass (the suite previously ran 103 tests / 338 assertions; no regressions).

- [ ] **Step 2: Run frontend lint and build**

Run: `npm run lint` then `npm run build`
Expected: clean lint; successful build.

- [ ] **Step 3: Manual end-to-end check**

As admin, verify the whole flow:
1. `/admin/digital-products` — count badges and "Reviews" dropdown items present; no global reviews header button.
2. `/admin/digital-products/:id/reviews` — shows only that product's reviews, product title in header, back link works.
3. Hide a review (with a reason), then confirm it disappears from the public product page; restore it.
4. Create a review on a second product and confirm it does not appear on the first product's page.

- [ ] **Step 4: Commit any incidental fixes**

```bash
git add -A
git commit -m "chore: cleanup from per-product review management"
```
Only run if Step 1-3 surfaced fixes; skip otherwise.

---

## Self-Review

- **Spec coverage:** Task 1 covers the scoped endpoint + product payload + route swap + isolation tests. Task 2 covers `withCount` (`reviews_count`, `hidden_reviews_count`). Task 3 covers the per-product page (route param, product header, back link). Task 4 covers the count badge, dropdown item, and all removals (global route via Task 1's route swap, header button, sidebar entry). Task 5 covers full verification. All spec sections (Section 1-4) are implemented.
- **Placeholders:** none — every step has concrete code or an exact command.
- **Type consistency:** controller method `index(Request $request, DigitalProduct $digitalProduct): AnonymousResourceCollection` (Task 1) matches route model binding `{digitalProduct}` and the `->additional(['product' => ...])` output consumed by Task 3 (`response.data.product`); `withCount` aliases `hidden_reviews_count` (Task 2) match `Product.hidden_reviews_count` in Task 4. Frontend route `digital-products/:productId/reviews` (Task 3) matches the `navigate` target in Task 4 and the backend route `admin/digital-products/{digitalProduct}/reviews` (Task 1).