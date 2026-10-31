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
        $isPaid = in_array($this->status, ['paid', 'fulfilled'], true);

        return [
            'id' => $this->uuid,
            'uuid' => $this->uuid,
            'status' => $this->status,
            'buyer_name' => $this->buyer_name,
            'buyer_email' => $this->buyer_email,
            'product_title' => $this->whenLoaded('product', fn() => $this->product->title),
            'currency' => $this->currency,
            'gross_amount_cents' => $this->gross_amount_cents,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'verification' => $this->whenLoaded('latestDirectPaymentVerification', fn() => $this->latestDirectPaymentVerification ? [
                'status' => $this->latestDirectPaymentVerification->status,
                'error_code' => $this->latestDirectPaymentVerification->latest_error_code,
            ] : null),
            'downloads' => $isPaid
                ? $this->entitlements->map(fn($entitlement) => [
                    'name' => $entitlement->file->getNameWithExtension(),
                    'remaining_downloads' => max(0, $entitlement->download_limit - $entitlement->download_count),
                    'expires_at' => $entitlement->expires_at,
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
