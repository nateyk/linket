# Digital Product Reviews & Ratings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let buyers who purchased a digital product leave a 1–5 star review on the public product page, let creators view their reviews read-only, and let admins moderate (hide/unhide/delete) reviews.

**Architecture:** Package `codebyray/laravel-review-rateable:^2.1` (vendor at `vendor/codebyray/laravel-review-rateable`, config key `review-rateable`) provides `reviews` + `ratings` tables, the `ReviewRateable` trait, and the `Review` model. We extend the published `reviews` migration with order-tie columns (`storefront_order_id` UNIQUE), buyer identity, and audit columns (hidden_*); create `App\Storefront\Models\ProductReview extends Codebyray\ReviewRateable\Models\Review`; add the trait to `App\Storefront\Models\DigitalProduct`; add three controllers (public, creator, admin) with resources; delete reviews on full refund; notify the creator via a queued mail job. Frontend: reviews block + write dialog on the public product page, a creator read-only page (`/dashboard/my-products/:id/reviews`), and an admin datatable (`/admin/digital-products/reviews`).

**Tech Stack:** Laravel 12 (PHP 8.4), codebyray/laravel-review-rateable v2.1, React 19 + shadcn/ui (`@shadcn/*`), tailwindcss v4, @tanstack/react-query (`apiClient`), lucide-react icons, `Trans` for i18n, PHPUnit.

## Global Constraints

- Use shadcn components (paths under `common/foundation/resources/client/shadcn`) before `@ui` components.
- All user-facing strings must use `<Trans message="..." />` (static string as `message` prop).
- Icons from lucide-react.
- Use design tokens from `common-tailwind.css` (e.g. `text-muted-foreground`, `bg-muted`) instead of raw gray values.
- Backend: no DI in controllers/services — use helpers/facades (`request()`, `app()`, facades). No raw class strings — use `::class`. PHP 8.2+ features (arrow fns, spread).
- Reviewer identity is a guest buyer: `reviews.user_id` stays NULL; authorization is "paid order for this product matching `order_uuid` + `buyer_email`".
- One review per order: `storefront_order_id` is UNIQUE; posting again with the same order updates the existing review (edit path). No seller replies, no delete by buyer.
- Reviews appear immediately (`approved=true`) — admin hiding later sets `approved=false` + audit columns.
- No denormalized counters on `digital_products`; averages computed via trait methods (`averageRating('overall')`, `ratingStats()`).
- Follow existing patterns in `app/Storefront/*`, `common/foundation/routes/api.php`, `resources/client/digital-products/*`, `resources/client/dashboard/*`, `resources/client/admin/*`.
- Every new/edited feature area gets a PHPUnit test; run `php artisan test --compact --filter=ProductReview` before finishing.

---

### Task 1: Publish package config + migrations and extend the reviews migration

**Files:**
- Create (generated): `config/review-rateable.php`
- Create (generated): `database/migrations/<timestamp>_create_reviews_table.php`, `database/migrations/<timestamp>_create_ratings_table.php`
- Modify: `config/review-rateable.php`, `database/migrations/<timestamp>_create_reviews_table.php`
- Test: none (schema verified via `php artisan migrate` + `php artisan tinker --execute 'Schema::hasTable("reviews");'` — tinker is NOT installed in this app; verify via `php artisan migrate:status` instead)

**Interfaces:**
- Produces: table `reviews` with extra columns (`storefront_order_id`, `buyer_email`, `buyer_name`, `title`, `hidden_by`, `hidden_reason`, `hidden_at`, composite index); config `review-rateable` with `approved_review=true` and single `overall` rating key.

- [ ] **Step 1: Publish package files**

Run:
```
php artisan vendor:publish --provider="Codebyray\ReviewRateable\ReviewRateableServiceProvider"
```
Expected: creates `config/review-rateable.php`, `database/migrations/YYYY_MM_DD_HHMMSS_create_reviews_table.php`, and `database/migrations/YYYY_MM_DD_HHMMSS_create_ratings_table.php` (provider stamps reviews then ratings with +1 second).

- [ ] **Step 2: Configure single-rating, auto-approved reviews**

Replace contents of `config/review-rateable.php` with:

```php
<?php

return [
    'max_rating_value' => 5,
    'min_rating_value' => 1,

    'approved_review' => true,

    'departments' => [
        'default' => [
            'ratings' => [
                'overall' => 'Overall Rating',
            ],
        ],
    ],
];
```

- [ ] **Step 3: Extend the published reviews migration**

