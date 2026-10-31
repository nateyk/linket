<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DirectPaymentMethod;
use App\Storefront\ProductSampleUrl;
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
            'can_buy' => app(\App\Storefront\Services\AccountMonetizationStatus::class)->canSell($this->creator)
                && ($this->price_cents === 0 || (config('services.verify_et.enabled') && app(\App\Storefront\Services\CreatorVerificationAllowance::class)->summary($this->creator)['can_start_checkout'])),
            'verification_quota_exhausted' => $this->price_cents > 0 && config('services.verify_et.enabled') && !app(\App\Storefront\Services\CreatorVerificationAllowance::class)->summary($this->creator)['can_start_checkout'],
            'payment_mode' => $this->price_cents === 0 ? 'free' : (config('services.verify_et.enabled') ? 'direct' : 'unavailable'),
            'receiving_accounts' => config('services.verify_et.enabled') ? CreatorPaymentMethod::query()
                ->where('workspace_id', $this->workspace_id)->where('user_id', $this->user_id)
                ->get()
                ->filter(fn (CreatorPaymentMethod $method) => $method->isAvailable()
                    && DirectPaymentMethod::query()->where('code', $method->provider)->first()?->isAvailableForCheckout())
                ->map(fn (CreatorPaymentMethod $method) => ['id' => $method->id, 'provider' => $method->provider, 'account_ending' => substr($method->account_number, -4), 'account_name' => $method->account_name_raw])->values() : [],
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
            'samples' => $this->publicSamples(),
        ];
    }

    /**
     * Playable preview metadata only. Paid file ids, names, and paths are
     * never included. URLs are short-lived and checked again at stream time.
     *
     * @return list<array{id: int, title: ?string, kind: string, position: int, duration_ms: ?int, url: string}>
     */
    private function publicSamples(): array
    {
        $store = request()->attributes->get('publicStore') ?? request()->route('biolink');
        if (!$store) {
            return [];
        }

        $samples = $this->resource->relationLoaded('samples')
            ? $this->samples
            : $this->samples()->orderBy('position')->get();

        return $samples->map(fn ($sample): array => [
            'id' => $sample->id,
            'title' => $sample->title,
            'kind' => $sample->kind,
            'position' => (int) $sample->position,
            'duration_ms' => $sample->duration_ms === null ? null : (int) $sample->duration_ms,
            'url' => ProductSampleUrl::temporary($store, $this->resource, $sample),
        ])->values()->all();
    }
}
