<?php

namespace App\TrackingPixels\QueryBuilder;

use App\TrackingPixels\Models\TrackingPixel;
use Common\Database\QueryBuilder\BaseQueryBuilder;
use Common\Database\QueryBuilder\Filter;
use Illuminate\Database\Eloquent\Builder;

class TrackingPixelsQueryBuilder extends BaseQueryBuilder
{
    protected string $model = TrackingPixel::class;

    protected function shouldScopeToWorkspace(): bool
    {
        return true;
    }

    protected function getBaseBuilder(): Builder
    {
        return TrackingPixel::with('user');
    }

    protected function applyFilter(Filter $filter): Builder
    {
        return match ($filter->key) {
            'name' => $this->stringFilter($filter),
            'is_archived' => $filter->value
                ? $this->builder->onlyTrashed()
                : $this->builder->withoutTrashed(),
            'type', 'created_at', 'updated_at' => $this->simpleFilter($filter),
        };
    }
}
