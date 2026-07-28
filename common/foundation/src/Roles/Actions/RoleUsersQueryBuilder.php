<?php

namespace Common\Roles\Actions;

use App\Models\User;
use Common\Database\QueryBuilder\BaseQueryBuilder;
use Common\Database\QueryBuilder\Filter;
use Illuminate\Database\Eloquent\Builder;

class RoleUsersQueryBuilder extends BaseQueryBuilder
{
    protected string $model = User::class;

    protected function defaultSort(): array
    {
        return ['assigned_at' => 'desc'];
    }

    public function __construct(protected int $roleId, protected array $params)
    {
        parent::__construct($this->params);
    }

    protected function getBaseBuilder(): Builder
    {
        $builder = $this->model::query();
        $relation = $builder->getModel()->roles();

        return $builder
            ->select(
                $builder->getModel()->qualifyColumn('*'),
                "{$relation->getTable()}.created_at as assigned_at",
            )
            ->join(
                $relation->getTable(),
                $relation->getQualifiedParentKeyName(),
                '=',
                $relation->getQualifiedForeignPivotKeyName(),
            )
            ->where(
                $relation->getQualifiedRelatedPivotKeyName(),
                $this->roleId,
            );
    }

    protected function sortableFields(): array
    {
        return [...User::sortableFields(), 'assigned_at'];
    }

    protected function applyFilter(Filter $filter): Builder
    {
        // no filtering needed for role users
        return $this->builder;
    }
}
