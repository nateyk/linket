<?php

namespace App\CreatorAi\Services;

use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Read-only business-service boundary for a future remote ChatGPT MCP server.
 *
 * IMPORTANT: This is NOT an MCP endpoint or an OAuth authenticator. Each
 * future tool MUST first resolve its authenticated Passport subject,
 * enforce audience/scope/consent and the connection's authorized workspace,
 * then call this facade. The facade re-checks workspace and current verified
 * Pro eligibility for every invocation; it never accepts an identity or tier
 * claimed inside tool input.
 *
 * No writes, buyer PII, settlement-account details, payment references,
 * provider calls or generation quota reservations.
 */
final class CreatorMcpReportFacade
{
    public function __construct(
        private readonly CreatorAiAccess $access,
        private readonly ScopedReportingService $reporting,
        private readonly SalesSummaryService $sales,
        private readonly OrderInsightsService $orders,
        private readonly ProductPerformanceService $products,
    ) {}

    /** @return array<string, mixed> */
    public function salesSummary(
        User $creator,
        int $workspaceId,
        CarbonImmutable $from,
        CarbonImmutable $to,
    ): array {
        $this->authorizeMcp($creator, $workspaceId);

        return [
            ...$this->sales->summary($creator, $workspaceId, $from, $to),
            'revenue_basis' => 'gross',
            'timezone' => 'UTC',
            'as_of' => now()->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public function salesTrends(
        User $creator,
        int $workspaceId,
        CarbonImmutable $from,
        CarbonImmutable $to,
    ): array {
        $this->authorizeMcp($creator, $workspaceId);

        // Aggregation is performed by MySQL from authorized, verified ETB
        // orders. The language model must not invent monetary totals.
        $rows = $this->reporting
            ->verifiedOrders($creator, $workspaceId, $from, $to, 'sales_trends')
            ->selectRaw('DATE(paid_at) as day, COUNT(*) as verified_sales_count, SUM(gross_amount_cents) as verified_revenue_cents')
            ->groupByRaw('DATE(paid_at)')
            ->orderByRaw('DATE(paid_at) ASC')
            ->get();

        return [
            'points' => $rows->map(static fn ($row): array => [
                'date' => (string) $row->day,
                'verified_sales_count' => (int) $row->verified_sales_count,
                'verified_revenue_cents' => (int) $row->verified_revenue_cents,
            ])->values()->all(),
            'currency' => 'ETB',
            'revenue_basis' => 'gross',
            'timezone' => 'UTC',
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'as_of' => now()->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public function orderInsights(
        User $creator,
        int $workspaceId,
        CarbonImmutable $from,
        CarbonImmutable $to,
    ): array {
        $this->authorizeMcp($creator, $workspaceId);

        return $this->orders->insights($creator, $workspaceId, $from, $to);
    }

    /** @return array<string, mixed> */
    public function listOrders(
        User $creator,
        int $workspaceId,
        CarbonImmutable $from,
        CarbonImmutable $to,
        int $page = 1,
        int $perPage = 10,
    ): array {
        $this->authorizeMcp($creator, $workspaceId);

        // Reuse the existing strict order allowlist and bounded pagination.
        return $this->orders->insights(
            $creator, $workspaceId, $from, $to, $page, $perPage
        );
    }

    /** @return array<string, mixed> */
    public function productPerformance(
        User $creator,
        int $workspaceId,
        CarbonImmutable $from,
        CarbonImmutable $to,
        int $limit = 10,
    ): array {
        $this->authorizeMcp($creator, $workspaceId);

        return $this->products->performance(
            $creator, $workspaceId, $from, $to, $limit
        );
    }

    /** @return never */
    public function salesForecast(User $creator, int $workspaceId, int $days = 7): never
    {
        $this->authorizeMcp($creator, $workspaceId);

        // Even with a feature flag toggled, never return fabricated forecasts
        // until the reliability-tested forecasting engine is implemented.
        abort(503, 'Linket AI sales forecasting is not yet available.');
    }

    private function authorizeMcp(User $creator, int $workspaceId): void
    {
        $this->access->authorize($creator, $workspaceId, 'mcp');
    }
}
