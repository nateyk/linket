<?php

namespace App\TrackingPixels\Policies;

use App\TrackingPixels\Models\TrackingPixel;
use Common\Workspaces\Policies\WorkspacedResourcePolicy;

class TrackingPixelPolicy extends WorkspacedResourcePolicy
{
    protected string $resource = TrackingPixel::class;
}
