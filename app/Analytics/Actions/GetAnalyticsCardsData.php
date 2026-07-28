<?php

namespace App\Analytics\Actions;

use App\Links\Models\Link;
use App\Models\User;
use App\Analytics\Models\TrackedEvent;
use Common\Database\Metrics\MetricDateRange;
use Common\Database\Metrics\ValueMetric;

class GetAnalyticsCardsData
{
    public function execute(array $params): array
    {
        $dateRange = new MetricDateRange(
            start: $params['start_date'] ?? null,
            end: $params['end_date'] ?? null,
            timezone: $params['timezone'] ?? null,
        );

        return [
            array_merge(
                [
                    'name' => __('New links'),
                ],
                (new ValueMetric(
                    Link::withTrashed(),
                    dateRange: $dateRange,
                ))->count(),
            ),
            array_merge(
                [
                    'name' => __('Clicks'),
                ],
                (new ValueMetric(
                    TrackedEvent::query()->where('event_type', 'click'),
                    dateRange: $dateRange,
                ))->count(),
            ),
            array_merge(
                [
                    'name' => __('Scans'),
                ],
                (new ValueMetric(
                    TrackedEvent::query()->where('event_type', 'scan'),
                    dateRange: $dateRange,
                ))->count(),
            ),
            array_merge(
                [
                    'name' => __('New users'),
                ],
                (new ValueMetric(
                    User::query(),
                    dateRange: $dateRange,
                ))->count(),
            ),
        ];
    }
}
