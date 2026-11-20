<?php

declare(strict_types=1);

namespace App\Storefront\Services;

/**
 * One policy for balances, settlement and withdrawal validation.
 * Zero hold days releases only after a platform payment is verified.
 */
final class MarketplacePayoutPolicy
{
    public const HOLD_DAYS_KEY = 'marketplace.payout_hold_days';
    public const MINIMUM_CENTS_KEY = 'marketplace.minimum_payout_cents';

    public function holdDays(): int
    {
        return max(0, min(30, (int) settings(self::HOLD_DAYS_KEY, config('store.payout_hold_days', 0))));
    }

    public function minimumWithdrawalCents(): int
    {
        // Chapa v1 transfers must be at least 1.00 ETB.
        return max(100, min(100000000, (int) settings(self::MINIMUM_CENTS_KEY, 100)));
    }

    public function toArray(): array
    {
        return [
            'payout_hold_days' => $this->holdDays(),
            'minimum_payout_cents' => $this->minimumWithdrawalCents(),
        ];
    }
}
