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