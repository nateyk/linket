<?php

namespace Common\Auth\Actions;

use App\Models\User;
use Common\Database\QueryBuilder\BaseQueryBuilder;
use Common\Database\QueryBuilder\Filter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class UsersQueryBuilder extends BaseQueryBuilder
{
    protected string $model = User::class;

    protected function filterableFields(): array
    {
        return [...parent::filterableFields(), 'ip_address'];
    }

    protected function getBaseBuilder(): Builder
    {
        $fieldsPreset = $this->params['fields_preset'] ?? null;

        return User::query()->when(
            $fieldsPreset === 'users_datatable',
            fn(Builder $builder) => $builder->with([
                'subscriptions.product.prices',
                'roles',
                'bans',
                'latestUserSession',
            ]),
        );
    }

    protected function applyFilter(Filter $filter): Builder
    {
        return match ($filter->key) {
            'email_confirmed' => $filter->value === true
                ? $this->builder->whereNotNull('email_verified_at')
                : $this->builder->whereNull('email_verified_at'),
            'created_at' => $this->simpleFilter($filter),
            'updated_at' => $this->simpleFilter($filter),
            'last_active_at' => $this->simpleFilter($filter),
            'is_subscribed' => $filter->value === true
                ? $this->builder->whereHas('subscriptions')
                : $this->builder->whereDoesntHave('subscriptions'),
            'country' => $this->simpleFilter($filter),
            'language' => $this->simpleFilter($filter),
            'timezone' => $this->simpleFilter($filter),
            'browser' => $this->sessionFilter($filter),
            'device' => $this->sessionFilter($filter),
            'platform' => $this->sessionFilter($filter),
            'city' => $this->sessionFilter($filter),
            'ip_address' => $this->sessionFilter($filter),
        };
    }

    protected function sessionFilter(Filter $filter): Builder
    {
        [$operator, $value] = match ($filter->operator) {
            'contains', 'notContains' => [
                $filter->operator === 'notContains' ? 'not like' : 'like',
                "%{$filter->value}%",
            ],
            'startsWith' => ['like', "{$filter->value}%"],
            'endsWith' => ['like', "%{$filter->value}"],
            'ne' => ['!=', $filter->value],
            default => [$filter->operator, $filter->value],
        };

        return $this->builder->whereHas(
            'latestUserSession',
            fn(Builder $query) => $query->where(
                $filter->key,
                $operator,
                $value,
            ),
        );
    }
}
