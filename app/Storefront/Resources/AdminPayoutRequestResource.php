<?php

namespace App\Storefront\Resources;

use App\Storefront\Models\PayoutRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PayoutRequest */
class AdminPayoutRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Never include full receiving destinations or internal notes in the
        // paginated queue; admins inspect them on the protected review route.
        $canReviewDetail = $request->user()?->can('admin.access')
            && $request->routeIs(
                'admin.withdrawals.review',
                'admin.withdrawals.update',
                'admin.withdrawals.submit-transfer',
                'admin.withdrawals.verify-settlement',
            );

        return [
            'id' => $this->id,
            'amount_cents' => $this->amount_cents,
            'currency' => $this->currency,
            'payout_method_label' => $this->payout_method_label,
            'withdrawal_method_name' => $this->withdrawal_method_name,
            'withdrawal_method' => $this->whenLoaded('withdrawalMethod', fn() => [
                'id' => $this->withdrawalMethod?->id,
                'name' => $this->withdrawalMethod?->name,
                'code' => $this->withdrawalMethod?->code,
                'minimum_amount_cents' => $this->withdrawalMethod?->minimum_amount_cents,
                'maximum_amount_cents' => $this->withdrawalMethod?->maximum_amount_cents,
                'destination_label' => $this->withdrawalMethod?->destination_label,
                'instructions' => $this->withdrawalMethod?->instructions,
            ]),
            'payout_destination' => $this->when($canReviewDetail, fn () => $this->payout_destination),
            'status' => $this->status,
            'transfer_reference' => $this->when($canReviewDetail, fn () => $this->transfer_reference),
            'admin_notes' => $this->when($canReviewDetail, fn () => $this->admin_notes),
            'rejection_reason' => $this->rejection_reason,
            'created_at' => $this->created_at,
            'processed_at' => $this->processed_at,
            'paid_at' => $this->paid_at,
            'rejected_at' => $this->rejected_at,
            'cancelled_at' => $this->cancelled_at,
            'creator' => $this->whenLoaded('creator', fn() => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
            ]),
            'processor' => $this->whenLoaded('processor', fn() => [
                'id' => $this->processor->id,
                'name' => $this->processor->name,
            ]),
            'withdrawalMethod' => $this->whenLoaded('withdrawalMethod', fn() => [
                'id' => $this->withdrawalMethod?->id,
                'name' => $this->withdrawalMethod?->name,
                'code' => $this->withdrawalMethod?->code,
                'minimum_amount_cents' => $this->withdrawalMethod?->minimum_amount_cents,
                'maximum_amount_cents' => $this->withdrawalMethod?->maximum_amount_cents,
            ]),
            'activities' => $this->whenLoaded('activities', fn() => $this->activities->map(fn($activity) => [
                'id' => $activity->id,
                'action' => $activity->action,
                'note' => $activity->note,
                'created_at' => $activity->created_at,
                'actor' => $activity->actor ? ['name' => $activity->actor->name] : null,
            ])),
            'payoutMethod' => $this->whenLoaded('payoutMethod', fn() => [
                'id' => $this->payoutMethod?->id,
                'type' => $this->payoutMethod?->type,
                'account_holder' => $this->payoutMethod?->account_holder,
                'display_label' => $this->payoutMethod?->display_label,
            ]),
            'latest_payout_intent' => $this->whenLoaded('latestPayoutIntent', fn() => [
                'status' => $this->latestPayoutIntent?->status,
                ...($canReviewDetail ? [
                    'id' => $this->latestPayoutIntent?->id,
                    'merchant_reference' => $this->latestPayoutIntent?->merchant_reference,
                    'chapa_reference' => $this->latestPayoutIntent?->chapa_reference,
                    'verified_at' => $this->latestPayoutIntent?->verified_at,
                    'last_error' => $this->latestPayoutIntent?->last_error,
                ] : []),
            ]),
        ];
    }
}