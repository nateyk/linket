<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\WorkspacePayoutConfig;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin WorkspacePayoutConfig */
class WorkspacePayoutConfigResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'workspace_id' => $this->workspace_id,
            'withdrawal_method_id' => $this->withdrawal_method_id,
            'withdrawal_account' => $this->withdrawal_account,
            'withdrawal_method' => $this->whenLoaded('withdrawalMethod', fn() => [
                'id' => $this->withdrawalMethod?->id,
                'name' => $this->withdrawalMethod?->name,
                'code' => $this->withdrawalMethod?->code,
                'minimum_amount_cents' => $this->withdrawalMethod?->minimum_amount_cents,
                'maximum_amount_cents' => $this->withdrawalMethod?->maximum_amount_cents,
                'destination_label' => $this->withdrawalMethod?->destination_label,
                'instructions' => $this->withdrawalMethod?->instructions,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}