Replace the `create_reviews_table` migration body (keep class name/timestamps) with:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateReviewsTable extends Migration
{
    public function up()
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->morphs('reviewable');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->text('review')->nullable();
            $table->string('department')->default('default');
            $table->boolean('recommend')->default(false);
            $table->boolean('approved')->default(false);
            $table->foreignId('storefront_order_id')->nullable()->unique()->constrained('storefront_orders')->cascadeOnDelete();
            $table->string('buyer_email', 254)->nullable();
            $table->string('buyer_name', 120)->nullable();
            $table->string('title', 120)->nullable();
            $table->unsignedBigInteger('hidden_by')->nullable();
            $table->string('hidden_reason', 255)->nullable();
            $table->timestamp('hidden_at')->nullable();
            $table->index(['reviewable_id', 'reviewable_type', 'approved', 'created_at']);
            $table->index('buyer_email');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('reviews');
    }
}
```

- [ ] **Step 4: Run the migration**

Run: `php artisan migrate --no-interaction`
Expected: `reviews` and `ratings` tables created. Verify with `php artisan migrate:status` (both rows show Ran) and `php artisan db:table reviews` if available.

- [ ] **Step 5: Commit**

```bash
git add config/review-rateable.php database/migrations/*_create_reviews_table.php database/migrations/*_create_ratings_table.php composer.json composer.lock
git commit -m "feat: add review-rateable package, reviews table with order-tie and moderation columns"
```

---

### Task 2: ProductReview model + ReviewRateable trait on DigitalProduct

**Files:**
- Create: `app/Storefront/Models/ProductReview.php`
- Modify: `app/Storefront/Models/DigitalProduct.php:1-38`

**Interfaces:**
- Consumes: `reviews` table schema from Task 1.
- Produces: `App\Storefront\Models\ProductReview` (extends `Codebyray\ReviewRateable\Models\Review`, fillable extras `storefront_order_id`, `buyer_email`, `buyer_name`, `title`, `hidden_by`, `hidden_reason`, `hidden_at`; relations `order(): BelongsTo StorefrontOrder` via `storefront_order_id`, `product(): BelongsTo DigitalProduct` via `reviewable_id`; casts `approved`/`recommend` boolean, `hidden_at` datetime). `DigitalProduct` gains the `ReviewRateable` trait (methods `addReview`, `updateReview`, `averageRating`, `ratingStats`, `totalReviews`, `deleteReview`, `approveReview`).

- [ ] **Step 1: Write the failing test**

Create `tests/Unit/ProductReviewModelTest.php`:

```php
<?php

namespace Tests\Unit;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductReview;
use Tests\TestCase;

class ProductReviewModelTest extends TestCase
{
    public function testProductReviewIncludesOrderTieAndBuyerColumnsInFillable(): void
    {
        $review = new ProductReview([
            'reviewable_id' => 1,
            'reviewable_type' => DigitalProduct::class,
            'review' => 'Great product',
            'approved' => true,
            'storefront_order_id' => 5,
            'buyer_email' => 'buyer@example.test',
            'buyer_name' => 'Jane Doe',
            'title' => 'Loved it',
        ]);

        $this->assertSame(5, $review->storefront_order_id);
        $this->assertSame('buyer@example.test', $review->buyer_email);
        $this->assertSame('Jane Doe', $review->buyer_name);
        $this->assertSame('Loved it', $review->title);
        $this->assertTrue($review->approved);
    }

    public function testDigitalProductUsesReviewRateableTrait(): void
    {
        $this->assertContains(
            'Codebyray\ReviewRateable\Traits\ReviewRateable',
            class_uses(DigitalProduct::class),
        );
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/ProductReviewModelTest.php`
Expected: FAIL (Class ProductReview not found / trait not used).

- [ ] **Step 3: Implement the model and trait**

Create `app/Storefront/Models/ProductReview.php`:

```php
<?php

namespace App\Storefront\Models;

use Codebyray\ReviewRateable\Models\Review;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductReview extends Review
{
    protected $fillable = [
        'reviewable_id',
        'reviewable_type',
        'user_id',
        'review',
        'department',
        'recommend',
        'approved',
        'storefront_order_id',
        'buyer_email',
        'buyer_name',
        'title',
        'hidden_by',
        'hidden_reason',
        'hidden_at',
    ];

    protected $casts = [
        'approved' => 'boolean',
        'recommend' => 'boolean',
        'hidden_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(StorefrontOrder::class, 'storefront_order_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(DigitalProduct::class, 'reviewable_id');
    }
}
```

Modify `app/Storefront/Models/DigitalProduct.php` — add trait import and usage:

```php
use Codebyray\ReviewRateable\Traits\ReviewRateable;
```

```php
class DigitalProduct extends StorefrontModel
{
    use BelongsToWorkspace, ReviewRateable, SoftDeletes;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact tests/Unit/ProductReviewModelTest.php`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/Storefront/Models/ProductReview.php app/Storefront/Models/DigitalProduct.php tests/Unit/ProductReviewModelTest.php
git commit -m "feat: add ProductReview model and ReviewRateable trait to DigitalProduct"
```

---

### Task 3: Public review resource + public review controller and routes

**Files:**
- Create: `app/Storefront/Resources/PublicProductReviewResource.php`
- Create: `app/Storefront/Controllers/ProductReviewsController.php`
- Create: `tests/Unit/ProductReviewTest.php`
- Modify: `common/foundation/routes/api.php` (import + 3 routes at the public route block, lines ~319–342)

**Interfaces:**
- Consumes: `PublicDigitalProducts::product()` (returns approved visible `DigitalProduct`), `StorefrontOrder` (uuid, buyer_email, buyer_name, status, paid), `OrderRecoveryService` (not needed for review auth — verified via order_uuid + buyer_email directly per approved design).
- Produces:
  - `GET public/biolinks/{biolink}/digital-products/{digitalProduct}/reviews` → `['data' => PublicProductReviewResource[], 'summary' => ['average' => ?float, 'rating_stats' => ['counts' => int[1..5], 'percentages' => int[1..5], 'total' => int]]]`
  - `POST .../reviews` body `{order_uuid, buyer_email, stars, title?, review?}` → 201 created/200 updated, returns single `PublicProductReviewResource` payload at `data`.
  - `GET .../reviews/{order}` (order = order uuid) → `['data' => PublicProductReviewResource|null]`
  - `PublicProductReviewResource` shape: `{id, stars, title, review, buyer_name (masked "J***n"), created_at ISO}`.
  - Disabled flag: controller methods abort 404 when `!settings('storefront.reviews_enabled', true)`.

- [ ] **Step 1: Write the failing tests**

Create `tests/Unit/ProductReviewTest.php`:

```php
<?php

namespace Tests\Unit;

use App\Storefront\Controllers\ProductReviewsController;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductReview;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Resources\PublicProductReviewResource;
use Illuminate\Http\Request;
use Tests\TestCase;

class ProductReviewTest extends TestCase
{
    private function makeProduct(): DigitalProduct
    {
        return DigitalProduct::create([
            'workspace_id' => 1,
            'user_id' => 1,
            'title' => 'Ebook',
            'price_cents' => 9900,
            'currency' => 'ETB',
            'status' => 'approved',
        ]);
    }

    private function makeOrder(DigitalProduct $product, string $uuid = 'order-uuid-1'): StorefrontOrder
    {
        return StorefrontOrder::create([
            'uuid' => $uuid,
            'digital_product_id' => $product->id,
            'biolink_id' => 1,
            'creator_id' => 1,
            'buyer_email' => 'buyer@example.test',
            'buyer_name' => 'Jane Doe',
            'currency' => 'ETB',
            'gross_amount_cents' => 9900,
            'status' => 'paid',
            'paid_at' => now(),
        ]);
    }

    public function testStoreCreatesApprovedReviewWithOverallRatingTiedToOrder(): void
    {
        $product = $this->makeProduct();
        $order = $this->makeOrder($product);

        $request = Request::create('/api/v1/public/biolinks/1/digital-products/1/reviews', 'POST', [
            'order_uuid' => $order->uuid,
            'buyer_email' => 'buyer@example.test',
            'stars' => 5,
            'title' => 'Loved it',
            'review' => 'Exactly as described.',
        ]);
        $response = (new ProductReviewsController())->store($request, 1, $product);

        $this->assertSame(201, $response->getStatusCode());

        $review = ProductReview::query()->where('storefront_order_id', $order->id)->first();
        $this->assertNotNull($review);
        $this->assertTrue($review->approved);
        $this->assertSame('buyer@example.test', $review->buyer_email);
        $this->assertSame('Jane Doe', $review->buyer_name);
        $this->assertSame('Loved it', $review->title);
        $this->assertSame(5, $review->ratings()->where('key', 'overall')->value('value'));
    }

    public function testStoreRejectsUnpaidOrNonMatchingOrders(): void
    {
        $product = $this->makeProduct();
        $this->makeOrder($product, 'paid-order');
        $this->makeOrder($product, 'other-order');

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);

        (new ProductReviewsController())->store(
            Request::create('/api/v1/public/biolinks/1/digital-products/1/reviews', 'POST', [
                'order_uuid' => 'other-order',
                'buyer_email' => 'wrong@example.test',
                'stars' => 4,
            ]),
            1,
            $product,
        );
    }

    public function testStoreUpdatesExistingReviewForSameOrderInsteadOfDuplicating(): void
    {
        $product = $this->makeProduct();
        $order = $this->makeOrder($product);
        $product->addReview([
            'review' => 'First take',
            'approved' => true,
            'ratings' => ['overall' => 3],
        ]);
        $existing = ProductReview::query()->first();
        $existing->update(['storefront_order_id' => $order->id, 'buyer_email' => $order->buyer_email, 'buyer_name' => $order->buyer_name]);

        $response = (new ProductReviewsController())->store(
            Request::create('/api/v1/public/biolinks/1/digital-products/1/reviews', 'POST', [
                'order_uuid' => $order->uuid,
                'buyer_email' => 'buyer@example.test',
                'stars' => 4,
                'review' => 'Edited take',
            ]),
            1,
            $product,
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(1, ProductReview::query()->count());
        $review = ProductReview::query()->first();
        $this->assertSame('Edited take', $review->review);
        $this->assertSame(4, $review->ratings()->where('key', 'overall')->value('value'));
    }

    public function testIndexReturnsOnlyApprovedReviewsWithSummary(): void
    {
        $product = $this->makeProduct();
        $product->addReview(['review' => 'Visible', 'approved' => true, 'ratings' => ['overall' => 5]]);
        $product->addReview(['review' => 'Hidden', 'approved' => false, 'ratings' => ['overall' => 1]]);

        $response = (new ProductReviewsController())->index(Request::create('/api/v1/public/biolinks/1/digital-products/1/reviews'), 1, $product);

        $this->assertCount(1, $response['data']);
        $this->assertSame('Visible', $response['data']->first()->review);
        $this->assertSame(5.0, $response['summary']['average']);
        $this->assertSame(1, $response['summary']['rating_stats']['total']);
        $this->assertSame(1, $response['summary']['rating_stats']['counts'][5]);
    }

    public function testShowReturnsReviewByOrderUuid(): void
    {
        $product = $this->makeProduct();
        $order = $this->makeOrder($product);
        $product->addReview(['review' => 'Hi', 'approved' => true, 'ratings' => ['overall' => 4]]);
        $review = ProductReview::query()->first();
        $review->update(['storefront_order_id' => $order->id, 'buyer_email' => $order->buyer_email, 'buyer_name' => 'Jane Doe']);

        $response = (new ProductReviewsController())->show(Request::create('/api/v1/public/biolinks/1/digital-products/1/reviews/' . $order->uuid), 1, $product, $order->uuid);

        $this->assertInstanceOf(PublicProductReviewResource::class, $response);
    }

    public function testResourceMasksBuyerName(): void
    {
        $resource = new PublicProductReviewResource(new ProductReview([
            'reviewable_id' => 1,
            'reviewable_type' => DigitalProduct::class,
            'buyer_name' => 'Jane Doe',
            'title' => null,
            'review' => 'Nice',
        ]));

        $payload = $resource->resolve();

        $this->assertSame('J***e', $payload['buyer_name']);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/ProductReviewTest.php`
Expected: FAIL (Class ProductReviewsController not found).

- [ ] **Step 3: Implement the resource**

Create `app/Storefront/Resources/PublicProductReviewResource.php`:

```php
<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\ProductReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductReview
 */
class PublicProductReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $rating = $this->ratings->firstWhere('key', 'overall');

        return [
            'id' => $this->id,
            'stars' => $rating?->value,
            'title' => $this->title,
            'review' => $this->review,
            'buyer_name' => maskBuyerName($this->buyer_name),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    public static function maskBuyerName(?string $name): ?string
    {
        $name = trim((string) $name);
        if ($name === '') {
            return null;
        }
        $length = mb_strlen($name);
        if ($length <= 2) {
            return mb_substr($name, 0, 1) . '***';
        }

        return mb_substr($name, 0, 1) . '***' . mb_substr($name, -1);
    }
}
```

- [ ] **Step 4: Implement the controller**

Create `app/Storefront/Controllers/ProductReviewsController.php`:

```php
<?php

