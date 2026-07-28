<?php

namespace Common\Admin\Analytics\Actions;

use App\Models\User;
use Illuminate\Support\Arr;

class BuildDemoAnalyticsReport extends BuildAnalyticsReport
{
    public function execute(): array
    {
        return [
            'page_views' => $this->buildPageviewsMetric(),
            'browsers' => $this->buildBrowsersMetric(),
            'locations' => [
                'granularity' => $this->dateRange->granularity,
                'data' => $this->buildLocationsMetric(),
            ],
            'devices' => $this->buildDevicesMetric(),
            'platforms' => $this->buildPlatformsMetric(),
        ];
    }

    public function buildPageviewsMetric(): array
    {
        $data = (new DemoTrend(
            User::query(),
            dateRange: $this->dateRange,
        ))->count();

        $previous = (new DemoTrend(
            User::query(),
            dateRange: $this->compareDateRange ?? $this->dateRange,
        ))->count();

        foreach ($data as $key => $item) {
            if (isset($previous[$key])) {
                $data[$key]['previousValue'] = $previous[$key]['value'];
            }
        }

        return [
            'granularity' => $this->dateRange->granularity,
            'total' => array_sum(Arr::pluck($data, 'value')),
            'data' => $data,
        ];
    }

    public function buildBrowsersMetric(): array
    {
        return [
            'granularity' => $this->dateRange->granularity,
            'data' => [
                [
                    'label' => 'Chrome',
                    'value' => random_int(300, 500),
                    'previousValue' => random_int(200, 400),
                ],
                [
                    'label' => 'Firefox',
                    'value' => random_int(200, 400),
                    'previousValue' => random_int(100, 150),
                ],
                [
                    'label' => 'IE',
                    'value' => random_int(100, 150),
                    'previousValue' => random_int(100, 150),
                ],
                [
                    'label' => 'Edge',
                    'value' => random_int(100, 200),
                    'previousValue' => random_int(100, 200),
                ],
                [
                    'label' => 'Safari',
                    'value' => random_int(200, 300),
                    'previousValue' => random_int(200, 300),
                ],
            ],
        ];
    }

    public function buildDevicesMetric(): array
    {
        return [
            'granularity' => $this->dateRange->granularity,
            'data' => [
                [
                    'label' => 'Mobile',
                    'value' => random_int(300, 500),
                    'previousValue' => random_int(200, 400),
                ],
                [
                    'label' => 'Tablet',
                    'value' => random_int(200, 400),
                    'previousValue' => random_int(100, 150),
                ],
                [
                    'label' => 'Desktop',
                    'value' => random_int(100, 150),
                    'previousValue' => random_int(100, 150),
                ],
            ],
        ];
    }

    public function buildPlatformsMetric(): array
    {
        return [
            'granularity' => $this->dateRange->granularity,
            'data' => [
                [
                    'label' => 'Windows',
                    'value' => random_int(300, 500),
                    'previousValue' => random_int(200, 400),
                ],
                [
                    'label' => 'Linux',
                    'value' => random_int(200, 400),
                    'previousValue' => random_int(100, 150),
                ],
                [
                    'label' => 'iOS',
                    'value' => random_int(100, 150),
                    'previousValue' => random_int(100, 150),
                ],
                [
                    'label' => 'Android',
                    'value' => random_int(100, 150),
                    'previousValue' => random_int(100, 150),
                ],
            ],
        ];
    }

    public function buildLocationsMetric(): array
    {
        $data = [
            [
                'label' => 'United States',
                'code' => 'US',
                'value' => random_int(300, 500),
                'previousValue' => random_int(200, 400),
            ],
            [
                'label' => 'India',
                'code' => 'IN',
                'value' => random_int(100, 300),
                'previousValue' => random_int(100, 200),
            ],
            [
                'label' => 'Russia',
                'code' => 'RU',
                'value' => random_int(250, 400),
                'previousValue' => random_int(200, 300),
            ],
            [
                'label' => 'Germany',
                'code' => 'DE',
                'value' => random_int(200, 500),
                'previousValue' => random_int(150, 300),
            ],
            [
                'label' => 'France',
                'code' => 'FR',
                'value' => random_int(150, 300),
                'previousValue' => random_int(100, 200),
            ],
            [
                'label' => 'Japan',
                'code' => 'JP',
                'value' => random_int(150, 300),
                'previousValue' => random_int(100, 200),
            ],
            [
                'label' => 'United Kingdom',
                'code' => 'GB',
                'value' => random_int(300, 400),
                'previousValue' => random_int(200, 300),
            ],
            [
                'label' => 'Canada',
                'code' => 'CA',
                'value' => random_int(100, 150),
                'previousValue' => random_int(100, 150),
            ],
        ];

        $total = array_sum(Arr::pluck($data, 'value'));

        return array_map(function ($item) use ($total) {
            $item['percentage'] = round(($item['value'] / $total) * 100, 2);
            return $item;
        }, $data);
    }
}
