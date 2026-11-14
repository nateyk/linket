<?php

declare(strict_types=1);

namespace App\Storefront\Commission;

final class CommissionSnapshot
{
    public readonly float $platformFeePercent;

    public function __construct(
        public readonly int $grossAmountCents,
        public readonly int $commissionBps,
        public readonly int $platformFeeCents,
        public readonly int $creatorEarningsCents,
        public readonly ?int $planId = null,
    ) {
        $this->platformFeePercent = (float) round($commissionBps / 100, 4);
    }

    /**
     * @return array{
     *     commission_bps: int,
     *     commission_plan_id: ?int,
     *     platform_fee_percent: float,
     *     platform_fee_cents: int,
     *     creator_earnings_cents: int
     * }
     */
    public function toArray(): array
    {
        return [
            'commission_bps' => $this->commissionBps,
            'commission_plan_id' => $this->planId,
            'platform_fee_percent' => $this->platformFeePercent,
            'platform_fee_cents' => $this->platformFeeCents,
            'creator_earnings_cents' => $this->creatorEarningsCents,
        ];
    }
}
