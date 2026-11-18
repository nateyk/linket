<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Storefront\Models\StorefrontPayoutIntent;
use Illuminate\Database\Eloquent\Builder;

/**
 * Filter the admin withdrawal queue using the latest durable Chapa transfer state.
 */
final class AdminPayoutTransferStatusFilter
{
    /** @param Builder<\App\Storefront\Models\PayoutRequest> $query */
    public static function apply(Builder $query, string $status): void
    {
        if ($status === 'not_started') {
            $query->where(function (Builder $builder): void {
                $builder->whereDoesntHave('latestPayoutIntent')
                    ->orWhereHas('latestPayoutIntent', fn (Builder $intent) =>
                        $intent->where('status', StorefrontPayoutIntent::STATUS_PREPARED)
                    );
            });
            return;
        }

        if (!in_array($status, [
            StorefrontPayoutIntent::STATUS_SUBMITTED,
            StorefrontPayoutIntent::STATUS_PROVIDER_PENDING,
            StorefrontPayoutIntent::STATUS_REQUIRES_ACTION,
            StorefrontPayoutIntent::STATUS_SUCCESSFUL,
            StorefrontPayoutIntent::STATUS_FAILED,
        ], true)) {
            return;
        }

        $query->whereHas('latestPayoutIntent', fn (Builder $intent) =>
            $intent->where('status', $status)
        );
    }
}
