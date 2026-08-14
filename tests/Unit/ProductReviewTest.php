<?php

namespace Tests\Unit;

use App\Biolinks\Models\Biolink;
use App\Storefront\Controllers\ProductReviewsController;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductReview;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Resources\PublicProductReviewResource;
use Common\Files\FileEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ProductReviewTest extends TestCase
{
    use DatabaseTransactions;

    private function makeUser(): object
    {
        return \App\Models\User::query()->forceCreate([
            'name' => 'Creator ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }

    private function makeWorkspace(int $userId): int
    {
        return \Common\Workspaces\Models\Workspace::query()->forceCreate([
            'name' => 'Personal',
            'owner_id' => $userId,
            'is_personal' => true,
        ])->id;
    }

    private function makeBiolink(int $userId, int $workspaceId): Biolink
    {
        return Biolink::query()->forceCreate([
            'name' => 'Storefront',
            'back_half' => Str::random(6),
            'user_id' => $userId,
            'workspace_id' => $workspaceId,
        ]);
    }

    private function makeProduct(int $userId, int $workspaceId): DigitalProduct
    {
        $product = DigitalProduct::create([
            'workspace_id' => $workspaceId,
            'user_id' => $userId,
            'title' => 'Ebook',
            'price_cents' => 9900,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
        ]);
        $file = FileEntry::create([
            'name' => 'ebook.pdf',
            'file_name' => 'ebook-' . Str::random(6) . '.pdf',
            'file_size' => 2048,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'public' => 1,
            'user_id' => (string) $userId,
            'disk_prefix' => 'uploads',
            'workspace_id' => $workspaceId,
        ]);
        $product->files()->attach($file->id);

        return $product;
    }

    private function makeProductOnBiolink(): array
    {
        $user = $this->makeUser();
        $workspaceId = $this->makeWorkspace($user->id);
        $biolink = $this->makeBiolink($user->id, $workspaceId);
        $product = $this->makeProduct($user->id, $workspaceId);
        $biolink->digitalProducts()->attach($product->id);

        return [$product, $biolink];
    }

    private function makeOrder(DigitalProduct $product, Biolink $biolink, ?string $uuid = null, string $buyerEmail = 'buyer@example.test'): StorefrontOrder
    {
        return StorefrontOrder::create([
            'uuid' => $uuid ?? (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'biolink_id' => $biolink->id,
            'creator_id' => $biolink->user_id,
            'buyer_email' => $buyerEmail,
            'buyer_name' => 'Jane Doe',
            'currency' => 'ETB',
            'gross_amount_cents' => 9900,
            'commission_bps' => 500,
            'platform_fee_percent' => 5,
            'platform_fee_cents' => 495,
            'creator_earnings_cents' => 9405,
            'status' => 'paid',
            'paid_at' => now(),
        ]);
    }

    private function request(array $payload = [], string $path = '/api/v1/public/biolinks/1/digital-products/1/reviews'): Request
    {
        $request = Request::create('http://127.0.0.1' . $path, 'POST', $payload);
        app()->instance('request', $request);

        return $request;
    }

    public function testStoreCreatesApprovedReviewWithOverallRatingTiedToOrder(): void
    {
        \Illuminate\Support\Facades\Mail::fake();
        [$product, $biolink] = $this->makeProductOnBiolink();
        $order = $this->makeOrder($product, $biolink);

        $response = (new ProductReviewsController())->store(
            $this->request([
                'order_uuid' => $order->uuid,
                'buyer_email' => 'buyer@example.test',
                'stars' => 5,
                'title' => 'Loved it',
                'review' => 'Exactly as described.',
            ]),
            $biolink,
            $product,
        );

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
        [$product, $biolink] = $this->makeProductOnBiolink();
        $this->makeOrder($product, $biolink);
        $other = $this->makeOrder($product, $biolink, null, 'other@example.test');

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);

        (new ProductReviewsController())->store(
            $this->request([
                'order_uuid' => $other->uuid,
                'buyer_email' => 'buyer@example.test',
                'stars' => 4,
            ]),
            $biolink,
            $product,
        );
    }

    public function testStoreUpdatesExistingReviewForSameOrderInsteadOfDuplicating(): void
    {
        [$product, $biolink] = $this->makeProductOnBiolink();
        $order = $this->makeOrder($product, $biolink);
        \App\Storefront\Models\ProductReview::unguarded(fn() => $product->addReview([
            'review' => 'First take',
            'approved' => true,
            'ratings' => ['overall' => 3],
        ]));
        $existing = ProductReview::query()->first();
        $existing->update([
            'storefront_order_id' => $order->id,
            'buyer_email' => $order->buyer_email,
            'buyer_name' => $order->buyer_name,
        ]);

        $response = (new ProductReviewsController())->store(
            $this->request([
                'order_uuid' => $order->uuid,
                'buyer_email' => 'buyer@example.test',
                'stars' => 4,
                'review' => 'Edited take',
            ]),
            $biolink,
            $product,
        );

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(1, ProductReview::query()->where('storefront_order_id', $order->id)->count());
        $review = ProductReview::query()->where('storefront_order_id', $order->id)->first();
        $this->assertSame('Edited take', $review->review);
        $this->assertSame(4, $review->ratings()->where('key', 'overall')->value('value'));
    }

    public function testIndexReturnsOnlyApprovedReviewsWithSummary(): void
    {
        [$product, $biolink] = $this->makeProductOnBiolink();
        ProductReview::unguarded(function () use ($product) {
            $product->addReview(['review' => 'Visible', 'approved' => true, 'ratings' => ['overall' => 5]]);
            $product->addReview(['review' => 'Hidden', 'approved' => false, 'ratings' => ['overall' => 1]]);
        });

        $response = (new ProductReviewsController())->index(
            Request::create('http://127.0.0.1/api/v1/public/biolinks/1/digital-products/1/reviews', 'GET'),
            $biolink,
            $product,
        );

        $this->assertCount(1, $response['data']);
        $this->assertSame('Visible', $response['data']->first()->review);
        $this->assertSame(5.0, $response['summary']['average']);
        $this->assertSame(1, $response['summary']['rating_stats']['total']);
        $this->assertSame(1, $response['summary']['rating_stats']['counts'][5]);
    }

    public function testShowReturnsReviewByOrderUuid(): void
    {
        [$product, $biolink] = $this->makeProductOnBiolink();
        $order = $this->makeOrder($product, $biolink);
        ProductReview::unguarded(fn() => $product->addReview([
            'review' => 'Hi',
            'approved' => true,
            'ratings' => ['overall' => 4],
        ]));
        $review = ProductReview::query()->first();
        $review->update([
            'storefront_order_id' => $order->id,
            'buyer_email' => $order->buyer_email,
            'buyer_name' => 'Jane Doe',
        ]);

        $response = (new ProductReviewsController())->show(
            Request::create('http://127.0.0.1/api/v1/public/biolinks/1/digital-products/1/reviews/' . $order->uuid, 'GET'),
            $biolink,
            $product,
            $order->uuid,
        );

        $this->assertInstanceOf(PublicProductReviewResource::class, $response);
    }

    public function testCreatorIndexReturnsReviewsWithHiddenFlagAndEnforcesOwnership(): void
    {
        [$product, $biolink] = $this->makeProductOnBiolink();
        $user = \App\Models\User::query()->find($biolink->user_id);
        \Illuminate\Support\Facades\Auth::login($user);
        \Common\Workspaces\ActiveWorkspace::clearCache();
        ProductReview::unguarded(fn() => $product->addReview([
            'review' => 'Shown',
            'approved' => true,
            'ratings' => ['overall' => 5],
        ]));
        ProductReview::unguarded(fn() => $product->addReview([
            'review' => 'Hidden',
            'approved' => false,
            'ratings' => ['overall' => 2],
        ]));
        ProductReview::query()
            ->where('reviewable_id', $product->id)
            ->where('review', 'Hidden')
            ->update(['hidden_at' => now(), 'hidden_by' => 9, 'hidden_reason' => 'Spam']);

        $request = Request::create('http://127.0.0.1/api/v1/digital-products/' . $product->id . '/reviews', 'GET');
        $request->setUserResolver(fn() => $user);
        $response = (new \App\Storefront\Controllers\CreatorProductReviewsController())->index($request, $product);

        $collection = $response->collection->map(fn($resource) => $resource->resolve());
        $this->assertCount(2, $collection);
        $hidden = $collection->firstWhere('review', 'Hidden');
        $this->assertNotNull($hidden['hidden_at']);
        $this->assertSame('Spam', $hidden['hidden_reason']);
        $shown = $collection->firstWhere('review', 'Shown');
        $this->assertNull($shown['hidden_at']);
    }

    public function testCreatorIndexRejectsNonOwner(): void
    {
        [$product, $biolink] = $this->makeProductOnBiolink();
        $user = $this->makeUser();
        $workspaceId = $this->makeWorkspace($user->id);
        \Illuminate\Support\Facades\Auth::login($user);
        \Common\Workspaces\ActiveWorkspace::clearCache();
        $product->update(['workspace_id' => $workspaceId]);

        $request = Request::create('http://127.0.0.1/api/v1/digital-products/' . $product->id . '/reviews', 'GET');
        $request->setUserResolver(fn() => $user);

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);

        (new \App\Storefront\Controllers\CreatorProductReviewsController())->index($request, $product);
    }

    public function testAdminHideAndUnhideToggleApprovalAndAuditFields(): void
    {
        [$product] = $this->makeProductOnBiolink();
        ProductReview::unguarded(fn() => $product->addReview([
            'review' => 'Fine',
            'approved' => true,
            'ratings' => ['overall' => 4],
        ]));
        $review = ProductReview::query()->where('reviewable_id', $product->id)->first();

        $controller = new \App\Storefront\Controllers\AdminProductReviewsController();
        $hideRequest = Request::create('http://127.0.0.1/api/v1/admin/digital-products/reviews/1/hide', 'POST', ['reason' => 'Spam']);
        $hideRequest->setUserResolver(fn() => (object) ['id' => 7]);

        $controller->hide($hideRequest, $review);
        $review->refresh();
        $this->assertFalse($review->approved);
        $this->assertSame(7, $review->hidden_by);
        $this->assertSame('Spam', $review->hidden_reason);
        $this->assertNotNull($review->hidden_at);

        $unhideRequest = Request::create('http://127.0.0.1/api/v1/admin/digital-products/reviews/1/unhide', 'POST');
        $unhideRequest->setUserResolver(fn() => (object) ['id' => 7]);
        $controller->unhide($unhideRequest, $review);
        $review->refresh();
        $this->assertTrue($review->approved);
        $this->assertNull($review->hidden_by);
        $this->assertNull($review->hidden_reason);
        $this->assertNull($review->hidden_at);
    }

    public function testAdminDestroyDeletesReview(): void
    {
        [$product] = $this->makeProductOnBiolink();
        ProductReview::unguarded(fn() => $product->addReview([
            'review' => 'Bye',
            'approved' => true,
            'ratings' => ['overall' => 3],
        ]));
        $review = ProductReview::query()->where('reviewable_id', $product->id)->first();

        (new \App\Storefront\Controllers\AdminProductReviewsController())->destroy(
            Request::create('http://127.0.0.1/api/v1/admin/digital-products/reviews/1', 'DELETE'),
            $review,
        );

        $this->assertDatabaseMissing('reviews', ['id' => $review->id, 'review' => 'Bye']);
    }

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

    public function testReviewNotificationJobUsesMailQueueAndSendsToCreator(): void
    {
        [$product, $biolink] = $this->makeProductOnBiolink();
        ProductReview::unguarded(fn() => $product->addReview([
            'review' => 'Nice work',
            'approved' => true,
            'ratings' => ['overall' => 5],
        ]));
        $review = ProductReview::query()->where('reviewable_id', $product->id)->first();

        $job = new \App\Storefront\Jobs\SendStorefrontReviewNotification($review->id);
        $this->assertSame('mail', $job->queue);
        $this->assertSame(3, $job->tries);
        $this->assertSame([60, 300, 900], $job->backoff);

        $mailer = new class {
            public array $rawCalls = [];

            public function raw(string $text, $callback): void
            {
                $this->rawCalls[] = [$text, $callback];
            }
        };
        \Illuminate\Support\Facades\Mail::swap($mailer);
        $job->handle();

        $this->assertCount(1, $mailer->rawCalls);
        [$text, $callback] = $mailer->rawCalls[0];
        $this->assertStringContainsString('5-star', $text);
        $this->assertStringContainsString($product->title, $text);
        $this->assertInstanceOf(\Closure::class, $callback);
    }

    public function testFullRefundDeletesOrderReviewAndRevokesEntitlement(): void
    {
        [$product, $biolink] = $this->makeProductOnBiolink();
        $user = \App\Models\User::query()->find($biolink->user_id);
        $order = $this->makeOrder($product, $biolink);
        ProductReview::unguarded(fn() => $product->addReview([
            'review' => 'Refund me',
            'approved' => true,
            'ratings' => ['overall' => 2],
        ]));
        ProductReview::query()
            ->where('reviewable_id', $product->id)
            ->update(['storefront_order_id' => $order->id]);

        $file = \Common\Files\FileEntry::create([
            'name' => 'ebook.pdf',
            'file_name' => 'ebook-' . Str::random(6) . '.pdf',
            'file_size' => 2048,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'public' => 1,
            'user_id' => (string) $user->id,
            'disk_prefix' => 'uploads',
            'workspace_id' => $product->workspace_id,
        ]);
        $entitlement = $order->entitlements()->create([
            'token' => (string) Str::uuid(),
            'file_entry_id' => $file->id,
            'expires_at' => now()->addDay(),
        ]);

        $transaction = \App\Payments\Models\PaymentTransaction::create([
            'uuid' => (string) Str::uuid(),
            'gateway' => 'chapa',
            'payable_type' => \App\Storefront\Models\StorefrontOrder::class,
            'payable_id' => $order->id,
            'purpose' => 'digital_product',
            'tx_ref' => 'tx-' . Str::random(10),
            'amount' => 99.00,
            'currency' => 'ETB',
            'status' => 'paid',
            'buyer_email' => 'buyer@example.test',
            'buyer_name' => 'Jane Doe',
            'verified_at' => now(),
        ]);

        (new \App\Storefront\DigitalProductRefundService())->record($transaction, $user->id, [
            'amount_cents' => 9900,
            'reason' => 'Not as described',
            'external_reference' => 'ext-' . Str::random(6),
        ]);

        $this->assertSame(0, ProductReview::query()->where('storefront_order_id', $order->id)->count());
        $this->assertNotNull($entitlement->fresh()->revoked_at);
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
}