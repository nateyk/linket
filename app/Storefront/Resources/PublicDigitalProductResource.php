<?php

namespace App\Storefront\Resources;

use App\Payments\VerifyEt\VerifyEtSettings;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\CreatorChapaGateway;
use App\Storefront\Services\CreatorVerificationAllowance;
use Common\Workspaces\Models\Workspace;
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
        $paid = (int) $this->price_cents > 0;
        $collector = Workspace::query()->whereKey($this->workspace_id)
            ->value('active_payment_collector') ?: 'verify_et';
        $usesChapa = $paid && $collector === 'chapa';

        // Chapa is an independent seller-hosted collector: its availability
        // must not be gated by Verify.et or the seller's bank account list.
        if ($usesChapa) {
            $blocker = !app(\App\Storefront\Services\AccountMonetizationStatus::class)->canSell($this->creator)
                ? 'creator_restricted'
                : (!app(CreatorVerificationAllowance::class)->isPro($this->creator)
                    ? 'chapa_requires_pro'
                    : (!CreatorChapaGateway::query()->where('workspace_id', $this->workspace_id)->exists()
                        ? 'chapa_not_connected'
                        : null));
        } else {
            $blocker = $paid ? $availability->creatorBlocker($this->creator) : null;
        }

        $accounts = !$usesChapa && VerifyEtSettings::get('enabled')
            ? $availability->eligibleAccounts($this->user_id, $this->workspace_id) : collect();

        if ($paid && ! $blocker && strtoupper((string) $this->currency) !== 'ETB') {
            $blocker = 'unsupported_currency';
        }
        if ($usesChapa && $paid && ! $blocker && (int) $this->price_cents < 100) {
            $blocker = 'amount_below_chapa_minimum';
        }
        if ($paid && ! $usesChapa && ! $blocker && $accounts->isEmpty()) {
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
            'payment_mode' => ! $paid ? 'free'
                : ($usesChapa ? ($blocker ? 'unavailable' : 'chapa')
                    : (VerifyEtSettings::get('enabled') ? 'direct' : 'unavailable')),
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