namespace App\Storefront\Controllers;

use App\Biolinks\Models\Biolink;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductReview;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\PublicDigitalProducts;
use App\Storefront\Resources\PublicProductReviewResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

class ProductReviewsController extends Controller
{
    public function index(Request $request, int $biolink, DigitalProduct $digitalProduct): array
    {
        $this->assertEnabled();
        $product = app(PublicDigitalProducts::class)->product($biolink, $digitalProduct);

        return [
            'data' => PublicProductReviewResource::collection(
                $product
                    ->reviews()
                    ->where('approved', true)
                    ->with('ratings')
                    ->latest()
                    ->get(),
            ),
            'summary' => [
                'average' => $product->averageRating('overall'),
                'rating_stats' => $product->ratingStats(),
            ],
        ];
    }

    public function store(Request $request, int $biolink, DigitalProduct $digitalProduct)
    {
        $this->assertEnabled();
        $product = app(PublicDigitalProducts::class)->product($biolink, $digitalProduct);
        $data = $request->validate([
            'order_uuid' => ['required', 'string', 'max:64'],
            'buyer_email' => ['required', 'email:rfc', 'max:254'],
            'stars' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:120'],
            'review' => ['nullable', 'string', 'max:5000'],
        ]);

        $order = StorefrontOrder::query()
            ->where('uuid', $data['order_uuid'])
            ->where('digital_product_id', $product->id)
            ->where('buyer_email', $data['buyer_email'])
            ->where('status', 'paid')
            ->first();

        abort_unless($order, 422, __('We could not find a paid order matching those details.'));

        $review = DB::transaction(function () use ($product, $order, $data) {
            $existing = ProductReview::query()->where('storefront_order_id', $order->id)->first();

            if ($existing) {
                $existing->update([
                    'review' => $data['review'] ?: null,
                    'title' => $data['title'] ?? null,
                    'approved' => $existing->hidden_at === null,
                ]);
                $rating = $existing->ratings()->where('key', 'overall')->first();
                $rating?->update(['value' => $data['stars']]);

                return $existing->fresh('ratings');
            }

            $review = $product->addReview([
                'review' => $data['review'] ?: null,
                'recommend' => $data['stars'] >= 4,
                'approved' => true,
                'ratings' => ['overall' => $data['stars']],
            ]);
            $review->forceFill([
                'storefront_order_id' => $order->id,
                'buyer_email' => $data['buyer_email'],
                'buyer_name' => $order->buyer_name,
                'title' => $data['title'] ?? null,
            ])->save();

            return $review->fresh('ratings');
        });

        return (new PublicProductReviewResource($review))->response()->setStatusCode($review->wasRecentlyCreated ? 201 : 200);
    }

    public function show(Request $request, int $biolink, DigitalProduct $digitalProduct, string $order)
    {
        $this->assertEnabled();
        $product = app(PublicDigitalProducts::class)->product($biolink, $digitalProduct);
        $review = ProductReview::query()
            ->whereHas('order', fn($query) => $query
                ->where('uuid', $order)
                ->where('digital_product_id', $product->id))
            ->with('ratings')
            ->first();

        return $review ? new PublicProductReviewResource($review) : response()->json(['data' => null]);
    }

    private function assertEnabled(): void
    {
        abort_unless(settings('storefront.reviews_enabled', true), 404);
    }
}
```

Note: tests invoke the controller with `(new ProductReviewsController())->store($request, 1, $product)` — first arg after Request is `int $biolink` (id), matching `PublicDigitalProducts::product()` signature `product(Biolink|int $biolink, DigitalProduct $digitalProduct)`.

- [ ] **Step 5: Register the public routes**

In `common/foundation/routes/api.php`:

Add import:
```php
use App\Storefront\Controllers\ProductReviewsController;
```

Add (next to the other `public/biolinks/...` routes at the end of the file, lines ~319–338):

```php
Route::get('public/biolinks/{biolink}/digital-products/{digitalProduct}/reviews', [ProductReviewsController::class, 'index']);
Route::post('public/biolinks/{biolink}/digital-products/{digitalProduct}/reviews', [ProductReviewsController::class, 'store'])
    ->middleware('throttle:20,1')
    ->withoutMiddleware([
        EnsureFrontendRequestsAreStateful::class,
        VerifyCsrfToken::class,
        VerifyApiAccessMiddleware::class,
    ]);
Route::get('public/biolinks/{biolink}/digital-products/{digitalProduct}/reviews/{order}', [ProductReviewsController::class, 'show']);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `php artisan test --compact tests/Unit/ProductReviewTest.php`
Expected: PASS (6 tests).

- [ ] **Step 7: Commit**

```bash
git add app/Storefront/Resources/PublicProductReviewResource.php app/Storefront/Controllers/ProductReviewsController.php tests/Unit/ProductReviewTest.php common/foundation/routes/api.php
git commit -m "feat: public product reviews API (list, create, update, show)"
```

---

### Task 4: Creator dashboard reviews (read-only) + resource

**Files:**
- Create: `app/Storefront/Resources/CreatorProductReviewResource.php`
- Create: `app/Storefront/Controllers/CreatorProductReviewsController.php`
- Modify: `common/foundation/routes/api.php` (import + route next to `digital-products` apiResource, line ~237)

**Interfaces:**
- Consumes: `DigitalProduct`, `ProductReview`, `ActiveWorkspace` (from `Common\Workspaces\ActiveWorkspace`), `Ratings` relation.
- Produces: `GET digital-products/{digitalProduct}/reviews` (dashboard, authed) → paginated `CreatorProductReviewResource` collection. Ownership enforced like `DigitalProductsController::assertOwner` (workspace + user match, else 403).
- Resource shape: `{id, stars, title, review, buyer_name (masked), created_at, hidden_at, hidden_reason}`. Hidden reviews are included (creator sees moderation state).

- [ ] **Step 1: Write the failing test**

Append to `tests/Unit/ProductReviewTest.php`:

```php
    public function testCreatorIndexReturnsReviewsWithHiddenFlagAndEnforcesOwnership(): void
    {
        $product = $this->makeProduct();
        $product->addReview(['review' => 'Shown', 'approved' => true, 'ratings' => ['overall' => 5]]);
        $product->addReview(['review' => 'Hidden', 'approved' => false, 'ratings' => ['overall' => 2]]);
        ProductReview::query()
            ->where('review', 'Hidden')
            ->update(['hidden_at' => now(), 'hidden_by' => 9, 'hidden_reason' => 'Spam']);

        $request = Request::create('/api/v1/digital-products/1/reviews', 'GET');
        $request->setUserResolver(fn() => (object) ['id' => 1]);
        $response = (new \App\Storefront\Controllers\CreatorProductReviewsController())->index($request, $product);

        $collection = $response->collection->map(fn($resource) => $resource->resolve());
        $this->assertCount(2, $collection);
        $hidden = $collection->firstWhere('title', 'Hidden');
        $this->assertNotNull($hidden['hidden_at']);
        $this->assertSame('Spam', $hidden['hidden_reason']);
        $shown = $collection->firstWhere('title', null);
        $this->assertNull($shown['hidden_at']);
    }
```

(Note: `$request->setUserResolver` is required because `assertOwner` uses `$request->user()`; a real feature test with Sanctum `actingAs` also works — see Step 3 note.)

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=testCreatorIndexReturnsReviewsWithHiddenFlagAndEnforcesOwnership`
Expected: FAIL (Class CreatorProductReviewsController not found).

- [ ] **Step 3: Implement resource + controller**

Create `app/Storefront/Resources/CreatorProductReviewResource.php`:

```php
<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\ProductReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CreatorProductReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $rating = $this->ratings->firstWhere('key', 'overall');

        return [
            'id' => $this->id,
            'stars' => $rating?->value,
            'title' => $this->title,
            'review' => $this->review,
            'buyer_name' => PublicProductReviewResource::maskBuyerName($this->buyer_name),
            'created_at' => $this->created_at?->toIso8601String(),
            'hidden_at' => $this->hidden_at?->toIso8601String(),
            'hidden_reason' => $this->hidden_reason,
        ];
    }
}
```

Create `app/Storefront/Controllers/CreatorProductReviewsController.php`:

```php
<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductReview;
use App\Storefront\Resources\CreatorProductReviewResource;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;

class CreatorProductReviewsController extends Controller
{
    public function index(Request $request, DigitalProduct $digitalProduct): AnonymousResourceCollection
    {
        $this->assertOwner($digitalProduct, $request);
        $perPage = min(max($request->integer('per_page', 15), 1), 100);

        return CreatorProductReviewResource::collection(
            ProductReview::query()
                ->where('reviewable_type', DigitalProduct::class)
                ->where('reviewable_id', $digitalProduct->id)
                ->with('ratings')
                ->latest()
                ->paginate($perPage),
        );
    }

