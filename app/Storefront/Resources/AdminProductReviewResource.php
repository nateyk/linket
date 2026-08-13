<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\ProductReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductReview
 */
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