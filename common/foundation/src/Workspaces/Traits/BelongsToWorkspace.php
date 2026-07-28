<?php

namespace Common\Workspaces\Traits;

use Common\Workspaces\ActiveWorkspace;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Sabre\HTTP\Request;

trait BelongsToWorkspace
{
    protected string $ownerColumn = 'user_id';

    protected static function booted(): void
    {
        static::creating(function (Model $model) {
            $model->workspace_id =
                // check if workspace_id was passed in (ignore getter method)
                $model->getAttributes()['workspace_id'] ??
                ActiveWorkspace::get()->id;
        });
    }

    #[Scope]
    protected function whereBelongsToActiveWorkspace(Builder $builder): Builder
    {
        $builder->where('workspace_id', ActiveWorkspace::get()->id);
        return $builder;
    }
}
