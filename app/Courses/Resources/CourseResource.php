<?php

namespace App\Courses\Resources;

use App\Courses\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Course */
class CourseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $product = $this->whenLoaded('product');
        return [
            'id' => $this->id,
            'digital_product_id' => $this->digital_product_id,
            'require_sequential_completion' =>
                $this->require_sequential_completion,
            'instructor_user_id' => $this->instructor_user_id,
            'published_at' => $this->published_at,
            'product' => $this->whenLoaded(
                'product',
                fn() => [
                    'id' => $this->product->id,
                    'title' => $this->product->title,
                    'description' => $this->product->description,
                    'learning_outcomes' => $this->product->learning_outcomes,
                    'price_cents' => $this->product->price_cents,
                    'currency' => $this->product->currency,
                    'status' => $this->product->status,
                    'cover' => $this->product->cover
                        ? [
                            'id' => $this->product->cover->id,
                            'url' => $this->product->cover->url,
                        ]
                        : null,
                    'biolink_ids' => $this->when(
                        $this->product->relationLoaded('biolinks'),
                        fn() => $this->product->biolinks->pluck('id')->values(),
                    ),
                ],
            ),
            'chapters' => ChapterResource::collection(
                $this->whenLoaded('chapters'),
            ),
            'chapters_count' => $this->whenCounted('chapters'),
            'lessons_count' => $this->when(
                isset($this->lessons_count),
                $this->lessons_count,
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
