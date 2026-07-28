<?php

namespace Common\Domains;

use Common\Database\QueryBuilder\BaseQueryBuilder;
use Common\Database\QueryBuilder\Filter;
use Illuminate\Database\Eloquent\Builder;

class CustomDomainsQueryBuilder extends BaseQueryBuilder
{
    protected string $model = CustomDomain::class;

    protected function shouldScopeToWorkspace(): bool
    {
        return true;
    }

    protected function getBaseBuilder(): Builder
    {
        return CustomDomain::query()->with(['user']);
    }

    protected function applyFilter(Filter $filter): Builder
    {
        return match ($filter->key) {
            'created_at',
            'updated_at',
            'user_id',
            'global'
                => $this->simpleFilter($filter),
            'host' => $this->stringFilter($filter),
        };
    }
}
