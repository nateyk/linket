<?php

namespace App\LinkOverlays\Actions;

use App\Links\Models\Link;
use App\LinkOverlays\Models\LinkOverlay;

class DeleteLinkOverlays
{
    public function execute(array $overlayIds)
    {
        LinkOverlay::query()->whereIn('id', $overlayIds)->delete();

        Link::query()
            ->whereIn('type_id', $overlayIds)
            ->where('type', 'overlay')
            ->update(['type_id' => null, 'type' => 'direct']);
    }
}
