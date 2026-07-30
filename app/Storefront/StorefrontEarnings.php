<?php

namespace App\Storefront;

use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontOrder;

class StorefrontEarnings
{
    public function forCreator(int $creatorId, int $workspaceId, bool $lock = false): array
    {
        $orders = StorefrontOrder::query()
            ->where('creator_id', $creatorId)
            ->where('status', 'paid')
            ->whereHas('product', fn($query) => $query->where('workspace_id', $workspaceId));
        $payouts = PayoutRequest::query()
            ->where('workspace_id', $workspaceId)
            ->where('creator_id', $creatorId);

        if ($lock) {
            $orders = $orders
                ->lockForUpdate()
                ->get([
                    'gross_amount_cents',
                    'platform_fee_cents',
                    'creator_earnings_cents',
                ]);
            $payouts = $payouts
                ->lockForUpdate()
                ->get(['amount_cents', 'status']);

            $grossSales = (int) $orders->sum('gross_amount_cents');
            $platformCommission = (int) $orders->sum('platform_fee_cents');
            $creatorEarnings = (int) $orders->sum('creator_earnings_cents');
            $pendingPayouts = (int) $payouts
                ->where('status', 'pending')
                ->sum('amount_cents');
            $paidOut = (int) $payouts
                ->where('status', 'paid')
                ->sum('amount_cents');
        } else {
            $grossSales = (int) $orders->sum('gross_amount_cents');
            $platformCommission = (int) $orders->sum('platform_fee_cents');
            $creatorEarnings = (int) $orders->sum('creator_earnings_cents');
            $pendingPayouts = (int) (clone $payouts)
                ->where('status', 'pending')
                ->sum('amount_cents');
            $paidOut = (int) $payouts
                ->where('status', 'paid')
                ->sum('amount_cents');
        }

        return [
            'gross_sales_cents' => $grossSales,
            'platform_commission_cents' => $platformCommission,
            'creator_earnings_cents' => $creatorEarnings,
            'available_for_payout_cents' => max(0, $creatorEarnings - $pendingPayouts - $paidOut),
            'pending_payout_cents' => $pendingPayouts,
            'paid_out_cents' => $paidOut,
        ];
    }
}
