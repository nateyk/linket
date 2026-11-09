<?php

namespace App\Storefront\Resources;

use App\Payments\VerifyEt\VerifyEtSettings;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\CreatorPaymentMethod;
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
        $availability = app(\App\Storefront\Services\CheckoutAvailability::class);
        $blocker = $this->price_cents > 0 ? $availability->creatorBlocker($this->creator) : null;
        $accounts = VerifyEtSettings::get('enabled')
            ? $availability->eligibleAccounts($this->user_id, $this->workspace_id) : collect();
        if ($this->price_cents > 0 && ! $blocker && strtoupper($this->currency) !== 'ETB') {
            $blocker = 'unsupported_currency';
        }
        if ($this->price_cents > 0 && ! $blocker && $accounts->isEmpty()) {
            $blocker = 'no_eligible_receiving_account';
        }
        $catalog = \App\Storefront\Models\DirectPaymentMethod::query()->get()->keyBy('code');
        $receivingAccounts = $accounts->map(fn (CreatorPaymentMethod $method) => [
            'id' => $method->id,
            'provider' => $method->provider,
            'bank_name' => $catalog->get($method->provider)?->display_name ?? strtoupper($method->provider),
            'account_ending' => substr($method->account_number, -4),
            'account_name' => $method->account_name_raw,
            'instructions' => match (strtolower($method->provider)) {
                'cbe' => __('Transfer the exact amount to Commercial Bank of Ethiopia. Submit your CBE Receipt ID (or older FT reference with 8-digit suffix).'),
                'telebirr' => __('Transfer the exact amount via Telebirr. Submit your 10-character transaction number.'),
                'boa' => __('Transfer the exact amount to Bank of Abyssinia. Submit your reference and 5-digit transaction account suffix.'),
                'dashen' => __('Transfer the exact amount to Dashen Bank. Submit your transaction reference.'),
                'cbebirr' => __('Transfer the exact amount via CBE Birr. Submit your receipt number and wallet phone number.'),
                'mpesa' => __('Transfer the exact amount via M-Pesa. Submit your transaction number.'),
                'awash' => __('Transfer the exact amount to Awash Bank. Submit your receipt reference or receipt URL.'),
                'siinqee' => __('Transfer the exact amount to Siinqee Bank. Submit your receipt reference.'),
                'kaafiebirr' => __('Transfer the exact amount to Kaafie Birr. Submit your receipt reference or receipt URL.'),
                default => __('Transfer the exact amount to the account shown, then submit your transaction reference.'),
            },
        ])->values();

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'learning_outcomes' => $this->learning_outcomes,
            'price_cents' => $this->price_cents,
            'currency' => $this->currency,
            'can_buy' => app(\App\Storefront\Services\AccountMonetizationStatus::class)->canSell($this->creator) && ! $blocker,
            'checkout_blocker' => $blocker,
            'verification_quota_exhausted' => $blocker === 'verification_quota_exhausted',
            'payment_mode' => $this->price_cents === 0 ? 'free' : (VerifyEtSettings::get('enabled') ? 'direct' : 'unavailable'),
            'receiving_accounts' => $receivingAccounts,
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
