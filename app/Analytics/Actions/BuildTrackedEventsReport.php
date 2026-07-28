<?php

namespace App\Analytics\Actions;

use App\Analytics\QueryBuilder\TrackedEventsQueryBuilder;
use Common\Core\Values\ValueLists;
use Common\Database\Metrics\MetricDateRange;
use Common\Database\Metrics\Partition;
use Common\Database\Metrics\Trend;
use Exception;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;

class BuildTrackedEventsReport
{
    protected Builder $builder;
    protected array $params = [];
    protected MetricDateRange $dateRange;

    public function execute(array $params): array
    {
        $this->params = $params;
        $this->builder = (new TrackedEventsQueryBuilder($params))->getBuilder();

        $this->dateRange = new MetricDateRange(
            start: $this->params['start_date'] ?? null,
            end: $this->params['end_date'] ?? null,
            timezone: $this->params['timezone'] ?? null,
        );

        return $this->buildMetric(Arr::get($params, 'metric', 'events'));
    }

    protected function buildMetric(string $metricName): array
    {
        switch ($metricName) {
            case 'events':
                return ['events' => $this->getEventsOverTimeTrend()];
            case 'devices':
                return ['devices' => $this->getDevicesMetric()];
            case 'browsers':
                return ['browsers' => $this->getBrowsersMetric()];
            case 'platforms':
                return ['platforms' => $this->getPlatformsMetric()];
            case 'countries':
                return ['countries' => $this->getCountriesMetric()];
            case 'cities':
                return ['cities' => $this->getCitiesMetric()];
            case 'referrers':
                return ['referrers' => $this->getReferrersMetric()];
            default:
                throw new Exception(
                    sprintf('Metric %s not found', $metricName),
                );
        }
    }

    protected function getEventsOverTimeTrend(): array
    {
        $trend = new Trend($this->builder, dateRange: $this->dateRange);
        $data = $trend->count();

        return [
            'granularity' => $this->dateRange->granularity,
            'total' => array_sum(Arr::pluck($data, 'value')),
            'data' => $data,
        ];
    }

    protected function getDevicesMetric(): array
    {
        return $this->getPartitionMetric('device', 5);
    }

    protected function getBrowsersMetric(): array
    {
        return $this->getPartitionMetric('browser', 8);
    }

    protected function getPlatformsMetric(): array
    {
        return $this->getPartitionMetric('platform', 5);
    }

    protected function getReferrersMetric(): array
    {
        $data = $this->getPartitionMetric('referrer', 40);
        // move direct traffic to the top of the list
        $directIndex = array_search('', array_column($data['data'], 'label'));
        if ($directIndex !== false) {
            $directData = Arr::pull($data['data'], $directIndex);
            array_unshift($data['data'], $directData);
        }
        return $data;
    }

    protected function getCountriesMetric(): array
    {
        $metric = $this->getPartitionMetric('location');

        $countries = app(ValueLists::class)->countries();
        $metric['data'] = array_map(function ($location) use (
            $countries,
            $metric,
        ) {
            // only short country code is stored in DB, get and return full country name as well
            $location['code'] = strtolower($location['label']);
            $location['label'] =
                Arr::first(
                    $countries,
                    fn($country) => $country['code'] === $location['code'],
                )['name'] ?? $location['label'];
            return $location;
        }, $metric['data']);

        return $metric;
    }

    protected function getCitiesMetric(): array
    {
        return $this->getPartitionMetric('city');
    }

    protected function getPartitionMetric(
        string $groupBy,
        int $limit = 10,
    ): array {
        return [
            'data' => (new Partition(
                $this->builder,
                groupBy: $groupBy,
                dateRange: $this->dateRange,
                limit: $limit,
            ))->count(),
        ];
    }
}
