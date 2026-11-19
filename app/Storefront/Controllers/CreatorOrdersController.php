<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductPaymentRefund;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontOrderItem;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class CreatorOrdersController extends Controller
{
    private const ORDER_STATUSES = [
        'pending_payment',
        'verifying',
        'paid',
        'fulfilled',
        'failed_verification',
        'manual_review',
        'expired',
    ];

    private const VERIFIED_ORDER_STATUSES = ['paid', 'fulfilled'];

    public function index(Request $request): array
    {
        $filters = $request->validate([
            'status' => ['nullable', 'in:'.implode(',', self::ORDER_STATUSES)],
            'gateway' => ['nullable', 'in:chapa,verify_et,all'],
            'search' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $base = $this->creatorOrdersQuery($request);
        // Filter the dashboard and its totals together so legacy Verify.et
        // cases never inflate the Chapa revenue or pending-payment widgets.
        if (! empty($filters['gateway']) && $filters['gateway'] !== 'all') {
            $base->where('payment_gateway', $filters['gateway']);
        }
        $summary = $this->orderSummary($base);
        $trendQuery = (clone $base)->whereIn('status', self::VERIFIED_ORDER_STATUSES)->where('currency', 'ETB')->whereNotNull('paid_at');
        if (!empty($filters['from'])) {
            $trendQuery->whereDate('paid_at', '>=', $filters['from']);
        }
        if (!empty($filters['to'])) {
            $trendQuery->whereDate('paid_at', '<=', $filters['to']);
        }
        $salesTrend = $trendQuery->selectRaw('DATE(paid_at) as sale_date, SUM(gross_amount_cents) as amount_cents')
            ->groupByRaw('DATE(paid_at)')->orderBy('sale_date')->get()
            ->map(fn ($row): array => ['date' => $row->sale_date, 'amount_cents' => (int) $row->amount_cents]);

        $query = clone $base;
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['from'])) {
            $query->whereDate('created_at', '>=', $filters['from']);
        }
        if (!empty($filters['to'])) {
            $query->whereDate('created_at', '<=', $filters['to']);
        }
        if (!empty($filters['search'])) {
            $term = '%'.addcslashes($filters['search'], '%_\\').'%';
            $query->where(fn (Builder $q) => $q
                ->where('payment_reference', 'like', $term)
                ->orWhere('chapa_tx_ref', 'like', $term)
                ->orWhere('uuid', 'like', $term)
                ->orWhere('buyer_name', 'like', $term)
                ->orWhere('buyer_email', 'like', $term)
                ->orWhereHas('product', fn (Builder $product) => $product->withTrashed()->where('title', 'like', $term)));
        }

        $totals = [
            'sales_count' => (clone $query)->whereIn('status', self::VERIFIED_ORDER_STATUSES)->count(),
            'sales_cents' => (int) (clone $query)->whereIn('status', self::VERIFIED_ORDER_STATUSES)->sum('gross_amount_cents'),
        ];

        $orders = $query
            ->with([
                'product' => fn ($product) => $product->withTrashed()->with('cover'),
                'entitlements',
            ])
            ->latest()
            ->paginate($filters['per_page'] ?? 25)
            ->withQueryString()
            ->through(fn (StorefrontOrder $order): array => $this->orderPayload($order));

        return [
            'data' => $orders,
            'totals' => $totals,
            'summary' => $summary,
            'sales_trend' => $salesTrend,
            'verification_allowance' => app(\App\Storefront\Services\CreatorVerificationAllowance::class)->summary($request->user()),
        ];
    }

    public function show(Request $request, string $order): array
    {
        $order = $this->creatorOrdersQuery($request)
            ->where('uuid', $order)
            ->with([
                'product' => fn ($product) => $product->withTrashed()->with('cover'),
                'items',
                'entitlements.file',
            ])
            ->firstOrFail();

        return [
            'data' => [
                ...$this->orderPayload($order),
                'buyer_email' => $order->buyer_email,
                'buyer_country' => $order->buyer_country,
                'platform_fee_cents' => (int) $order->platform_fee_cents,
                'creator_earnings_cents' => (int) $order->creator_earnings_cents,
                'payment_gateway' => $order->payment_gateway,
                'delivery' => [
                    'status' => $this->deliveryStatus($order),
                    'entitlements_count' => $order->entitlements->count(),
                    'downloaded_count' => (int) $order->entitlements->sum('download_count'),
                    'download_limit' => (int) $order->entitlements->sum('download_limit'),
                    'files' => $order->entitlements->map(fn ($entitlement): array => [
                        'name' => $entitlement->file?->getNameWithExtension(),
                        'download_count' => (int) $entitlement->download_count,
                        'download_limit' => (int) $entitlement->download_limit,
                        'expires_at' => $entitlement->expires_at?->toIso8601String(),
                        'revoked_at' => $entitlement->revoked_at?->toIso8601String(),
                    ])->values(),
                ],
                'manual_review' => $order->status === 'manual_review' ? [
                    'reason_code' => 'payment_under_review',
                ] : null,
            ],
        ];
    }

    private function creatorOrdersQuery(Request $request): Builder
    {
        $workspace = ActiveWorkspace::get();
        abort_unless($workspace, 403);

        $productIds = DigitalProduct::query()
            ->withTrashed()
            ->where('workspace_id', $workspace->id)
            ->select('id');

        return StorefrontOrder::query()
            ->where('creator_id', $request->user()->id)
            ->whereIn('digital_product_id', $productIds);
    }

    /** @return array<string, mixed> */
    private function orderSummary(Builder $base): array
    {
        $counts = (clone $base)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($count): int => (int) $count)
            ->all();

        return [
            ...$this->commerceMetrics($base),
            'verified_sales_count' => (clone $base)->whereIn('status', self::VERIFIED_ORDER_STATUSES)->count(),
            'free_orders_count' => (clone $base)->whereIn('status', self::VERIFIED_ORDER_STATUSES)
                ->where('gross_amount_cents', '<=', 0)->count(),
            'pending_count' => (clone $base)->whereIn('status', ['pending_payment', 'verifying'])->count(),
            'manual_review_count' => (clone $base)->where('status', 'manual_review')->count(),
            'rejected_count' => (clone $base)->where('status', 'failed_verification')->count(),
            'status_counts' => $counts,
            'currency' => 'ETB',
        ];
    }

    /**
     * Lifetime commerce KPIs use settled ETB sales, never pending payments or
     * another creator's orders. A full refund leaves the paid-order cohort;
     * completed partial refunds reduce revenue and the snapshotted fees.
     *
     * @return array<string, int|float>
     */
    private function commerceMetrics(Builder $base): array
    {
        $paid = (clone $base)->whereIn('status', self::VERIFIED_ORDER_STATUSES)
            ->where('currency', 'ETB');
        $paidOrders = (clone $paid)->where('gross_amount_cents', '>', 0);
        $ordersCount = (clone $paidOrders)->count();
        $gross = (int) (clone $paid)->sum('gross_amount_cents');
        $fees = (int) (clone $paid)->sum('platform_fee_cents');
        $earnings = (int) (clone $paid)->sum('creator_earnings_cents');
        $refunds = DigitalProductPaymentRefund::query()
            ->whereIn('storefront_order_id', (clone $paid)->select('id'))
            ->where('status', DigitalProductPaymentRefund::STATUS_COMPLETED)
            ->where('currency', 'ETB')
            ->selectRaw('COALESCE(SUM(amount_cents), 0) AS gross_reversed')
            ->selectRaw('COALESCE(SUM(creator_earnings_reversal_cents), 0) AS earnings_reversed')
            ->selectRaw('COALESCE(SUM(platform_fee_reversal_cents), 0) AS fees_reversed')
            ->first();

        $netSales = max(0, $gross - (int) $refunds->gross_reversed);
        $netFees = max(0, $fees - (int) $refunds->fees_reversed);
        $afterFees = max(0, $netSales - $netFees);

        return [
            'verified_revenue_cents' => $gross,
            'paid_orders_count' => $ordersCount,
            'creator_earnings_cents' => max(0, $earnings - (int) $refunds->earnings_reversed),
            'platform_fee_cents' => $fees,
            'net_sales_cents' => $netSales,
            // This is an after-platform-fee estimate, not true profit after product costs.
            'gross_profit_cents' => $afterFees,
            'gross_profit_margin_percent' => $netSales > 0 ? round($afterFees / $netSales * 100, 1) : 0.0,
            'items_sold_count' => $this->itemsSold($paidOrders),
            'average_order_cents' => $ordersCount > 0 ? intdiv($netSales + intdiv($ordersCount, 2), $ordersCount) : 0,
        ];
    }

    private function itemsSold(Builder $paidOrders): int
    {
        // Current checkout stores quantities on order items. A historical paid
        // order without items still represents one purchased digital product.
        $units = (int) StorefrontOrderItem::query()
            ->whereIn('storefront_order_id', (clone $paidOrders)->select('id'))
            ->sum('quantity');
        $missingItems = (clone $paidOrders)->whereDoesntHave('items')->count();

        return $units + $missingItems;
    }

    /** @return array<string, mixed> */
    private function orderPayload(StorefrontOrder $order): array
    {
        return [
            'uuid' => $order->uuid,
            'status' => $order->status,
            'buyer_name' => $order->buyer_name,
            'buyer_email' => $order->buyer_email,
            'transaction_reference' => $order->payment_reference ?: $order->chapa_tx_ref,
            'payment_reference' => $order->payment_reference,
            'chapa_tx_ref' => $order->chapa_tx_ref,
            'gross_amount_cents' => (int) $order->gross_amount_cents,
            'currency' => $order->currency,
            'payment_gateway' => $order->payment_gateway,
            'payment_method' => $order->payment_gateway,
            'payment_provider' => $order->payment_gateway,
            'delivery_status' => $this->deliveryStatus($order),
            'created_at' => $order->created_at?->toIso8601String(),
            'paid_at' => $order->paid_at?->toIso8601String(),
            'product' => $order->product ? [
                'id' => $order->product->id,
                'title' => $order->product->title,
                'status' => $order->product->status,
                'cover_url' => $order->product->cover?->url,
            ] : null,
        ];
    }

    private function deliveryStatus(StorefrontOrder $order): string
    {
        if ($order->entitlements->contains(fn ($entitlement): bool => $entitlement->download_count > 0)) {
            return 'downloaded';
        }
        if ($order->entitlements->contains(fn ($entitlement): bool => !$entitlement->revoked_at && $entitlement->expires_at->isFuture())) {
            return 'access_granted';
        }
        return in_array($order->status, self::VERIFIED_ORDER_STATUSES, true) ? 'paid' : 'unknown';
    }
}
