<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\StorefrontOrder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;

/**
 * @mixin StorefrontOrder
 */
class PublicStorefrontOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isPaid = $this->resource->isCompleted();
        $deliveryStatus = $this->delivery_status ?: ($isPaid ? 'delivered' : 'awaiting_payment');
        $hasEntitlements = $this->relationLoaded('entitlements') && $this->entitlements->isNotEmpty();
        if ($isPaid && $hasEntitlements && $deliveryStatus === StorefrontOrder::DELIVERY_AWAITING_PAYMENT) {
            $deliveryStatus = StorefrontOrder::DELIVERY_DELIVERED;
        }
        $downloadsReady = $isPaid
            && $deliveryStatus === StorefrontOrder::DELIVERY_DELIVERED
            && $hasEntitlements;
        $attemptsRemaining = method_exists($this->resource, 'attemptsRemaining')
            ? $this->resource->attemptsRemaining()
            : max(0, 5 - (int) ($this->verification_attempts ?? 0));
        $sessionLocked = method_exists($this->resource, 'maxAttemptsExceeded')
            ? ($this->resource->maxAttemptsExceeded() || in_array($this->status, ['cancelled', 'expired'], true))
            : ((int) ($this->verification_attempts ?? 0) >= 5 || in_array($this->status, ['cancelled', 'expired'], true));

        return [
            'id' => $this->uuid,
            'uuid' => $this->uuid,
            'status' => $this->status,
            'status_label' => $this->resource->statusLabel(),
            'buyer_name' => $this->buyer_name,
            'buyer_email' => $this->buyer_email,
            'product_title' => $this->whenLoaded('product', fn() => $this->product->title),
            'currency' => $this->currency,
            'gross_amount_cents' => $this->gross_amount_cents,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'verification_attempts' => (int) ($this->verification_attempts ?? 0),
            'attempts_remaining' => $attemptsRemaining,
            'session_locked' => $sessionLocked,
            'delivery_status' => $deliveryStatus,
            'delivered_at' => $this->delivered_at?->toIso8601String(),
            'delivery' => [
                'status' => $deliveryStatus,
                'delivered_at' => $this->delivered_at?->toIso8601String(),
                'files_count' => $this->relationLoaded('entitlements') ? $this->entitlements->count() : 0,
            ],
            'verification' => $this->whenLoaded('latestDirectPaymentVerification', fn() => $this->latestDirectPaymentVerification ? [
                'status' => $this->latestDirectPaymentVerification->status,
                'error_code' => $this->latestDirectPaymentVerification->latest_error_code,
            ] : null),
            'downloads' => $downloadsReady
                ? $this->entitlements->map(fn($entitlement) => [
                    'name' => $entitlement->file?->getNameWithExtension() ?? 'Downloadable File',
                    'remaining_downloads' => max(0, $entitlement->download_limit - $entitlement->download_count),
                    'download_limit' => $entitlement->download_limit,
                    'download_count' => $entitlement->download_count,
                    'expires_at' => $entitlement->expires_at?->toIso8601String() ?? $entitlement->expires_at,
                    'url' => URL::temporarySignedRoute(
                        'storefront.download',
                        $entitlement->expires_at,
                        ['token' => $entitlement->token],
                    ),
                ])->values()
                : [],
        ];
    }
}
