<?php

namespace App\CreatorAi\Services;

use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Read-only sales totals for authenticated creators and future MCP tools.
 * Authorization, feature flags and query scope are applied at service level.
 */
final class SalesSummaryService
{
    public function __construct(private readonly ScopedReportingService $reporting) {}

    /**
     * @return array{verified_sales_count: int, verified_revenue_cents: int, currency: string, from: string, to: string}
     */
    public function summary(
        User $creator,
        int $workspaceId,
        CarbonImmutable $from,
        CarbonImmutable $to,
    ): array {
        $verified = $this->reporting->verifiedOrders(
            $creator, $workspaceId, $from, $to, 'sales_summary'
        );

        return [
            'verified_sales_count' => (clone $verified)->count(),
            'verified_revenue_cents' => (int) $verified->sum('gross_amount_cents'),
            'currency' => 'ETB',
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
        ];
    }
}
