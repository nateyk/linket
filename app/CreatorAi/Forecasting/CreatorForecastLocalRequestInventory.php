<?php

namespace App\CreatorAi\Forecasting;

use App\CreatorAi\Services\CreatorAiAccess;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Carbon\CarbonImmutable;
use InvalidArgumentException;
use RuntimeException;

/**
 * Workspace-authorized local inventory for comparing Linket-submitted
 * Verify.et request IDs to provider account history.
 *
 * This is a DIAGNOSTIC of a selected creator/workspace's storefront orders,
 * never a provider account-wide completeness assertion. It does not include
 * Pro billing, other workspaces, or API calls made outside Linket.
 */
final class CreatorForecastLocalRequestInventory
{
    public function __construct(private readonly CreatorAiAccess $access) {}

    /** @return list<string> */
    public function hashes(
        User $creator,
        int $workspaceId,
        CarbonImmutable $from,
        CarbonImmutable $to,
    ): array {
        $this->access->authorize($creator, $workspaceId, 'forecast');

        if ($from->getTimezone()->getName() !== 'UTC'
            || $to->getTimezone()->getName() !== 'UTC') {
            throw new InvalidArgumentException('Local verification request dates must use UTC.');
        }

        $start = $from->startOfDay();
        $end = $to->startOfDay();
        if ($start->greaterThan($end)
            || $start->diffInDays($end) > 30
            || $end->greaterThanOrEqualTo(CarbonImmutable::now('UTC')->startOfDay())) {
            throw new InvalidArgumentException('Local verification requests require a closed bounded window.');
        }

        $productIds = DigitalProduct::query()->withTrashed()
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $creator->getKey())
            ->select('id');

        $orderIds = StorefrontOrder::query()
            ->where('creator_id', $creator->getKey())
            ->whereIn('digital_product_id', $productIds)
            ->select('id');

        $requestIds = DirectPaymentVerification::query()
            ->where('payable_type', StorefrontOrder::class)
            ->whereIn('payable_id', $orderIds)
            ->whereNotNull('provider_request_id')
            ->where('created_at', '>=', $start)
            ->where('created_at', '<', $end->addDay())
            ->orderBy('id')
            ->limit(10001)
            ->pluck('provider_request_id');

        if ($requestIds->count() > 10000) {
            throw new RuntimeException('Local verification inventory exceeds the safe snapshot limit.');
        }

        $result = [];
        foreach ($requestIds as $id) {
            if (! is_string($id)
                || preg_match('/^[A-Za-z0-9_-]{8,100}$/D', $id) !== 1) {
                throw new RuntimeException('Local verification inventory contains an invalid provider request ID.');
            }
            $fingerprint = hash('sha256', $id);
            if (isset($result[$fingerprint])) {
                throw new RuntimeException('Local verification inventory contains repeated provider request IDs.');
            }
            $result[$fingerprint] = true;
        }

        $hashes = array_keys($result);
        sort($hashes);

        return $hashes;
    }
}
