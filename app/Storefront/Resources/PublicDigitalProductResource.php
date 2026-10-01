<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\DigitalProduct;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DigitalProduct
 */
class PublicDigitalProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Compute course-specific aggregates when loaded. Prefer the eager
        // withCount values (no per-product queries); fall back to direct
        // queries for callers that load the course relation without counts.
        $isCourse = ($this->type ?? 'digital') === 'course';
        $course = $this->whenLoaded('course', fn() => $this->course);
        $chaptersCount = null;
        $lessonsCount = null;
        if ($isCourse && $this->relationLoaded('course') && $this->course) {
            $chaptersCount = $this->course->chapters_count
                ?? $this->course->chapters()->count();
            $lessonsCount = $this->course->lessons_count
                ?? \App\Courses\Models\Lesson::where('course_id', $this->course->id)->where('status', 'published')->count();
        }
        $courseId = $isCourse && $this->relationLoaded('course') && $this->course ? $this->course->id : null;
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'learning_outcomes' => $this->learning_outcomes,
            'price_cents' => $this->price_cents,
            'currency' => $this->currency,
            'type' => $this->type ?? 'digital',
            'is_course' => $isCourse,
            'course_id' => $courseId,
            'files_count' => $this->whenCounted('files'),
            'chapters_count' => $chaptersCount,
            'lessons_count' => $lessonsCount,
            'cover' => $this->whenLoaded('cover', fn() => $this->cover ? [
                'url' => $this->cover->url,
            ] : null),
            'creator' => $this->whenLoaded('creator', fn() => [
                'name' => $this->creator->name,
                'verified' => settings('kyc.enabled', false)
                    ? $this->creator->isKycVerified()
                    : $this->creator->email_verified_at !== null,
            ]),
        ];
    }
}
