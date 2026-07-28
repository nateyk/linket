<?php

namespace App\Links\QueryBuilder;

use App\Links\Models\Link;
use Common\Database\QueryBuilder\BaseQueryBuilder;
use Common\Database\QueryBuilder\Filter;
use Illuminate\Database\Eloquent\Builder;

class LinksQueryBuilder extends BaseQueryBuilder
{
    protected string $model = Link::class;

    protected function shouldScopeToWorkspace(): bool
    {
        return true;
    }

    protected function getBaseBuilder(): Builder
    {
        return Link::query()->with(['user', 'qrCode']);
    }

    protected function applyFilter(Filter $filter): Builder
    {
        return match ($filter->key) {
            'type' => $this->builder->where(
                'type',
                $filter->operator,
                $filter->value === 'link_page' ? 'page' : $filter->value,
            ),
            'is_archived' => $filter->value
                ? $this->builder->onlyTrashed()
                : $this->builder->withoutTrashed(),
            'name', 'long_url' => $this->stringFilter($filter),
            'has_password' => $filter->value
                ? $this->builder->whereNotNull('password')
                : $this->builder->whereNull('password'),
            'clicks_count',
            'clicked_at',
            'expires_at',
            'created_at',
            'updated_at',
            'user_id',
            'folder_id'
                => $this->simpleFilter($filter),
        };
    }
}
