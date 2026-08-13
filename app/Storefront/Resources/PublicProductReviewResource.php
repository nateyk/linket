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
            'buyer_name' => self::maskBuyerName($this->buyer_name),
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