    private function assertOwner(DigitalProduct $product, Request $request): void
    {
        abort_unless(
            $product->workspace_id === ActiveWorkspace::get()->id &&
                $product->user_id === $request->user()->id,
            403,
        );
    }
}
```

- [ ] **Step 4: Register the dashboard route**

In `common/foundation/routes/api.php`:

Add import:
```php
use App\Storefront\Controllers\CreatorProductReviewsController;
```

Add after `Route::apiResource('digital-products', DigitalProductsController::class);` (line ~237):

```php
Route::get('digital-products/{digitalProduct}/reviews', [CreatorProductReviewsController::class, 'index']);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test --compact --filter=testCreatorIndexReturnsReviewsWithHiddenFlagAndEnforcesOwnership`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/Storefront/Resources/CreatorProductReviewResource.php app/Storefront/Controllers/CreatorProductReviewsController.php common/foundation/routes/api.php tests/Unit/ProductReviewTest.php
git commit -m "feat: creator dashboard reviews endpoint"
```

---

### Task 5: Admin moderation controller + resource + routes

**Files:**
- Create: `app/Storefront/Resources/AdminProductReviewResource.php`
- Create: `app/Storefront/Controllers/AdminProductReviewsController.php`
- Modify: `common/foundation/routes/api.php` (import + routes next to `admin/digital-products/*` routes, line ~239–254)

**Interfaces:**
- Consumes: `ProductReview` route binding (`{productReview}`), `DigitalProduct` (product relation), `StorefrontOrder` (buyer email via `order`).
- Produces:
  - `GET admin/digital-products/reviews?search=&status=hidden|visible&page=1&per_page=15` → paginated `AdminProductReviewResource`.
  - `POST admin/digital-products/reviews/{productReview}/hide` body `{reason?}` → sets `approved=false`, `hidden_by=userId`, `hidden_reason`, `hidden_at=now`.
  - `POST admin/digital-products/reviews/{productReview}/unhide` → `approved=true`, clears hidden_*.
  - `DELETE admin/digital-products/reviews/{productReview}` → 204.
- Admin routes live in the authed v1 middleware group — the frontend calls them with `apiClient` (XSRF/CSRF token) so the stateful middleware applies.

- [ ] **Step 1: Write the failing tests**

Append to `tests/Unit/ProductReviewTest.php`:

```php
    public function testAdminHideAndUnhideToggleApprovalAndAuditFields(): void
    {
        $product = $this->makeProduct();
        $product->addReview(['review' => 'Fine', 'approved' => true, 'ratings' => ['overall' => 4]]);
        $review = ProductReview::query()->first();

        $controller = new \App\Storefront\Controllers\AdminProductReviewsController();
        $hideRequest = Request::create('/api/v1/admin/digital-products/reviews/1/hide', 'POST', ['reason' => 'Spam']);
        $hideRequest->setUserResolver(fn() => (object) ['id' => 7]);

        $hideResponse = $controller->hide($hideRequest, $review);
        $review->refresh();
        $this->assertFalse($review->approved);
        $this->assertSame(7, $review->hidden_by);
        $this->assertSame('Spam', $review->hidden_reason);
        $this->assertNotNull($review->hidden_at);

        $controller->unhide(Request::create('/api/v1/admin/digital-products/reviews/1/unhide', 'POST'), $review);
        $review->refresh();
        $this->assertTrue($review->approved);
        $this->assertNull($review->hidden_by);
        $this->assertNull($review->hidden_reason);
        $this->assertNull($review->hidden_at);
    }

    public function testAdminDestroyDeletesReview(): void
    {
        $product = $this->makeProduct();
        $product->addReview(['review' => 'Bye', 'approved' => true, 'ratings' => ['overall' => 3]]);
        $review = ProductReview::query()->first();

        (new \App\Storefront\Controllers\AdminProductReviewsController())->destroy(
            Request::create('/api/v1/admin/digital-products/reviews/1', 'DELETE'),
            $review,
        );

        $this->assertDatabaseMissing('reviews', ['id' => $review->id, 'review' => 'Bye']);
    }

    public function testAdminIndexFiltersByStatusAndSearch(): void
    {
        $product = $this->makeProduct();
        $product->addReview(['review' => 'Keep', 'approved' => true, 'ratings' => ['overall' => 5]]);
        $product->addReview(['review' => 'Drop', 'approved' => false, 'ratings' => ['overall' => 2]]);
        ProductReview::query()->where('review', 'Drop')->update(['hidden_at' => now(), 'hidden_by' => 7]);

        $response = (new \App\Storefront\Controllers\AdminProductReviewsController())->index(
            Request::create('/api/v1/admin/digital-products/reviews', 'GET', ['status' => 'hidden']),
        );

        $this->assertSame(15, $response->resource->perPage());
        $items = $response->collection->map(fn($resource) => $resource->resolve());
        $this->assertCount(1, $items);
        $this->assertSame('Drop', $items->first()['review']);
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=testAdmin`
Expected: FAIL (Class AdminProductReviewsController not found).

- [ ] **Step 3: Implement resource**

Create `app/Storefront/Resources/AdminProductReviewResource.php`:

```php
<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\ProductReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminProductReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $rating = $this->ratings->firstWhere('key', 'overall');

        return [
            'id' => $this->id,
            'stars' => $rating?->value,
            'title' => $this->title,
            'review' => $this->review,
            'buyer_name' => $this->buyer_name,
            'buyer_email' => $this->buyer_email,
            'approved' => $this->approved,
            'hidden_at' => $this->hidden_at?->toIso8601String(),
            'hidden_reason' => $this->hidden_reason,
            'created_at' => $this->created_at?->toIso8601String(),
            'product' => $this->whenLoaded('product', fn() => [
                'id' => $this->product->id,
                'title' => $this->product->title,
            ]),
        ];
    }
}
```

- [ ] **Step 4: Implement controller**

Create `app/Storefront/Controllers/AdminProductReviewsController.php`:

```php
<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\ProductReview;
use App\Storefront\Resources\AdminProductReviewResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;

class AdminProductReviewsController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max($request->integer('per_page', 15), 1), 100);
        $query = ProductReview::query()
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

        return AdminProductReviewResource::collection($query->latest()->paginate($perPage));
    }

    public function hide(Request $request, ProductReview $productReview): AdminProductReviewResource
    {
        $productReview->update([
            'approved' => false,
            'hidden_by' => $request->user()->id,
            'hidden_reason' => $request->string('reason')->trim() ?: null,
            'hidden_at' => now(),
        ]);

        return new AdminProductReviewResource($productReview->fresh(['ratings', 'product']));
    }

    public function unhide(Request $request, ProductReview $productReview): AdminProductReviewResource
    {
        $productReview->update([
            'approved' => true,
            'hidden_by' => null,
            'hidden_reason' => null,
            'hidden_at' => null,
        ]);

        return new AdminProductReviewResource($productReview->fresh(['ratings', 'product']));
    }

    public function destroy(Request $request, ProductReview $productReview)
    {
        $productReview->delete();

        return response()->noContent();
    }
}
```

- [ ] **Step 5: Register admin routes**

In `common/foundation/routes/api.php`:

Add import:
```php
use App\Storefront\Controllers\AdminProductReviewsController;
```

Add next to the other `admin/digital-products/*` routes (after line ~251):

```php
Route::get('admin/digital-products/reviews', [AdminProductReviewsController::class, 'index']);
Route::post('admin/digital-products/reviews/{productReview}/hide', [AdminProductReviewsController::class, 'hide']);
Route::post('admin/digital-products/reviews/{productReview}/unhide', [AdminProductReviewsController::class, 'unhide']);
Route::delete('admin/digital-products/reviews/{productReview}', [AdminProductReviewsController::class, 'destroy']);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `php artisan test --compact --filter=testAdmin`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add app/Storefront/Resources/AdminProductReviewResource.php app/Storefront/Controllers/AdminProductReviewsController.php common/foundation/routes/api.php tests/Unit/ProductReviewTest.php
git commit -m "feat: admin review moderation endpoints (hide, unhide, delete)"
```

---

### Task 6: Refund hook + creator notification job

**Files:**
- Modify: `app/Storefront/DigitalProductRefundService.php:63-65` (inside `$isFull` block)
- Create: `app/Storefront/Jobs/SendStorefrontReviewNotification.php`
- Modify: `tests/Unit/ProductReviewTest.php` (notification test)

**Interfaces:**
- Consumes: `DigitalProductRefundService::record()` (already detects `$isFull`), `StorefrontOrder->entitlements`, `ProductReview`.
- Produces: `SendStorefrontReviewNotification::dispatch($reviewId)` — queued job on `mail` queue, `tries=3`, `backoff=[60,300,900]`, sends a raw mail to `$review->reviewable->creator->email` with product title + star count + review body + dashboard link, guards on `Mail::fake()` friendly singleton call.

