<?php

namespace App\Tags;

use App\Tags\Models\Tag;
use Common\Database\QueryBuilder\BaseQueryBuilder;
use Common\Database\QueryBuilder\Filter;
use Illuminate\Database\Eloquent\Builder;

class TagsQueryBuilder extends BaseQueryBuilder
{
    protected string $model = Tag::class;

    protected function shouldScopeToWorkspace(): bool
    {
        return true;
    }

    protected function getBaseBuilder(): Builder
    {
        return Tag::query();
    }

    protected function applyFilter(Filter $filter): Builder
    {
        return match ($filter->key) {
            'created_at', 'updated_at', 'user_id' => $this->simpleFilter(
                $filter,
            ),
        };
    }
}
