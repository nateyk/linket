<?php

namespace App\Analytics\Actions;

use App\Models\User;
use App\Payments\Models\PaymentTransaction;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductPaymentRefund;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontOrder;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Common\Billing\Subscription;
use Illuminate\Support\Facades\DB;

class BuildAdminCommerceInsights
{
    /**
     * @return array<string, mixed>
     */
    public function execute(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $currency = strtoupper((string) config('storefront.currency', 'ETB'));

        $orderTotals = $this->paidOrders($start, $end, $currency)
            ->selectRaw('COUNT(*) as paid_orders')
            ->selectRaw('COALESCE(SUM(gross_amount_cents), 0) as gross_sales_cents')
            ->selectRaw('COALESCE(SUM(platform_fee_cents), 0) as platform_fees_cents')
            ->selectRaw('COALESCE(SUM(creator_earnings_cents), 0) as creator_earnings_cents')
            ->selectRaw("COUNT(DISTINCT LOWER(NULLIF(TRIM(buyer_email), ''))) as unique_customers")
            ->first();

        $refundTotals = $this->refunds($start, $end, $currency)
            ->selectRaw('COALESCE(SUM(amount_cents), 0) as refunds_cents')
            ->selectRaw('COALESCE(SUM(platform_fee_reversal_cents), 0) as platform_fee_reversals_cents')
            ->selectRaw('COALESCE(SUM(creator_earnings_reversal_cents), 0) as creator_earnings_reversals_cents')
            ->first();

        $grossSales = (int) ($orderTotals->gross_sales_cents ?? 0);
        $refunds = (int) ($refundTotals->refunds_cents ?? 0);
        $platformFees = (int) ($orderTotals->platform_fees_cents ?? 0)
            - (int) ($refundTotals->platform_fee_reversals_cents ?? 0);
        $creatorEarnings = (int) ($orderTotals->creator_earnings_cents ?? 0)
            - (int) ($refundTotals->creator_earnings_reversals_cents ?? 0);

        return [
            'currency' => $currency,
            'period' => [
                'start' => $start->toIso8601String(),
                'end' => $end->toIso8601String(),
            ],
            'sales' => [
                'gross_sales_cents' => $grossSales,
                'refunds_cents' => $refunds,
                'net_sales_cents' => $grossSales - $refunds,
                'creator_earnings_cents' => $creatorEarnings,
                'platform_fees_cents' => $platformFees,
                'paid_orders' => (int) ($orderTotals->paid_orders ?? 0),
                'unique_customers' => (int) ($orderTotals->unique_customers ?? 0),
            ],
            'subscriptions' => $this->subscriptionMetrics($start, $end, $currency),
            'payouts' => $this->payoutMetrics($start, $end, $currency),
            'platform' => $this->platformMetrics($start, $end),
            'trend' => $this->salesTrend($start, $end, $currency),
            'top_products' => $this->topProducts($start, $end, $currency),
            'recent_orders' => $this->recentOrders($start, $end, $currency),
        ];
    }

    private function paidOrders(
        CarbonImmutable $start,
        CarbonImmutable $end,
        string $currency,
    ): \Illuminate\Database\Eloquent\Builder {
        return StorefrontOrder::query()
            ->where('status', 'paid')
            ->whereRaw('UPPER(currency) = ?', [$currency])
            ->whereBetween('paid_at', [$start, $end]);
    }

    private function refunds(
        CarbonImmutable $start,
        CarbonImmutable $end,
        string $currency,
    ): \Illuminate\Database\Eloquent\Builder {
        return DigitalProductPaymentRefund::query()
            ->whereRaw('UPPER(currency) = ?', [$currency])
            ->whereBetween('refunded_at', [$start, $end]);
    }

