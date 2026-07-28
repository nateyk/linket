<?php

namespace Common\Database\Traits;

use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

trait LoadsRequestedRelations
{
    public function getRequestedRelations(array $params): array
    {
        return Str::of(Arr::get($params, 'include', ''))
            ->explode(',')
            ->filter(fn($relation) => $relation && $this->isRelation($relation))
            ->toArray();
    }

    #[Scope]
    protected function withRequestedRelations(
        Builder $builder,
        array $params,
    ): void {
        $relations = $this->getRequestedRelations($params);
        if (!empty($relations)) {
            $builder->with($relations);
        }
    }

    public function loadRequestedRelations(array $params): void
    {
        $relations = $this->getRequestedRelations($params);
        if (!empty($relations)) {
            $this->loadMissing($relations);
        }
    }
}