- [ ] **Step 1: Write the failing test**

Add `use Illuminate\Support\Facades\Mail;` to the imports at the top of `tests/Unit/ProductReviewTest.php`, then append:

```php
    public function testReviewNotificationJobUsesMailQueueAndSendsToCreator(): void
    {
        Mail::fake();

        $creator = \App\Models\User::factory()->create(['email' => 'u1@example.test', 'name' => 'Creator']);
        $product = $this->makeProduct();
        $product->update(['user_id' => $creator->id]);
        $product->addReview(['review' => 'Nice work', 'approved' => true, 'ratings' => ['overall' => 5]]);
        $review = ProductReview::query()->first();

        $job = new \App\Storefront\Jobs\SendStorefrontReviewNotification($review->id);
        $this->assertSame('mail', $job->queue);
        $this->assertSame(3, $job->tries);
        $this->assertSame([60, 300, 900], $job->backoff);

        $job->handle();
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=testReviewNotificationJobUsesMailQueueAndSendsToCreator`
Expected: FAIL (Class not found).

- [ ] **Step 3: Implement the job**

Create `app/Storefront/Jobs/SendStorefrontReviewNotification.php` (mirror `SendStorefrontReceipt`):

```php
<?php

namespace App\Storefront\Jobs;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductReview;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

class SendStorefrontReviewNotification implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(private readonly int $reviewId)
    {
        $this->onQueue('mail');
    }

    public function handle(): void
    {
        $review = ProductReview::query()
            ->with(['reviewable.creator', 'ratings'])
            ->find($this->reviewId);

        if (!$review?->reviewable instanceof DigitalProduct || !$review->reviewable->creator?->email) {
            return;
        }

        $product = $review->reviewable;
        $stars = $review->ratings->firstWhere('key', 'overall')?->value ?? 0;
        $dashboardUrl = URL::to('/dashboard/my-products/' . $product->id . '/reviews');

        Mail::raw(
            "Hello {$product->creator->name},\n\nYou received a new {$stars}-star review for \"{$product->title}\".\n\n{$review->review}\n\nView all reviews in your dashboard: {$dashboardUrl}",
            fn($message) => $message->to($product->creator->email)->subject(__('You received a new product review')),
        );
    }
}
```

- [ ] **Step 4: Add the dispatch on successful review creation**

In `app/Storefront/Controllers/ProductReviewsController.php` `store()`, before the return:

```php
        if ($review->wasRecentlyCreated) {
            SendStorefrontReviewNotification::dispatch($review->id)->afterCommit();
        }
```

Add import:
```php
use App\Storefront\Jobs\SendStorefrontReviewNotification;
```

- [ ] **Step 5: Implement the refund deletion hook**

In `app/Storefront/DigitalProductRefundService.php` (inside the `if ($isFull)` block):

```php
            if ($isFull) {
                $order->entitlements()->update(['revoked_at' => now()]);
                \App\Storefront\Models\ProductReview::query()
                    ->where('storefront_order_id', $order->id)
                    ->delete();
            }
```

Add import at the top:
```php
use App\Storefront\Models\ProductReview;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `php artisan test --compact tests/Unit/ProductReviewTest.php`
Expected: PASS (job test included).

- [ ] **Step 7: Commit**

```bash
git add app/Storefront/Jobs/SendStorefrontReviewNotification.php app/Storefront/Controllers/ProductReviewsController.php app/Storefront/DigitalProductRefundService.php tests/Unit/ProductReviewTest.php
git commit -m "feat: notify creators of new reviews, delete reviews on full refund"
```

---

### Task 7: Public product page reviews block (frontend)

**Files:**
- Create: `resources/client/digital-products/public/product-reviews-block.tsx`
- Modify: `resources/client/digital-products/public/digital-product-public-pages.tsx` (render block in `PublicDigitalProductPage`, add types)

**Interfaces:**
- Consumes (backend): `GET/`POST/GET `/api/v1/public/biolinks/{biolinkId}/digital-products/{productId}/reviews*` endpoints from Task 3.
- Produces: exported `ProductReviewsBlock` component; props `{product: PublicDigitalProduct; biolinkId: number}`. Fetches list+summary on mount, renders star summary with distribution bars, review cards, and a "Write a review" / "Edit your review" dialog. Uses raw `fetch` with `credentials: 'same-origin'` (mirrors `digital-product-public-pages.tsx` checkout flow). Review cookie key: `digital_product_reviewed_{productId}` = order uuid (read for prefill via the `GET .../reviews/{order}` endpoint).

- [ ] **Step 1: Implement the block component**

Create `resources/client/digital-products/public/product-reviews-block.tsx`:

```tsx
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {StarIcon, StarHalfIcon, StarOffIcon} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import type {PublicDigitalProduct} from './digital-product-public-pages';

type PublicReview = {
  id: number;
  stars: number | null;
  title: string | null;
  review: string | null;
  buyer_name: string | null;
  created_at: string | null;
};

type ReviewsResponse = {
  data?: PublicReview[];
  summary?: {
    average?: number | null;
    rating_stats?: {
      counts?: Record<string, number>;
      percentages?: Record<string, number>;
      total?: number;
    };
  };
};

function reviewCookieName(productId: number) {
  return `digital_product_reviewed_${productId}`;
}

function getReviewCookie(productId: number): string | undefined {
  return document.cookie
    .split('; ')
    .find(value => value.startsWith(`${reviewCookieName(productId)}=`))
    ?.split('=')[1];
}

function setReviewCookie(productId: number, orderUuid: string) {
  document.cookie = `${reviewCookieName(productId)}=${orderUuid}; path=/; max-age=31536000; samesite=lax`;
}

export function ProductReviewsBlock({
  product,
  biolinkId,
}: {
  product: PublicDigitalProduct;
  biolinkId: number;
}) {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [summary, setSummary] = useState<ReviewsResponse['summary']>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ownReview, setOwnReview] = useState<PublicReview>();
  const [ownOrderUuid, setOwnOrderUuid] = useState<string>();

  const baseUrl = `/api/v1/public/biolinks/${biolinkId}/digital-products/${product.id}/reviews`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(baseUrl, {
        credentials: 'same-origin',
        headers: {Accept: 'application/json'},
      });
      if (!response.ok) throw new Error('Unable to load reviews.');
      const payload: ReviewsResponse = await response.json();
      setReviews(payload.data ?? []);
      setSummary(payload.summary);

      const orderUuid = getReviewCookie(product.id);
      setOwnOrderUuid(orderUuid);
      if (orderUuid) {
        const ownResponse = await fetch(`${baseUrl}/${orderUuid}`, {
          credentials: 'same-origin',
          headers: {Accept: 'application/json'},
        });
        if (ownResponse.ok) {
          const ownPayload = await ownResponse.json();
          const found = ownPayload?.data;
          if (found) setOwnReview(found);
        }
      }
    } catch {
      setError('Unable to load reviews.');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, product.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDialog = () => {
    setDialogOpen(true);
  };

  return (
    <section className="flex w-full flex-col gap-4" aria-labelledby="product-reviews-heading">
      <div className="grid items-stretch gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <SummaryCard summary={summary} onWrite={openDialog} canWrite={!ownReview} loading={loading} />
        {reviews.length ? (
          <div className="flex flex-col gap-3">
            {reviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          !loading && (
            <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-card border border-dashed p-6 text-center text-sm text-[var(--biolink-muted-text)]">
              <StarOffIcon className="size-5" />
              <Trans message="No reviews yet. Be the first to review this product." />
            </div>
          )
        )}
      </div>

      {dialogOpen && (
        <ReviewDialog
          productId={product.id}
          baseUrl={baseUrl}
          existing={ownReview}
          orderUuid={ownOrderUuid}
          onClose={() => setDialogOpen(false)}
          onSaved={review => {
            setOwnReview(review);
            setReviews(current =>
              current.some(item => item.id === review.id)
                ? current.map(item => (item.id === review.id ? review : item))
                : [review, ...current],
            );
            setDialogOpen(false);
            void load();
          }}
        />
      )}
    </section>
  );
}

function SummaryCard({
  summary,
  onWrite,
  canWrite,
  loading,
}: {
  summary?: ReviewsResponse['summary'];
  onWrite: () => void;
  canWrite: boolean;
  loading: boolean;
}) {
  const average = summary?.average ?? 0;
  const counts = summary?.rating_stats?.counts ?? {};
  const percentages = summary?.rating_stats?.percentages ?? {};
  const total = summary?.rating_stats?.total ?? 0;

  return (
    <div className="flex flex-col justify-between gap-4 rounded-card border border-[var(--biolink-border)] bg-[var(--biolink-surface-strong)] p-5 text-[var(--biolink-text)]">
      <div className="flex items-center gap-3">
        <p className="text-4xl font-semibold tracking-tight">{loading ? '—' : average.toFixed(1)}</p>
        <div className="flex flex-col gap-1">
          <StarRow value={Math.round(average)} />
          <p className="text-xs text-[var(--biolink-muted-text)]">
            <Trans message=":count reviews" values={{count: total}} />
          </p>
        </div>
      </div>

      {!loading && (
        <div className="flex flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map(star => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="flex w-6 items-center justify-end gap-0.5 text-[var(--biolink-muted-text)]">
                {star}
                <StarIcon className="size-3 fill-current" />
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--biolink-surface)]">
                <div
                  className="h-full rounded-full bg-[var(--biolink-text)]"
                  style={{width: `${percentages[star] ?? 0}%`}}
                />
              </div>
              <span className="w-4 text-end text-[var(--biolink-muted-text)]">
                {counts[star] ?? 0}
              </span>
            </div>
          ))}
        </div>
      )}

      {canWrite && (
        <Button variant="outline" className="w-full" onClick={onWrite} disabled={loading}>
          <StarIcon className="size-4" />
          <Trans message="Write a review" />
        </Button>
      )}
      {!canWrite && (
        <p className="text-center text-xs text-[var(--biolink-muted-text)]">
          <Trans message="You reviewed this product" />
        </p>
      )}
    </div>
  );
}