    /** @return array<string, int> */
    private function subscriptionMetrics(
        CarbonImmutable $start,
        CarbonImmutable $end,
        string $currency,
    ): array {
        $revenue = PaymentTransaction::query()
            ->where('purpose', 'subscription')
            ->where('status', 'paid')
            ->whereRaw('UPPER(currency) = ?', [$currency])
            ->whereBetween('verified_at', [$start, $end])
            ->sum('amount');

        $activePaid = Subscription::query()
            ->whereHas('product', fn($query) => $query->where('free', false))
            ->where(function ($query): void {
                $query->whereNull('ends_at')->orWhere('ends_at', '>', now());
            })
            ->count();

        return [
            'revenue_cents' => (int) round((float) $revenue * 100),
            'active_paid' => $activePaid,
        ];
    }

    /** @return array<string, int> */
    private function payoutMetrics(
        CarbonImmutable $start,
        CarbonImmutable $end,
        string $currency,
    ): array {
        $paid = PayoutRequest::query()
            ->where('status', 'paid')
            ->whereRaw('UPPER(currency) = ?', [$currency])
            ->whereBetween('paid_at', [$start, $end])
            ->sum('amount_cents');

        $pending = PayoutRequest::query()
            ->whereIn('status', ['requested', 'processing'])
            ->whereRaw('UPPER(currency) = ?', [$currency])
            ->sum('amount_cents');

        return [
            'paid_cents' => (int) $paid,
            'pending_cents' => (int) $pending,
        ];
    }

    /** @return array<string, int> */
    private function platformMetrics(CarbonImmutable $start, CarbonImmutable $end): array
    {
        return [
            'new_users' => User::query()->whereBetween('created_at', [$start, $end])->count(),
            'total_users' => User::query()->count(),
            'total_products' => DigitalProduct::query()->withTrashed()->count(),
            'published_products' => DigitalProduct::query()->where('status', 'approved')->count(),
            'selling_creators' => StorefrontOrder::query()
                ->where('status', 'paid')
                ->distinct()
                ->count('creator_id'),
        ];
    }

    /** @return list<array{date: string, gross_sales_cents: int, refunds_cents: int, net_sales_cents: int, paid_orders: int}> */
    private function salesTrend(
        CarbonImmutable $start,
        CarbonImmutable $end,
        string $currency,
    ): array {
        $sales = $this->paidOrders($start, $end, $currency)
            ->selectRaw('DATE(paid_at) as report_date')
            ->selectRaw('SUM(gross_amount_cents) as gross_sales_cents')
            ->selectRaw('COUNT(*) as paid_orders')
            ->groupByRaw('DATE(paid_at)')
            ->get()
            ->keyBy('report_date');

        $refunds = $this->refunds($start, $end, $currency)
            ->selectRaw('DATE(refunded_at) as report_date')
            ->selectRaw('SUM(amount_cents) as refunds_cents')
            ->groupByRaw('DATE(refunded_at)')
            ->get()
            ->keyBy('report_date');

        return collect(CarbonPeriod::create($start->startOfDay(), $end->startOfDay()))
            ->map(function ($date) use ($sales, $refunds): array {
                $key = $date->format('Y-m-d');
                $gross = (int) ($sales->get($key)?->gross_sales_cents ?? 0);
                $refunded = (int) ($refunds->get($key)?->refunds_cents ?? 0);

                return [
                    'date' => $key,
                    'gross_sales_cents' => $gross,
                    'refunds_cents' => $refunded,
                    'net_sales_cents' => $gross - $refunded,
                    'paid_orders' => (int) ($sales->get($key)?->paid_orders ?? 0),
                ];
            })
            ->values()
            ->all();
    }

