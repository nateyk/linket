<?php

namespace App\CreatorAi\Forecasting;

use App\CreatorAi\Services\ScopedReportingService;
use App\Models\User;
use Carbon\CarbonImmutable;
use InvalidArgumentException;

/** Authenticated, bounded, read-only verified ETB daily history (UTC). */
final class VerifiedRevenueDailySeries
{
    public function __construct(private readonly ScopedReportingService $reporting) {}

    /** @return list<array{date:string,verified_sales_count:int,verified_revenue_cents:int}> */
    public function forCreator(User $creator, int $workspaceId, CarbonImmutable $from, CarbonImmutable $to): array
    {
        if ($from->getTimezone()->getName() !== 'UTC' || $to->getTimezone()->getName() !== 'UTC') {
            throw new InvalidArgumentException('Forecast dates must be UTC.');
        }
        $from = $from->startOfDay();
        $to = $to->startOfDay();

        if ($to->greaterThanOrEqualTo(CarbonImmutable::now('UTC')->startOfDay())) {
            throw new InvalidArgumentException('Incomplete UTC days are not valid historical data.');
        }

        // Reuse the live creator, workspace, Pro, default-off feature and
        // authoritative bounded verified-order restrictions on every read.
        $rows = $this->reporting->verifiedOrders($creator, $workspaceId, $from, $to, 'forecast')
            ->selectRaw('DATE(paid_at) as day, COUNT(*) as verified_sales_count, SUM(gross_amount_cents) as verified_revenue_cents')
            ->groupByRaw('DATE(paid_at)')
            ->orderByRaw('DATE(paid_at) ASC')
            ->get();

        $byDay = [];
        foreach ($rows as $row) {
            $byDay[(string) $row->day] = [
                'verified_sales_count' => (int) $row->verified_sales_count,
                'verified_revenue_cents' => (int) $row->verified_revenue_cents,
            ];
        }

        $daily = [];
        for ($day = $from; $day->lessThanOrEqualTo($to); $day = $day->addDay()) {
            $date = $day->toDateString();
            $daily[] = [
                'date' => $date,
                'verified_sales_count' => $byDay[$date]['verified_sales_count'] ?? 0,
                'verified_revenue_cents' => $byDay[$date]['verified_revenue_cents'] ?? 0,
            ];
        }

        return $daily;
    }
}
