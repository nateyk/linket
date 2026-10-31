<?php

namespace App\Storefront\Services;

use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentDispute;

final class PaymentDisputeEvidence
{
    /** @return array<string, mixed>|null */
    public function forOrder(StorefrontOrder $order): ?array
    {
        /** @var DirectPaymentVerification|null $verification */
        $verification = $order->latestDirectPaymentVerification;
        if (! $verification) {
            return null;
        }

        return [
            'status' => $verification->status,
            'bank_code' => $verification->bank_code,
            'amount_cents' => $verification->amount_cents,
            'currency' => $verification->currency,
            'provider_request_id' => $verification->provider_request_id,
            'provider_processing_status' => $verification->provider_processing_status,
            'latest_error_code' => $verification->latest_error_code,
            'verified_at' => $verification->verified_at?->toIso8601String(),
            'created_at' => $verification->created_at?->toIso8601String(),
            'updated_at' => $verification->updated_at?->toIso8601String(),
        ];
    }

    /** @return list<array<string, mixed>> */
    public function audit(StorefrontPaymentDispute $dispute): array
    {
        $dispute->loadMissing(['conversation.items', 'events']);

        $lifecycleEvents = ($dispute->events ?? collect())
            ->sortBy('id')
            ->values()
            ->map(fn ($event) => [
                'type' => 'dispute.lifecycle',
                'author' => $event->actor_role,
                'body' => [
                    'from' => $event->from_status,
                    'to' => $event->to_status,
                    'note' => $event->note,
                ],
                'created_at' => $event->created_at?->toIso8601String(),
            ]);

        $items = $dispute->conversation?->items ?? collect();
        $ticketEvents = $items
            ->sortBy('created_at')
            ->values()
            ->map(fn ($item) => [
                'type' => $item->type,
                'author' => $item->author ?? null,
                'body' => $item->type === 'event' ? ($item->body ?? null) : null,
                'created_at' => $item->created_at?->toIso8601String(),
            ]);

        return $lifecycleEvents->concat($ticketEvents)->values()->all();
    }
}
