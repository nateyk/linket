<?php

namespace Common\Files\QueryBuilder;

use Common\Database\QueryBuilder\BaseQueryBuilder;
use Common\Database\QueryBuilder\Filter;
use Common\Files\FileEntry;
use Illuminate\Database\Eloquent\Builder;

class FileEntriesQueryBuilder extends BaseQueryBuilder
{
    protected string $model = FileEntry::class;

    protected function getBaseBuilder(): Builder
    {
        return FileEntry::with(['users']);
    }

    protected function applyFilter(Filter $filter): Builder
    {
        return match ($filter->key) {
            'public',
            'type',
            'owner_id',
            'created_at',
            'updated_at'
                => $this->simpleFilter($filter),
        };
    }
}
