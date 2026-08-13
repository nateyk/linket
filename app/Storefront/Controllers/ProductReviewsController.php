<?php

namespace App\Storefront\Controllers;

use App\Biolinks\Models\Biolink;
use App\Storefront\Jobs\SendStorefrontReviewNotification;
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
    public function index(Request $request, Biolink $biolink, DigitalProduct $digitalProduct): array
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

    public function store(Request $request, Biolink $biolink, DigitalProduct $digitalProduct)
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

        $created = false;
        $review = DB::transaction(function () use ($product, $order, $data, &$created) {
            $existing = ProductReview::query()
                ->where('storefront_order_id', $order->id)
                ->first();

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

            $created = true;
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

        if ($created) {
            SendStorefrontReviewNotification::dispatch($review->id)->afterCommit();
        }

        return (new PublicProductReviewResource($review))
            ->response()
            ->setStatusCode($created ? 201 : 200);
    }

    public function show(Request $request, Biolink $biolink, DigitalProduct $digitalProduct, string $order)
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
        abort_unless(settings('storefront.reviews_enabled', false), 404);
    }
}