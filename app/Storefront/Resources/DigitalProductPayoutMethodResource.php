<?php

declare(strict_types=1);

namespace App\Storefront\Resources;

use App\Storefront\Models\DigitalProductPayoutMethod;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin DigitalProductPayoutMethod */
#[SchemaName('DigitalProductPayoutMethod')]
class DigitalProductPayoutMethodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'withdrawal_method_id' => $this->withdrawal_method_id,
            'withdrawal_method' => $this->whenLoaded('withdrawalMethod', fn () => [
                'id' => $this->withdrawalMethod?->id,
                'name' => $this->withdrawalMethod?->name,
                'code' => $this->withdrawalMethod?->code,
            ]),
            'bank_code' => $this->bank_code,
            'bank_name' => $this->bank_name,
            'account_holder' => $this->account_holder,
            'account_number_last_four' => $this->account_number_last_four,
            'masked_account_number' => $this->maskedAccountNumber(),
            'display_label' => $this->display_label,
            'is_active' => (bool) $this->is_active,
            'is_default' => (bool) $this->is_default,
            'status' => $this->status ?? DigitalProductPayoutMethod::STATUS_ACTIVE,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
