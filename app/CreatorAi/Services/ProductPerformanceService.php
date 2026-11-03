<?php

namespace App\CreatorAi\Services;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

/**
 * Bounded creator-only product rankings computed from the verified order
 * ledger. No Eloquent resources or order payment details leave the service.
 */
final class ProductPerformanceService
{
    public function __construct(private readonly ScopedReportingService $reporting) {}

    /** @return array<string, mixed> */
    public function performance(
        User $creator,
        int $workspaceId,
        CarbonImmutable $from,
        CarbonImmutable $to,
        int $limit = 10,
    ): array {
        if ($limit < 1 || $limit > (int) config('creator_ai.max_product_results', 20)) {
            throw new InvalidArgumentException('Invalid product result limit.');
        }

        $rows = $this->reporting
            ->verifiedOrders($creator, $workspaceId, $from, $to, 'product_performance')
            ->selectRaw('digital_product_id, COUNT(*) as verified_sales_count, SUM(gross_amount_cents) as verified_revenue_cents')
            ->groupBy('digital_product_id')
            ->orderByDesc('verified_revenue_cents')
            ->orderBy('digital_product_id')
            ->limit($limit)
            ->get();

        $titles = DigitalProduct::query()
            ->withTrashed()
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $creator->id)
            ->whereIn('id', $rows->pluck('digital_product_id')->all())
            ->pluck('title', 'id');

        $items = $rows->map(static fn ($row): array => [
            'id' => (int) $row->digital_product_id,
            'title' => $titles->get($row->digital_product_id),
            'verified_sales_count' => (int) $row->verified_sales_count,
            'verified_revenue_cents' => (int) $row->verified_revenue_cents,
        ])->values()->all();

        return [
            'items' => $items,
            'currency' => 'ETB',
            'revenue_basis' => 'gross',
            'timezone' => 'UTC',
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'as_of' => now()->toIso8601String(),
        ];
    }
}
