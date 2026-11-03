<?php

namespace App\CreatorAi\Services;

use App\Models\User;
use App\Storefront\Models\StorefrontOrder;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

/**
 * Strictly read-only, PII-free detail reporting. Pending/review states are
 * counted as activity, but NEVER included in verified revenue or order data.
 */
final class OrderInsightsService
{
    public function __construct(private readonly ScopedReportingService $reporting) {}

    /** @return array<string, mixed> */
    public function insights(
        User $creator,
        int $workspaceId,
        CarbonImmutable $from,
        CarbonImmutable $to,
        int $page = 1,
        int $perPage = 10,
    ): array {
        if ($page < 1 || $page > 100 || $perPage < 1 || $perPage > (int) config('creator_ai.max_orders_per_page', 20)) {
            throw new InvalidArgumentException('Invalid or excessive order page.');
        }

        $orders = $this->reporting->orders($creator, $workspaceId, $from, $to, 'order_insights');

        $counts = (clone $orders)
            ->whereDate('created_at', '>=', $from->toDateString())
            ->whereDate('created_at', '<=', $to->toDateString())
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->map(static fn ($total): int => (int) $total)
            ->all();

        $verified = (clone $orders)
            ->whereIn('status', ['paid', 'fulfilled'])
            ->whereNotNull('paid_at')
            ->whereDate('paid_at', '>=', $from->toDateString())
            ->whereDate('paid_at', '<=', $to->toDateString());

        $salesCount = (clone $verified)->count();
        $revenueCents = (int) (clone $verified)->sum('gross_amount_cents');

        $pageOfOrders = (clone $verified)
            ->with(['product' => static fn ($product) => $product
                ->withTrashed()->select(['id', 'title'])])
            ->orderByDesc('paid_at')
            ->orderByDesc('id')
            ->paginate(
                $perPage,
                ['id', 'uuid', 'digital_product_id', 'status', 'gross_amount_cents', 'paid_at'],
                'page',
                $page
            );

        // Explicit allowlist. Never serialize raw StorefrontOrder models:
        // they also contain buyer contacts, payment evidence and private data.
        $data = collect($pageOfOrders->items())
            ->map(static fn (StorefrontOrder $order): array => [
                'order_id' => $order->uuid,
                'product_title' => $order->product?->title,
                'status' => $order->status,
                'gross_amount_cents' => (int) $order->gross_amount_cents,
                'currency' => 'ETB',
                'paid_at' => $order->paid_at?->toIso8601String(),
            ])->values()->all();

        return [
            'verified_sales_count' => $salesCount,
            'verified_revenue_cents' => $revenueCents,
            'status_counts' => $counts,
            'status_counts_basis' => 'created_at',
            'verified_sales_basis' => 'paid_at',
            'orders' => [
                'data' => $data,
                'page' => $page,
                'per_page' => $perPage,
                'total' => $pageOfOrders->total(),
            ],
            'currency' => 'ETB',
            'revenue_basis' => 'gross',
            'timezone' => 'UTC',
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'as_of' => now()->toIso8601String(),
        ];
    }
}
