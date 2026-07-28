<?php

namespace Common\Database\QueryBuilder;

use Common\Workspaces\ActiveWorkspace;
use Exception;
use Illuminate\Contracts\Pagination\Paginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

abstract class BaseQueryBuilder
{
    protected string $model;

    public FiltersList $filters;

    protected Builder $builder;

    public function __construct(protected array $params)
    {
        $this->filters = new FiltersList(
            $this->filterableFields(),
            $this->params,
        );

        $this->builder = $this->getBaseBuilder();

        if ($this->shouldScopeToWorkspace()) {
            if (!ActiveWorkspace::shouldScopeToWorkspace()) {
                $this->filters->remove('workspace_id');
            } else {
                $this->filters->add(
                    'workspace_id',
                    '=',
                    ActiveWorkspace::get()->id,
                );
            }
        }

        foreach ($this->filters->all() as $filter) {
            if ($filter->key === 'workspace_id') {
                $this->builder->where('workspace_id', $filter->value);
                continue;
            }

            if (!$this->applyFilter($filter)) {
                throw new Exception("Filter not implemented: {$filter->key}");
            }
        }

        $this->applySorting();
        $this->applySearchQuery();
        $this->loadRequestedRelations();
    }

    public function paginate(): Paginator
    {
        return $this->builder->simplePaginate($this->getPerPage());
    }

    public function getBuilder(): Builder
    {
        return $this->builder;
    }

    public function withFilter(
        string $key,
        string $operator,
        mixed $value,
        bool $overwrite = true,
    ): self {
        $this->filters->add($key, $operator, $value, $overwrite);
        return $this;
    }

    abstract protected function applyFilter(Filter $filter): Builder;

    protected function getBaseBuilder(): Builder
    {
        return $this->model::query();
    }

    protected function filterableFields(): array
    {
        return $this->model::filterableFields();
    }

    protected function sortableFields(): array
    {
        return $this->model::sortableFields();
    }

    protected function defaultSort(): array
    {
        return ['created_at' => 'desc'];
    }

    /**
     * Implemented by subclasses to transform the final sort array.
     * For example if it needs to sort by ID along with user specified sort.
     */
    protected function transformSort(array $sort): array
    {
        return $sort;
    }

    protected function applySorting(): void
    {
        $parts = Str::of(Arr::get($this->params, 'sort', ''))->explode(':');

        if ($parts->count() === 2) {
            [$column, $direction] = [$parts[0], $parts[1]];
            $sort = $this->isSortableColumn($column)
                ? [$column => $direction]
                : $this->defaultSort();
        } else {
            $sort = $this->defaultSort();
        }

        foreach ($this->transformSort($sort) as $column => $direction) {
            if (!$this->isSortableColumn($column)) {
                continue;
            }

            $this->builder->orderBy(
                $this->qualifySortColumn($column),
                strtolower($direction) === 'asc' ? 'asc' : 'desc',
            );
        }
    }

    protected function isSortableColumn(string $column): bool
    {
        return !!Arr::first(
            $this->sortableFields(),
            fn($field) => Str::is($field, $column),
        );
    }

    protected function qualifySortColumn(string $column): string
    {
        if (str_contains($column, '.')) {
            return $column;
        }

        $model = new $this->model();

        if (Schema::hasColumn($model->getTable(), $column)) {
            return $model->qualifyColumn($column);
        }

        return $column;
    }

    protected function applySearchQuery(): void
    {
        $search = Str::of(Arr::get($this->params, 'query', ''))
            ->trim()
            ->value();

        if ($search) {
            $this->builder->mysqlSearch($search);
        }
    }

    protected function shouldScopeToWorkspace()
    {
        return false;
    }

    protected function loadRequestedRelations(): void
    {
        if (method_exists($this->model, 'withRequestedRelations')) {
            $this->builder->withRequestedRelations($this->params);
        }
    }

    protected function getPerPage(): int
    {
        $perPage = (int) Arr::get($this->params, 'per_page', 15);
        return max(1, min(100, $perPage));
    }

    /**
     * Short-hand method for applying a simple where filter.
     */
    protected function simpleFilter(Filter $filter): Builder
    {
        return $this->builder->where(
            $filter->key,
            $filter->operator,
            $filter->value,
        );
    }

    /**
     * Short-hand method for applying a string where filter.
     */
    protected function stringFilter(Filter $filter): Builder
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

        return $this->builder->where($filter->key, $operator, $value);
    }
}