    /** @return list<array{id: int, title: string, paid_orders: int, gross_sales_cents: int, refunds_cents: int, net_sales_cents: int}> */
    private function topProducts(
        CarbonImmutable $start,
        CarbonImmutable $end,
        string $currency,
    ): array {
        $sales = DB::table('storefront_orders')
            ->select('digital_product_id')
            ->selectRaw('COUNT(*) as paid_orders')
            ->selectRaw('SUM(gross_amount_cents) as gross_sales_cents')
            ->where('status', 'paid')
            ->whereRaw('UPPER(currency) = ?', [$currency])
            ->whereBetween('paid_at', [$start, $end])
            ->groupBy('digital_product_id');

        $refunds = DB::table('digital_product_payment_refunds as refunds')
            ->join('storefront_orders as orders', 'orders.id', '=', 'refunds.storefront_order_id')
            ->select('orders.digital_product_id')
            ->selectRaw('SUM(refunds.amount_cents) as refunds_cents')
            ->whereRaw('UPPER(refunds.currency) = ?', [$currency])
            ->whereBetween('refunds.refunded_at', [$start, $end])
            ->groupBy('orders.digital_product_id');

        $activity = DB::query()
            ->fromSub((clone $sales)->select('digital_product_id')->union(
                (clone $refunds)->select('orders.digital_product_id'),
            ), 'activity')
            ->select('digital_product_id')
            ->distinct();

        return DB::query()
            ->fromSub($activity, 'activity')
            ->join('digital_products as products', 'products.id', '=', 'activity.digital_product_id')
            ->leftJoinSub($sales, 'sales', 'sales.digital_product_id', '=', 'activity.digital_product_id')
            ->leftJoinSub($refunds, 'refunds', 'refunds.digital_product_id', '=', 'activity.digital_product_id')
            ->select(['products.id', 'products.title'])
            ->selectRaw('COALESCE(sales.paid_orders, 0) as paid_orders')
            ->selectRaw('COALESCE(sales.gross_sales_cents, 0) as gross_sales_cents')
            ->selectRaw('COALESCE(refunds.refunds_cents, 0) as refunds_cents')
            ->selectRaw('COALESCE(sales.gross_sales_cents, 0) - COALESCE(refunds.refunds_cents, 0) as net_sales_cents')
            ->orderByDesc('net_sales_cents')
            ->orderBy('products.id')
            ->limit(8)
            ->get()
            ->map(fn($product): array => [
                'id' => (int) $product->id,
                'title' => $product->title,
                'paid_orders' => (int) $product->paid_orders,
                'gross_sales_cents' => (int) $product->gross_sales_cents,
                'refunds_cents' => (int) $product->refunds_cents,
                'net_sales_cents' => (int) $product->net_sales_cents,
            ])
            ->all();
    }

    /** @return list<array<string, int|string|null>> */
    private function recentOrders(
        CarbonImmutable $start,
        CarbonImmutable $end,
        string $currency,
    ): array {
        $refunds = DB::table('digital_product_payment_refunds')
            ->select('storefront_order_id')
            ->selectRaw('SUM(amount_cents) as refunds_cents')
            ->groupBy('storefront_order_id');

        return DB::table('storefront_orders as orders')
            ->join('digital_products as products', 'products.id', '=', 'orders.digital_product_id')
            ->join('users as creators', 'creators.id', '=', 'orders.creator_id')
            ->leftJoinSub($refunds, 'refunds', 'refunds.storefront_order_id', '=', 'orders.id')
            ->where('orders.status', 'paid')
            ->whereRaw('UPPER(orders.currency) = ?', [$currency])
            ->whereBetween('orders.paid_at', [$start, $end])
            ->orderByDesc('orders.paid_at')
            ->orderByDesc('orders.id')
            ->limit(8)
            ->get([
                'orders.id',
                'orders.uuid',
                'orders.buyer_name',
                'orders.buyer_email',
                'orders.gross_amount_cents',
                'orders.paid_at',
                'products.title as product_title',
                'creators.name as creator_name',
                DB::raw('COALESCE(refunds.refunds_cents, 0) as refunds_cents'),
            ])
            ->map(fn($order): array => [
                'id' => (int) $order->id,
                'uuid' => $order->uuid,
                'buyer_name' => $order->buyer_name,
                'buyer_email' => $order->buyer_email,
                'product_title' => $order->product_title,
                'creator_name' => $order->creator_name,
                'gross_amount_cents' => (int) $order->gross_amount_cents,
                'refunds_cents' => (int) $order->refunds_cents,
                'paid_at' => CarbonImmutable::parse($order->paid_at)->toIso8601String(),
            ])
            ->all();
    }
}
