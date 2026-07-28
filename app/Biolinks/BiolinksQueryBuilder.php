<?php

namespace App\Biolinks;

use App\Biolinks\Models\Biolink;
use Common\Database\QueryBuilder\BaseQueryBuilder;
use Common\Database\QueryBuilder\Filter;
use Illuminate\Database\Eloquent\Builder;

class BiolinksQueryBuilder extends BaseQueryBuilder
{
    protected string $model = Biolink::class;

    protected function shouldScopeToWorkspace(): bool
    {
        return true;
    }

    protected function getBaseBuilder(): Builder
    {
        return Biolink::query()->with(['user', 'domain']);
    }

    protected function applyFilter(Filter $filter): Builder
    {
        return match ($filter->key) {
            'name' => $this->stringFilter($filter),
            'is_archived' => $filter->value
                ? $this->builder->onlyTrashed()
                : $this->builder->withoutTrashed(),
            'links_count' => $this->linksCountFilter($filter),
            'rotator',
            'active',
            'created_at',
            'updated_at',
            'user_id'
                => $this->simpleFilter($filter),
        };
    }

    protected function linksCountFilter(Filter $filter): Builder
    {
        return $this->builder->having(
            'links_count',
            $filter->operator,
            $filter->value,
        );
    }
}
