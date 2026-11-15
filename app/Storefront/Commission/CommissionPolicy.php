<?php

declare(strict_types=1);

namespace App\Storefront\Commission;

use App\Entitlements\Entitlements;
use App\Models\User;
use Common\Billing\Models\Product;

final readonly class CommissionPolicy
{
    /**
     * @param ?Entitlements $entitlements
     * @param ?(\Closure(User): int) $bpsResolver
     * @param ?(\Closure(User): ?Product) $planResolver
     */
    public function __construct(
        private ?Entitlements $entitlements = null,
        private ?\Closure $bpsResolver = null,
        private ?\Closure $planResolver = null,
    ) {
    }

    public function calculate(User $creator, int $grossAmountCents): CommissionSnapshot
    {
        $plan = $this->resolvePlan($creator);
        $bps = max(0, $this->resolveFeeBps($creator));

        $feeCents = $grossAmountCents > 0
            ? (int) intdiv(($grossAmountCents * $bps) + 5000, 10000)
            : 0;

        $creatorEarningsCents = max(0, $grossAmountCents - $feeCents);

        return new CommissionSnapshot(
            grossAmountCents: $grossAmountCents,
            commissionBps: $bps,
            platformFeeCents: $feeCents,
            creatorEarningsCents: $creatorEarningsCents,
            planId: $plan?->id,
        );
    }

    private function resolvePlan(User $creator): ?Product
    {
        if ($this->planResolver !== null) {
            return ($this->planResolver)($creator);
        }

        return $this->entitlements()->planFor($creator);
    }

    private function resolveFeeBps(User $creator): int
    {
        if ($this->bpsResolver !== null) {
            return ($this->bpsResolver)($creator);
        }

        return $this->entitlements()->feeBps($creator);
    }

    private function entitlements(): Entitlements
    {
        return $this->entitlements ?? app(Entitlements::class);
    }
}
