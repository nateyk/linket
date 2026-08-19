<?php

namespace App\Storefront;

use App\Storefront\Models\DigitalProductEarningsLedger;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Support\Str;

class DigitalProductFinance
{
    public function creditOrder(StorefrontOrder $order): DigitalProductEarningsLedger
    {
        $order->loadMissing('product');

        return DigitalProductEarningsLedger::query()->firstOrCreate(
            ['source_key' => "sale:{$order->id}"],
            [
                'uuid' => (string) Str::uuid(),
                'workspace_id' => $order->product->workspace_id,
                'creator_id' => $order->creator_id,
                'storefront_order_id' => $order->id,
                'entry_type' => 'sale',
                'amount_cents' => $order->creator_earnings_cents,
                'currency' => $order->currency,
                'available_at' => ($order->paid_at ?? now())->copy()->addDays((int) config('storefront.payout_hold_days', 7)),
                'description' => __('Verified Digital Product sale'),
            ],
        );
    }

    public function summary(int $creatorId, int $workspaceId, bool $lock = false): array
    {
        $entries = DigitalProductEarningsLedger::query()
            ->where('workspace_id', $workspaceId)
            ->where('creator_id', $creatorId);

        if ($lock) {
            $entries->lockForUpdate();
        }

        $entries = $entries->get(['entry_type', 'amount_cents', 'available_at']);
        $now = now();
        $held = (int) $entries->filter(fn(DigitalProductEarningsLedger $entry) => $entry->available_at?->isFuture())->sum('amount_cents');
        $available = (int) $entries->filter(fn(DigitalProductEarningsLedger $entry) => !$entry->available_at || !$entry->available_at->isFuture())->sum('amount_cents');
        $reserved = abs((int) $entries->where('entry_type', 'payout_reserved')->sum('amount_cents'))
            - (int) $entries->where('entry_type', 'payout_released')->sum('amount_cents');
        $lifetime = (int) $entries->whereIn('entry_type', ['sale', 'admin_adjustment'])->sum('amount_cents');
        $netEarnings = (int) $entries->whereIn('entry_type', ['sale', 'refund', 'admin_adjustment'])->sum('amount_cents');
        $orders = StorefrontOrder::query()
            ->where('creator_id', $creatorId)
            ->where('status', 'paid')
            ->whereHas('product', fn($query) => $query->where('workspace_id', $workspaceId));
        $paidOut = (int) \App\Storefront\Models\PayoutRequest::query()
            ->where('workspace_id', $workspaceId)
            ->where('creator_id', $creatorId)
            ->where('status', 'paid')
            ->sum('amount_cents');

        return [
            'held_earnings_cents' => max(0, $held),
            'available_for_payout_cents' => $available,
            'reserved_payout_cents' => max(0, $reserved),
            'lifetime_earnings_cents' => $lifetime,
            'gross_sales_cents' => (int) (clone $orders)->sum('gross_amount_cents'),
            'platform_commission_cents' => (int) (clone $orders)->sum('platform_fee_cents'),
            'creator_earnings_cents' => $netEarnings,
            'pending_payout_cents' => max(0, $reserved),
            'paid_out_cents' => $paidOut,
            'currency' => config('storefront.currency'),
        ];
    }

    public function record(
        int $workspaceId,
        int $creatorId,
        string $sourceKey,
        string $entryType,
        int $amountCents,
        string $currency,
        array $attributes = [],
    ): DigitalProductEarningsLedger {
        return DigitalProductEarningsLedger::query()->firstOrCreate(
            ['source_key' => $sourceKey],
            [
                'uuid' => (string) Str::uuid(),
                'workspace_id' => $workspaceId,
                'creator_id' => $creatorId,
                'entry_type' => $entryType,
                'amount_cents' => $amountCents,
                'currency' => $currency,
                'available_at' => $attributes['available_at'] ?? now(),
                'storefront_order_id' => $attributes['storefront_order_id'] ?? null,
                'payout_request_id' => $attributes['payout_request_id'] ?? null,
                'description' => $attributes['description'] ?? null,
                'metadata' => $attributes['metadata'] ?? null,
            ],
        );
    }
}
