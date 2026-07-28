<?php

namespace Common\Admin\Analytics\Actions;

use Common\Database\Metrics\MetricDateRange;

abstract class BuildAnalyticsReport
{
    protected MetricDateRange $dateRange;
    protected MetricDateRange|null $compareDateRange = null;

    public function __construct(array $params)
    {
        $this->dateRange = new MetricDateRange(
            start: $params['start_date'] ?? null,
            end: $params['end_date'] ?? null,
            timezone: $params['timezone'] ?? null,
        );

        if (
            isset($params['compare_start_date']) &&
            isset($params['compare_end_date'])
        ) {
            $this->compareDateRange = new MetricDateRange(
                start: $params['compare_start_date'],
                end: $params['compare_end_date'],
                timezone: $params['timezone'] ?? null,
            );
        }
    }

    /**
     * Get data for admin area analytics page from active provider.
     * (Demo or Google Analytics currently)
     */
    abstract public function execute(): array;
}