function ReviewCard({review}: {review: PublicReview}) {
  return (
    <article className="flex flex-col gap-2 rounded-card border border-[var(--biolink-border)] bg-[var(--biolink-surface-strong)] p-5 text-[var(--biolink-text)]">
      <div className="flex items-center justify-between gap-3">
        <StarRow value={review.stars ?? 0} />
        <span className="shrink-0 text-xs text-[var(--biolink-muted-text)]">
          {review.buyer_name ?? <Trans message="Verified buyer" />}
        </span>
      </div>
      {review.title && <h3 className="text-sm font-semibold">{review.title}</h3>}
      {review.review && (
        <p className="text-sm leading-6 whitespace-pre-line text-[var(--biolink-muted-text)]">
          {review.review}
        </p>
      )}
      {review.created_at && (
        <time className="text-xs text-[var(--biolink-muted-text)]" dateTime={review.created_at}>
          {formatDate(review.created_at)}
        </time>
      )}
    </article>
  );
}

function StarRow({value}: {value: number}) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map(star => (
        <StarIcon
          key={star}
          className={star <= value ? 'size-4 fill-current' : 'size-4 text-[var(--biolink-muted-text)]'}
        />
      ))}
    </div>
  );
}

function ReviewDialog({
  productId,
  baseUrl,
  existing,
  orderUuid,
  onClose,
  onSaved,
}: {
  productId: number;
  baseUrl: string;
  existing?: PublicReview;
  orderUuid?: string;
  onClose: () => void;
  onSaved: (review: PublicReview) => void;
}) {
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [review, setReview] = useState(existing?.review ?? '');
  const [orderId, setOrderId] = useState(orderUuid ?? '');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const verified = Boolean(orderUuid);

  const submit = async () => {
    if (stars < 1) {
      setError('Choose a star rating to continue.');
      return;
    }
    if (!verified) {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        setError('Enter a valid email address.');
        return;
      }
      if (orderId.trim().length < 4) {
        setError('Enter the order reference from your receipt.');
        return;
      }
    }

    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
        body: JSON.stringify({
          order_uuid: orderId.trim(),
          buyer_email: email.trim(),
          stars,
          title: title.trim() || undefined,
          review: review.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => undefined);
        throw new Error(payload?.message ?? 'We could not save your review.');
      }
      const payload = await response.json();
      onSaved(payload?.data);
      setReviewCookie(productId, orderId.trim());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not save your review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={open => !open && !submitting && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>
              <StarIcon />
              {existing ? <Trans message="Edit your review" /> : <Trans message="Write a review" />}
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Your review appears right away. It helps other buyers choose with confidence." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            <div className="space-y-4 px-0.5 py-1">
              {!verified && (
                <p className="rounded-input bg-muted p-3 text-xs text-muted-foreground">
                  <Trans message="To review this product, verify your purchase with the order reference and email from your receipt." />
                </p>
              )}
              <StarPicker value={stars} onChange={setStars} />
              <Field.Root>
                <Field.Label>
                  <Trans message="Headline (optional)" />
                </Field.Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} bindToHookForm={false} maxLength={120} />
              </Field.Root>
              <Field.Root>
                <Field.Label>
                  <Trans message="Review (optional)" />
                </Field.Label>
                <Textarea rows={4} value={review} onChange={e => setReview(e.target.value)} bindToHookForm={false} />
              </Field.Root>
              {!verified && (
                <>
                  <Field.Root>
                    <Field.Label>
                      <Trans message="Order reference" />
                    </Field.Label>
                    <Input value={orderId} onChange={e => setOrderId(e.target.value)} bindToHookForm={false} placeholder="e.g. 9f0c..." />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>
                      <Trans message="Email used at checkout" />
                    </Field.Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} bindToHookForm={false} />
                  </Field.Root>
                </>
              )}
              {error && <p className="rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
            </div>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              <Trans message="Cancel" />
            </Button>
            <Button disabled={submitting} onClick={() => void submit()}>
              {submitting ? <Spinner /> : <StarIcon />}
              <Trans message="Submit review" />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StarPicker({value, onChange}: {value: number; onChange: (value: number) => void}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className="rounded-full p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => onChange(star)}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <StarIcon className={star <= value ? 'size-6 fill-current text-amber-500' : 'size-6 text-muted'} />
        </button>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'}).format(new Date(value));
}
```

- [ ] **Step 2: Render the block on the public product page**

In `resources/client/digital-products/public/digital-product-public-pages.tsx`:

Add import:
```tsx
import {ProductReviewsBlock} from './product-reviews-block';
```

In `PublicDigitalProductPage`, after the closing `</div>` of the main grid (line ~283, right after the grid `</div>`), add:

```tsx
        {data.reviews_enabled !== false && (
          <ProductReviewsBlock product={data.product} biolinkId={data.biolink.id} />
        )}
```

Extend `DigitalProductPageData`:

```tsx
export type DigitalProductPageData = {
  biolink: PublicBiolink;
  appearance?: BiolinkAppearanceConfig | null;
  creator?: PublicCreator | null;
  product: PublicDigitalProduct;
  checkout_endpoint?: string;
  back_url?: string | null;
  reviews_enabled?: boolean;
};
```

- [ ] **Step 3: Pass the reviews flag from the page controller**

In `app/Storefront/Controllers/PublicDigitalProductPageController.php`, add `'reviews_enabled' => (bool) settings('storefront.reviews_enabled', true),` to the page data array.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: build succeeds (2 minutes-ish). Then open an approved product page at `http://127.0.0.1:8000/` → verify the reviews block renders with empty state and the dialog opens.

- [ ] **Step 5: Commit**

```bash
git add resources/client/digital-products/public/product-reviews-block.tsx resources/client/digital-products/public/digital-product-public-pages.tsx app/Storefront/Controllers/PublicDigitalProductPageController.php
git commit -m "feat: public product page reviews block with buy-verified review dialog"
```

---

### Task 8: Creator reviews page (frontend)

**Files:**
- Create: `resources/client/dashboard/digital-products/product-reviews-page.tsx`
- Modify: `resources/client/dashboard/digital-products/digital-products-page.tsx` (add "Reviews" dropdown item)
- Modify: `resources/client/dashboard/dashboard-routes.tsx` (route `my-products/:productId/reviews`)

**Interfaces:**
- Consumes: `GET /api/v1/digital-products/{productId}/reviews` (Task 4).
- Produces: `Component()` (lazy route export) fetching reviews with `fetch('/api/v1/digital-products/${productId}/reviews')` + `credentials: 'same-origin'`, table of reviews with stars, title, body, masked buyer, date, hidden badge. Uses `useParams`, `Link`, `Trans`.

- [ ] **Step 1: Implement the page**

Create `resources/client/dashboard/digital-products/product-reviews-page.tsx`:

```tsx
import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  EyeOffIcon,
  StarIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link, useParams} from 'react-router';

type Review = {
  id: number;
  stars: number | null;
  title: string | null;
  review: string | null;
  buyer_name: string | null;
  created_at: string | null;
  hidden_at: string | null;
  hidden_reason: string | null;
};

export function Component() {
  const {productId} = useParams();
  const {trans} = useTrans();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await apiClient.get(
        `/api/v1/digital-products/${productId}/reviews?per_page=100`,
      );
      setReviews(response.data.data ?? []);
    } catch {
      setError(trans({message: 'Unable to load reviews.'}));
    } finally {
      setLoading(false);
    }
  }, [productId, trans]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Product Reviews" />
        </DashboardLayout.SectionTitle>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/dashboard/my-products" />}
        >
          <ArrowLeftIcon />
          <Trans message="Back to products" />
        </Button>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl py-6">
          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <CircleAlertIcon className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <Card.Root>
            <div className="overflow-x-auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>
                      <Trans message="Rating" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Review" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Buyer" />
                    </Table.Head>
                    <Table.Head className="text-center">
                      <Trans message="Status" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Date" />
                    </Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {loading ? (
                    <Table.Row>
                      <Table.Cell colSpan={5}>
                        <Skeleton className="h-20 w-full" />
                      </Table.Cell>
                    </Table.Row>
                  ) : reviews.length ? (
                    reviews.map(review => (
                      <Table.Row key={review.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <StarIcon
                                key={star}
                                className={
                                  star <= (review.stars ?? 0)
                                    ? 'size-3.5 fill-current text-amber-500'
                                    : 'size-3.5 text-muted'
                                }
                              />
                            ))}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <p className="font-medium">{review.title ?? '—'}</p>
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {review.review ?? '—'}
                          </p>
                        </Table.Cell>
                        <Table.Cell className="text-sm">
                          {review.buyer_name ?? <Trans message="Verified buyer" />}
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          {review.hidden_at ? (
                            <Badge variant="outline">
                              <EyeOffIcon />
                              <Trans message="Hidden" />
                            </Badge>
                          ) : (
                            <Badge variant="positive">
                              <Trans message="Visible" />
                            </Badge>
                          )}
                        </Table.Cell>
                        <Table.Cell className="text-sm text-muted-foreground">
                          {review.created_at ? formatDate(review.created_at) : '—'}
                        </Table.Cell>
                      </Table.Row>
                    ))
                  ) : (
                    <Table.Row>
                      <Table.Cell colSpan={5} className="h-28 text-center text-muted-foreground">
                        <Trans message="No reviews yet." />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </div>
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'}).format(new Date(value));
}
```

- [ ] **Step 2: Add the route**

In `resources/client/dashboard/dashboard-routes.tsx`, after the `my-products/:productId/edit` route (line ~411):

```tsx
      {
        path: 'my-products/:productId/reviews',
        lazy: () =>
          import('@app/dashboard/digital-products/product-reviews-page'),
      },
```

- [ ] **Step 3: Add "Reviews" dropdown item to the product card**

In `resources/client/dashboard/digital-products/digital-products-page.tsx`:

- Add imports:
```tsx
import {StarIcon} from 'lucide-react';
```

- In `ProductActions`, after the "Submit for review" `Dropdown.Item` (line ~475) and before the `product.status === 'approved'` block, add:

```tsx
          <Dropdown.LinkItem
            render={
              <Link to={`/dashboard/my-products/${product.id}/reviews`} />
            }
          >
            <StarIcon />
            <Trans message="Reviews" />
          </Dropdown.LinkItem>
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: succeeds. Navigate to `/dashboard/my-products` → open product dropdown → "Reviews" opens the reviews page.

- [ ] **Step 5: Commit**

```bash
git add resources/client/dashboard/digital-products/product-reviews-page.tsx resources/client/dashboard/dashboard-routes.tsx resources/client/dashboard/digital-products/digital-products-page.tsx
git commit -m "feat: creator product reviews page"
```

---

### Task 9: Admin reviews datatable page + nav + settings toggle (frontend)

**Files:**
- Create: `resources/client/admin/digital-products/admin-product-reviews-page.tsx`
- Modify: `resources/client/admin/admin-routes.tsx` (route `admin/digital-products/reviews`)
- Modify: `resources/client/admin/admin-config.tsx` (sidebar icon `StarIcon`)
- Modify: `resources/client/admin/digital-products/admin-digital-products-page.tsx` (header "Reviews" button)
- Modify: `resources/client/admin/settings/app-general-settings.tsx` (storefront reviews toggle → `storefront.reviews_enabled`)

**Interfaces:**
- Consumes: `GET admin/digital-products/reviews` + hide/unhide/delete endpoints (Task 5).
- Produces: `Component()` (lazy route export) datatable with search + status filter (hidden/visible), hide dialog with reason, unhide and delete actions — mirrors `admin-digital-products-page.tsx`.
- Admin route registered inside the `admin` parent route tree; nav icon `'/admin/digital-products/reviews': <StarIcon />`.

- [ ] **Step 1: Implement the page**

Create `resources/client/admin/digital-products/admin-product-reviews-page.tsx`:

```tsx
import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {
  EyeIcon,
  EyeOffIcon,
  HashIcon,
  SearchIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';

type Review = {
  id: number;
  stars: number | null;
  title: string | null;
  review: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  approved: boolean;
  hidden_at: string | null;
  hidden_reason: string | null;
  created_at: string | null;
  product?: {id: number; title: string} | null;
};

type PaginationMeta = {current_page: number; last_page: number; total: number};

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function Component() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');

  const [meta, setMeta] = useState<PaginationMeta>();
  const [currentPage, setCurrentPage] = useState(1);

  const [hideTarget, setHideTarget] = useState<Review>();
  const [hideReason, setHideReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Review>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (page: number = currentPage) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({per_page: '15'});
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (page > 1) params.set('page', String(page));

        const response = await apiClient.get(
          `/api/v1/admin/digital-products/reviews?${params.toString()}`,
        );
        setReviews(response.data.data ?? []);
        setMeta(response.data.meta);
        setCurrentPage(response.data.meta?.current_page ?? 1);
        setError(undefined);
      } catch {
        setError('Unable to load reviews.');
      } finally {
        setLoading(false);
      }
    },
    [search, status, currentPage],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = () => {
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setCurrentPage(1);
  };

  const hide = async () => {
    if (!hideTarget) return;
    setBusy(true);
    try {
      await apiClient.post(
        `/api/v1/admin/digital-products/reviews/${hideTarget.id}/hide`,
        {reason: hideReason.trim() || undefined},
      );
      setHideTarget(undefined);
      setHideReason('');
      await load();
    } catch {
      setError('Unable to hide review.');
    } finally {
      setBusy(false);
    }
  };

  const unhide = async (review: Review) => {
    setBusy(true);
    try {
      await apiClient.post(
        `/api/v1/admin/digital-products/reviews/${review.id}/unhide`,
      );
      await load();
    } catch {
      setError('Unable to restore review.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiClient.delete(
        `/api/v1/admin/digital-products/reviews/${deleteTarget.id}`,
      );
      setDeleteTarget(undefined);
      await load();
    } catch {
      setError('Unable to delete review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Product Reviews" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl py-6">
          {error && (
            <div className="mb-5 rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Card.Root>
            <div className="border-b p-4">
              <form
                className="grid grid-cols-1 gap-3 sm:grid-cols-12"
                onSubmit={e => {
                  e.preventDefault();
                  applyFilters();
                }}
              >
                <div className="sm:col-span-6">
                  <Input
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search reviews, buyers..."
                  />
                </div>
                <div className="sm:col-span-3">
                  <Select.Root
                    value={status}
                    onValueChange={value => setStatus((value as string) ?? '')}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder="Status" />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="">
                        <Trans message="All reviews" />
                      </Select.Item>
                      <Select.Item value="hidden">
                        <Trans message="Hidden" />
                      </Select.Item>
                      <Select.Item value="visible">
                        <Trans message="Visible" />
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                </div>
                <div className="flex gap-2 sm:col-span-3">
                  <Button type="submit" className="flex-1">
                    <SearchIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={resetFilters}
                  >
                    <Trans message="Reset" />
                  </Button>
                </div>
              </form>
            </div>
            <div className="overflow-x-auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>
                      <Trans message="ID" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Product" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Buyer" />
                    </Table.Head>
                    <Table.Head className="text-center">
                      <Trans message="Rating" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Review" />
                    </Table.Head>
                    <Table.Head className="text-center">
                      <Trans message="Status" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Date" />
                    </Table.Head>
                    <Table.Head />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {loading ? (
                    <Table.Row>
                      <Table.Cell colSpan={8} className="h-28 text-center text-muted-foreground">
                        <Trans message="Loading…" />
                      </Table.Cell>
                    </Table.Row>
                  ) : reviews.length ? (
                    reviews.map(review => (
                      <Table.Row key={review.id}>
                        <Table.Cell>
                          <span className="inline-flex items-center gap-1.5 text-foreground">
                            <HashIcon className="size-3.5 text-muted-foreground" />
                            {review.id}
                          </span>
                        </Table.Cell>
                        <Table.Cell className="text-sm">
                          {review.product?.title ?? '—'}
                        </Table.Cell>
                        <Table.Cell>
                          <p className="text-sm">{review.buyer_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">
                            {review.buyer_email}
                          </p>
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <StarIcon
                                key={star}
                                className={
                                  star <= (review.stars ?? 0)
                                    ? 'size-3.5 fill-current text-amber-500'
                                    : 'size-3.5 text-muted'
                                }
                              />
                            ))}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <p className="font-medium">{review.title ?? '—'}</p>
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {review.review ?? '—'}
                          </p>
                          {review.hidden_reason && (
                            <p className="mt-1 text-xs text-destructive">
                              <Trans
                                message="Reason: :reason"
                                values={{reason: review.hidden_reason}}
                              />
                            </p>
                          )}
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          {review.hidden_at ? (
                            <Badge variant="outline">
                              <EyeOffIcon />
                              <Trans message="Hidden" />
                            </Badge>
                          ) : (
                            <Badge variant="positive">
                              <Trans message="Visible" />
                            </Badge>
                          )}
                        </Table.Cell>
                        <Table.Cell className="text-sm text-muted-foreground">
                          {formatDate(review.created_at)}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex justify-end">
                            <Dropdown>
                              <Dropdown.Trigger className="flex size-8 items-center justify-center rounded-input hover:bg-muted">
                                <Trans message="Actions" />
                              </Dropdown.Trigger>
                              <Dropdown.Content align="end">
                                {!review.hidden_at && (
                                  <Dropdown.Item onClick={() => setHideTarget(review)}>
                                    <EyeOffIcon />
                                    <Trans message="Hide" />
                                  </Dropdown.Item>
                                )}
                                {review.hidden_at && (
                                  <Dropdown.Item onClick={() => void unhide(review)}>
                                    <EyeIcon />
                                    <Trans message="Restore" />
                                  </Dropdown.Item>
                                )}
                                <Dropdown.Item
                                  variant="destructive"
                                  onClick={() => setDeleteTarget(review)}
                                >
                                  <Trash2Icon />
                                  <Trans message="Delete" />
                                </Dropdown.Item>
                              </Dropdown.Content>
                            </Dropdown>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  ) : (
                    <Table.Row>
                      <Table.Cell colSpan={8} className="h-28 text-center text-muted-foreground">
                        <Trans message="No reviews found." />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </div>
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  <Trans
                    message="Showing :from - :to of :total"
                    values={{
                      from: (meta.current_page - 1) * 15 + 1,
                      to: Math.min(meta.current_page * 15, meta.total),
                      total: meta.total,
                    }}
                  />
                </p>
                <div className="flex gap-1">
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => void load(currentPage - 1)}
                  >
                    <Trans message="Previous" />
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={currentPage >= meta.last_page}
                    onClick={() => void load(currentPage + 1)}
                  >
                    <Trans message="Next" />
                  </Button>
                </div>
              </div>
            )}
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>

      {hideTarget && (
        <Dialog.Root open onOpenChange={open => !open && !busy && setHideTarget(undefined)}>
          <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Content className="sm:max-w-md">
              <Dialog.Header>
                <Dialog.Title>
                  <EyeOffIcon />
                  <Trans message="Hide review" />
                </Dialog.Title>
                <Dialog.Description>
                  <Trans message="Hidden reviews no longer appear on the public product page." />
                </Dialog.Description>
              </Dialog.Header>
              <Dialog.Body>
                <Field.Root>
                  <Field.Label>
                    <Trans message="Reason (optional)" />
                  </Field.Label>
                  <Textarea
                    rows={3}
                    value={hideReason}
                    onChange={e => setHideReason(e.target.value)}
                    bindToHookForm={false}
                    placeholder="e.g. Contains inaccurate claims"
                  />
                </Field.Root>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setHideTarget(undefined)} disabled={busy}>
                  <Trans message="Cancel" />
                </Button>
                <Button color="danger" disabled={busy} onClick={() => void hide()}>
                  <EyeOffIcon />
                  <Trans message="Hide review" />
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {deleteTarget && (
        <AlertDialog.Root open onOpenChange={open => !open && !busy && setDeleteTarget(undefined)}>
          <AlertDialog.Portal>
            <AlertDialog.Backdrop />
            <AlertDialog.Content size="sm">
              <AlertDialog.Header>
                <AlertDialog.Media className="bg-destructive/10 text-destructive">
                  <Trash2Icon />
                </AlertDialog.Media>
                <AlertDialog.Title>
                  <Trans message="Delete this review?" />
                </AlertDialog.Title>
                <AlertDialog.Description>
                  <Trans message="This removes the review permanently. This action cannot be undone." />
                </AlertDialog.Description>
              </AlertDialog.Header>
              <AlertDialog.Footer>
                <AlertDialog.Cancel disabled={busy}>
                  <Trans message="Cancel" />
                </AlertDialog.Cancel>
                <AlertDialog.Action color="danger" disabled={busy} onClick={() => void remove()}>
                  <Trans message="Delete" />
                </AlertDialog.Action>
              </AlertDialog.Footer>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      )}
    </DashboardLayout.MainSection>
  );
}
```

- [ ] **Step 2: Register the route**

In `resources/client/admin/admin-routes.tsx`, after the `digital-products/payouts` route (line ~114):

```tsx
      {
        path: 'digital-products/reviews',
        lazy: () =>
          import('@app/admin/digital-products/admin-product-reviews-page'),
      },
```

- [ ] **Step 3: Add sidebar icon**

In `resources/client/admin/admin-config.tsx`:

- Add `StarIcon` to the lucide import.
- Add icon mapping:
```tsx
  '/admin/digital-products/reviews': <StarIcon />,
```

- [ ] **Step 4: Link from the admin products page header**

In `resources/client/admin/digital-products/admin-digital-products-page.tsx`, add `StarIcon` import and a second header button next to "Payout requests" (line ~200):

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

- [x] **Step 5: Add the reviews_enabled setting toggle**

**Implemented (differs from original sketch):** the original sketch used a `storefront.reviews_enabled` form field with a render-prop `Switch`, but the shared `CommonGeneralSettings` declares `defaultValues?: {client?: Partial<AdminSettings['client']>}` and `HookForm.Field` accepts children (not render props), and the settings backend saves only `data['client']`. The correct wiring is the KYC pattern (`resources/client/admin/settings/kyc-settings.tsx`):
- `resources/client/main.tsx`: added `storefront?: {reviews_enabled?: boolean}` to the `@ui/settings/settings` `Settings` interface augmentation.
- `resources/client/admin/settings/app-general-settings.tsx`: field name `client.storefront.reviews_enabled`, `defaultValues.client.storefront.reviews_enabled` seeded as `data.client.storefront?.reviews_enabled ?? true`, and `<HookForm.Field name="client.storefront.reviews_enabled"><Field.Label><Switch /><Trans .../></Field.Label></HookForm.Field>` (Switch auto-binds to the form context).
- `Common\Settings\Settings::save()` deletes falsy values, so a disabled toggle would remove the DB row and fall back to the code default. To keep "default enabled" while allowing disabling, added `['name' => 'storefront.reviews_enabled', 'value' => true]` to `resources/defaults/default-settings.php` (fresh installs), created migration `2026_08_13_120231_add_storefront_reviews_enabled_setting.php` (inserts the row for existing installs via `settings()->save()`), and changed backend reads to `settings('storefront.reviews_enabled', false)` in `ProductReviewsController::assertEnabled()` and `PublicDigitalProductPageController::show()`.

- [ ] **Step 6: Build and verify**

Run: `npm run build`
Expected: succeeds. Spot-check `/admin/digital-products` (reviews button), `/admin/settings/general` (toggle), and `npm run lint` if configured.

- [ ] **Step 7: Commit**

```bash
git add resources/client/admin/digital-products/admin-product-reviews-page.tsx resources/client/admin/admin-routes.tsx resources/client/admin/admin-config.tsx resources/client/admin/digital-products/admin-digital-products-page.tsx resources/client/admin/settings/app-general-settings.tsx
git commit -m "feat: admin product reviews datatable, moderation UI and settings toggle"
```

---

### Task 10: Final verification sweep

**Files:** none new.

- [ ] **Step 1: Run the full review test suite**

Run: `php artisan test --compact tests/Unit/ProductReviewTest.php tests/Unit/ProductReviewModelTest.php`
Expected: ALL PASS. Also run the previously existing storefront tests to confirm no regression:
`php artisan test --compact tests/Unit/OrderRecoveryTest.php`

- [ ] **Step 2: Manual smoke test via HTTP**

Run the dev server (`php -S 127.0.0.1:8000` on Windows — already running as hidden background process; rebuild assets with `npm run build` if not done) and verify:
1. `GET /api/v1/public/biolinks/1/digital-products/1/reviews` returns `{data, summary}` even with zero reviews.
2. An approved product page at `http://127.0.0.1:8000/` renders the reviews block.
3. `GET /api/v1/digital-products/{id}/reviews` returns 403 for a non-owner of the product.

- [ ] **Step 3: Final commit of the plan + any stragglers**

```bash
git add docs/superpowers/plans/2026-08-12-product-reviews-ratings.md
git commit -m "docs: add product reviews implementation plan"
```

- [ ] **Step 4: Offer full test suite run**

Run: `php artisan test --compact` and report results (or ask the user whether to run the whole suite).