<?php

namespace App\LinkPages\QueryBuilder;

use App\LinkPages\Models\LinkPage;
use Common\Database\QueryBuilder\BaseQueryBuilder;
use Common\Database\QueryBuilder\Filter;
use Illuminate\Database\Eloquent\Builder;

class LinkPagesQueryBuilder extends BaseQueryBuilder
{
    protected string $model = LinkPage::class;

    protected function shouldScopeToWorkspace(): bool
    {
        return true;
    }

    protected function getBaseBuilder(): Builder
    {
        return LinkPage::with('user');
    }

    protected function applyFilter(Filter $filter): Builder
    {
        return match ($filter->key) {
            'name' => $this->stringFilter($filter),
            'is_archived' => $filter->value
                ? $this->builder->onlyTrashed()
                : $this->builder->withoutTrashed(),
            'created_at', 'updated_at', 'user_id' => $this->simpleFilter(
                $filter,
            ),
        };
    }
}
