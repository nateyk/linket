<?php

namespace App\Storefront\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DigitalProductWithdrawalMethodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'destination_label' => $this->destination_label,
            'instructions' => $this->instructions,
            'minimum_amount_cents' => $this->minimum_amount_cents,
            'maximum_amount_cents' => $this->maximum_amount_cents,
            'is_active' => $this->is_active,
            'position' => $this->position,
        ];
    }
}
