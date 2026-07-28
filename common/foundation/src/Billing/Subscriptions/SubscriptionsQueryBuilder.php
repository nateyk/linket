<?php

namespace Common\Billing\Subscriptions;

use Common\Billing\Subscription;
use Common\Database\QueryBuilder\BaseQueryBuilder;
use Common\Database\QueryBuilder\Filter;
use Illuminate\Database\Eloquent\Builder;

class SubscriptionsQueryBuilder extends BaseQueryBuilder
{
    protected string $model = Subscription::class;

    protected function getBaseBuilder(): Builder
    {
        return Subscription::query()->with(['user', 'product.prices']);
    }

    protected function applyFilter(Filter $filter): Builder
    {
        return match ($filter->key) {
            'product_id',
            'price_id',
            'gateway_name',
            'ends_at',
            'renews_at',
            'created_at',
            'updated_at',
            'user_id'
                => $this->simpleFilter($filter),
        };
    }
}
