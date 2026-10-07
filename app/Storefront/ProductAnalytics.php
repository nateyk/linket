<?php

namespace App\Storefront;

use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductView;
use App\Storefront\Models\StorefrontOrder;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;

class ProductAnalytics
{
    /**
     * Per-product statistics for the period, zero-filled by day.
     *
     * @return array{
     *     period: array{from: string, to: string},
     *     kpis: array{sales_count: int, gross_cents: int, creator_earnings_cents: int, views_count: int, conversion_pct: ?float},
     *     sales_series: array<int, array{date: string, count: int, gross_cents: int}>,
     *     views_series: array<int, array{date: string, count: int}>,
     *     top_countries: array<int, array{country: string, sales_count: int, gross_cents: int}>,
     *     top_referrers: array<int, array{referrer: string, views_count: int}>,
     * }
     */
    public function stats(DigitalProduct $product, CarbonInterface $from, CarbonInterface $to): array
    {
        $orders = $this->paidOrders($product, $from, $to);
        $views = $this->views($product, $from, $to);

        $ordersByDate = [];
        foreach ($orders as $order) {
            $ordersByDate[$order['date']][] = $order;
        }
        $viewsByDate = [];
        foreach ($views as $view) {
            $viewsByDate[$view['date']][] = $view;
        }

        $salesCount = count($orders);
        $grossCents = (int) array_sum(array_column($orders, 'gross_amount_cents'));
        $earnedCents = (int) array_sum(array_column($orders, 'creator_earnings_cents'));
        $viewsCount = count($views);

        $salesSeries = [];
        $viewsSeries = [];
        for ($day = $from->copy(); $day->lte($to); $day = $day->addDay()) {
            $date = $day->format('Y-m-d');
            $dayOrders = $ordersByDate[$date] ?? [];
            $dayViews = $viewsByDate[$date] ?? [];
            $salesSeries[] = [
                'date' => $date,
                'count' => count($dayOrders),
                'gross_cents' => (int) array_sum(array_column($dayOrders, 'gross_amount_cents')),
            ];
            $viewsSeries[] = [
                'date' => $date,
                'count' => count($dayViews),
            ];
        }

        return [
            'period' => [
                'from' => $from->format('Y-m-d'),
                'to' => $to->format('Y-m-d'),
            ],
            'kpis' => [
                'sales_count' => $salesCount,
                'gross_cents' => $grossCents,
                'creator_earnings_cents' => $earnedCents,
                'views_count' => $viewsCount,
                'conversion_pct' => $viewsCount === 0 ? null : round($salesCount / $viewsCount * 100, 1),
            ],
            'sales_series' => $salesSeries,
            'views_series' => $viewsSeries,
            'top_countries' => $this->topCountries($orders),
            'top_referrers' => $this->topReferrers($views),
        ];
    }

    /**
     * Resolve and validate the from/to period from a request.
     *
     * Defaults to the current month and rejects periods longer than 366 days.
     *
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    public function resolvePeriod(Request $request): array
    {
        $data = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $from = isset($data['from']) ? CarbonImmutable::parse($data['from']) : CarbonImmutable::now()->startOfMonth();
        $to = isset($data['to']) ? CarbonImmutable::parse($data['to']) : CarbonImmutable::now();

        abort_unless($from->lte($to), 422, 'The period start must not be after the end.');
        abort_unless($to->diffInDays($from, true) <= 366, 422, 'The period is too long (maximum 366 days).');

        return [$from, $to];
    }

    /**
     * @return array<int, array{date: string, gross_amount_cents: int, creator_earnings_cents: int, buyer_country: ?string}>
     */
    private function paidOrders(DigitalProduct $product, CarbonInterface $from, CarbonInterface $to): array
    {
        $rows = StorefrontOrder::query()
            ->where('digital_product_id', $product->id)
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->orWhere(function ($query) use ($product, $from, $to) {
                $query->where('digital_product_id', $product->id)
                    ->where('status', 'paid')
                    ->whereNull('paid_at')
                    ->whereBetween('created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()]);
            })
            ->get(['paid_at', 'created_at', 'gross_amount_cents', 'creator_earnings_cents', 'buyer_country']);

        return $rows->map(function (StorefrontOrder $order): array {
            $effectiveAt = $order->paid_at ?? $order->created_at;

            return [
                'date' => CarbonImmutable::parse($effectiveAt)->format('Y-m-d'),
                'gross_amount_cents' => (int) $order->gross_amount_cents,
                'creator_earnings_cents' => (int) $order->creator_earnings_cents,
                'buyer_country' => $order->buyer_country,
            ];
        })->values()->all();
    }

    /**
     * @return array<int, array{date: string, referrer: ?string}>
     */
    private function views(DigitalProduct $product, CarbonInterface $from, CarbonInterface $to): array
    {
        $rows = ProductView::query()
            ->where('digital_product_id', $product->id)
            ->whereBetween('created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->get(['created_at', 'referrer']);

        return $rows->map(function (ProductView $view): array {
            return [
                'date' => CarbonImmutable::parse($view->created_at)->format('Y-m-d'),
                'referrer' => $view->referrer,
            ];
        })->values()->all();
    }

    /**
     * @param array<int, array{date: string, gross_amount_cents: int, creator_earnings_cents: int, buyer_country: ?string}> $orders
     * @return array<int, array{country: string, sales_count: int, gross_cents: int}>
     */
    private function topCountries(array $orders): array
    {
        $ranked = [];
        foreach ($orders as $order) {
            $country = $order['buyer_country'];
            if (!$country) {
                continue;
            }
            $ranked[$country]['sales_count'] = ($ranked[$country]['sales_count'] ?? 0) + 1;
            $ranked[$country]['gross_cents'] = ($ranked[$country]['gross_cents'] ?? 0) + $order['gross_amount_cents'];
        }
        uasort($ranked, fn (array $a, array $b): int => $b['sales_count'] <=> $a['sales_count']);

        return array_slice(array_map(
            fn (string $country, array $data): array => [
                'country' => $country,
                'sales_count' => $data['sales_count'],
                'gross_cents' => $data['gross_cents'],
            ],
            array_keys($ranked),
            array_values($ranked),
        ), 0, 6);
    }

    /**
     * @param array<int, array{date: string, referrer: ?string}> $views
     * @return array<int, array{referrer: string, views_count: int}>
     */
    private function topReferrers(array $views): array
    {
        $ranked = [];
        foreach ($views as $view) {
            $referrer = $view['referrer'];
            if (!$referrer) {
                continue;
            }
            $ranked[$referrer] = ($ranked[$referrer] ?? 0) + 1;
        }
        arsort($ranked);

        return array_slice(array_map(
            fn (string $referrer, int $count): array => [
                'referrer' => $referrer,
                'views_count' => $count,
            ],
            array_keys($ranked),
            array_values($ranked),
        ), 0, 10);
    }
}