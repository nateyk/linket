<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\StorefrontOrder;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StorefrontOrder
 */
#[SchemaName('StorefrontOrder')]
class StorefrontOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'status' => $this->status,
            'currency' => $this->currency,
            'gross_amount_cents' => $this->gross_amount_cents,
            'platform_fee_cents' => $this->platform_fee_cents,
            'creator_earnings_cents' => $this->creator_earnings_cents,
            'paid_at' => $this->paid_at,
            'created_at' => $this->created_at,
            'product' => $this->whenLoaded('product', fn() => [
                'id' => $this->product->id,
                'title' => $this->product->title,
            ]),
        ];
    }
}
