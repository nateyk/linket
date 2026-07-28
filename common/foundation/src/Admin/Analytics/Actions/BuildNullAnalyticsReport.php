<?php

namespace Common\Admin\Analytics\Actions;

class BuildNullAnalyticsReport extends BuildAnalyticsReport
{
    public function execute(): array
    {
        return [
            'page_views' => [
                'granularity' => $this->dateRange->granularity,
                'data' => [],
            ],
            'browsers' => [
                'granularity' => $this->dateRange->granularity,
                'data' => [],
            ],
            'locations' => [
                'granularity' => $this->dateRange->granularity,
                'data' => [],
            ],
            'devices' => [
                'granularity' => $this->dateRange->granularity,
                'data' => [],
            ],
            'platforms' => [
                'granularity' => $this->dateRange->granularity,
                'data' => [],
            ],
        ];
    }
}
