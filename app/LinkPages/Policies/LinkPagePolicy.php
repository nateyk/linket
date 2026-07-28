<?php

namespace App\LinkPages\Policies;

use App\LinkPages\Models\LinkPage;
use Common\Workspaces\Policies\WorkspacedResourcePolicy;

class LinkPagePolicy extends WorkspacedResourcePolicy
{
    protected string $resource = LinkPage::class;
}
