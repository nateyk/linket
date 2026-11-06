<?php

namespace App\CreatorAi\Services;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use InvalidArgumentException;

/**
 * Authoritative, bounded and tenant-scoped reporting queries.
 *
 * Always call from the authenticated account context (or validated OAuth
 * subject). No caller can provide a user ID to switch creator identity.
 */
final class ScopedReportingService
{
    public function __construct(private readonly CreatorAiAccess $access) {}

    /** @return Builder<StorefrontOrder> */
    public function orders(
        User $creator,
        int $workspaceId,
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $ability,
    ): Builder {
        $this->access->authorize($creator, $workspaceId, $ability);

        if (
            $from->toDateString() > $to->toDateString()
            || $from->diffInDays($to) > (int) config('creator_ai.max_report_days', 366)
        ) {
            throw new InvalidArgumentException('Invalid or excessive AI reporting period.');
        }

        $productIds = DigitalProduct::query()
            ->withTrashed()
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $creator->id)
            ->select('id');

        return StorefrontOrder::query()
            ->where('creator_id', $creator->id)
            ->whereIn('digital_product_id', $productIds)
            ->where('currency', 'ETB');
    }

    /** @return Builder<StorefrontOrder> */
    public function verifiedOrders(
        User $creator,
        int $workspaceId,
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $ability,
    ): Builder {
        return $this->orders($creator, $workspaceId, $from, $to, $ability)
            ->whereIn('status', ['paid', 'fulfilled'])
            ->whereNotNull('paid_at')
            ->whereDate('paid_at', '>=', $from->toDateString())
            ->whereDate('paid_at', '<=', $to->toDateString());
    }
}
