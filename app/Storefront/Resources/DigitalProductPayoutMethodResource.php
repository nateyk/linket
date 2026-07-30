<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\DigitalProductPayoutMethod;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin DigitalProductPayoutMethod */
class DigitalProductPayoutMethodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'account_holder' => $this->account_holder,
            'display_label' => $this->display_label,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
