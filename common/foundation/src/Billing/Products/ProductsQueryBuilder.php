<?php

namespace Common\Billing\Products;

use Common\Billing\Models\Product;
use Common\Database\QueryBuilder\BaseQueryBuilder;
use Common\Database\QueryBuilder\Filter;
use Illuminate\Database\Eloquent\Builder;

class ProductsQueryBuilder extends BaseQueryBuilder
{
    protected string $model = Product::class;

    protected function defaultSort(): array
    {
        return ['position' => 'asc'];
    }

    protected function getBaseBuilder(): Builder
    {
        return Product::query()->with(['prices']);
    }

    protected function applyFilter(Filter $filter): Builder
    {
        return match ($filter->key) {
            'created_at', 'updated_at' => $this->simpleFilter($filter),
        };
    }
}
