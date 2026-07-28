<?php

namespace App\LinkOverlays\QueryBuilder;

use App\LinkOverlays\Models\LinkOverlay;
use Common\Database\QueryBuilder\BaseQueryBuilder;
use Common\Database\QueryBuilder\Filter;
use Illuminate\Database\Eloquent\Builder;

class LinkOverlaysQueryBuilder extends BaseQueryBuilder
{
    protected string $model = LinkOverlay::class;

    protected function shouldScopeToWorkspace(): bool
    {
        return true;
    }

    protected function getBaseBuilder(): Builder
    {
        return LinkOverlay::with('user');
    }

    protected function applyFilter(Filter $filter): Builder
    {
        return match ($filter->key) {
            'name' => $this->stringFilter($filter),
            'is_archived' => $filter->value
                ? $this->builder->onlyTrashed()
                : $this->builder->withoutTrashed(),
            'theme', 'created_at', 'updated_at', 'user_id' => $this->simpleFilter(
                $filter,
            ),
        };
    }
}
