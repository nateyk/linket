<?php

namespace App\Tags\Policies;

use App\Tags\Models\Tag;
use Common\Workspaces\Policies\WorkspacedResourcePolicy;

class TagPolicy extends WorkspacedResourcePolicy
{
    protected string $resource = Tag::class;
}
