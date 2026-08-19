<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\PayoutRequest;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PayoutRequest
 */
#[SchemaName('PayoutRequest')]
class PayoutRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'amount_cents' => $this->amount_cents,
            'currency' => $this->currency,
            'payout_method_label' => $this->payout_method_label,
            'withdrawal_method_name' => $this->withdrawal_method_name,
            'withdrawal_method' => $this->whenLoaded('withdrawalMethod', fn() => [
                'id' => $this->withdrawalMethod?->id,
                'name' => $this->withdrawalMethod?->name,
            ]),
            'status' => $this->status,
            'paid_at' => $this->paid_at,
            'processing_at' => $this->processing_at,
            'rejected_at' => $this->rejected_at,
            'cancelled_at' => $this->cancelled_at,
            'transfer_reference' => $this->when(request()->user()?->can('admin.access'), $this->transfer_reference),
            'admin_notes' => $this->when(request()->user()?->can('admin.access'), $this->admin_notes),
            'rejection_reason' => $this->rejection_reason,
            'created_at' => $this->created_at,
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
            ]),
            'activities' => $this->whenLoaded('activities', fn() => $this->activities->map(fn($activity) => [
                'id' => $activity->id,
                'action' => $activity->action,
                'note' => $activity->note,
                'created_at' => $activity->created_at,
                'actor' => $activity->actor ? ['name' => $activity->actor->name] : null,
            ])),
        ];
    }
}
