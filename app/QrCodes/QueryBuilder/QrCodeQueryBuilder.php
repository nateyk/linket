<?php

namespace App\QrCodes\QueryBuilder;

use App\QrCodes\Models\QrCode;
use Common\Database\QueryBuilder\BaseQueryBuilder;
use Common\Database\QueryBuilder\Filter;
use Illuminate\Database\Eloquent\Builder;

class QrCodeQueryBuilder extends BaseQueryBuilder
{
    protected string $model = QrCode::class;

    protected function shouldScopeToWorkspace(): bool
    {
        return true;
    }

    protected function getBaseBuilder(): Builder
    {
        return QrCode::query()->with('linkeable.rules');
    }

    protected function applyFilter(Filter $filter): Builder
    {
        return match ($filter->key) {
            'linkeable_type' => $this->linkeableTypeFilter($filter),
            'name' => $this->stringFilter($filter),
            'is_archived' => $filter->value
                ? $this->builder->onlyTrashed()
                : $this->builder->withoutTrashed(),
            'expires_at',
            'created_at',
            'updated_at',
            'user_id'
                => $this->simpleFilter($filter),
        };
    }

    protected function linkeableTypeFilter(Filter $filter): Builder
    {
        $value = $filter->value === 'null' ? null : $filter->value;

        if ($value === null) {
            return $this->builder->whereNull('linkeable_type');
        }

        return $this->builder->where(
            'linkeable_type',
            $filter->operator,
            $value,
        );
    }
}
