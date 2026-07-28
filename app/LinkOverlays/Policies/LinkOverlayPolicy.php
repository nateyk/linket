<?php

namespace App\LinkOverlays\Policies;

use App\LinkOverlays\Models\LinkOverlay;
use Common\Workspaces\Policies\WorkspacedResourcePolicy;

class LinkOverlayPolicy extends WorkspacedResourcePolicy
{
    protected string $resource = LinkOverlay::class;
}
