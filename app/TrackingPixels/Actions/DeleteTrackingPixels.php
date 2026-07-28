<?php

namespace App\TrackingPixels\Actions;

use App\TrackingPixels\Models\TrackingPixel;
use Illuminate\Support\Facades\DB;

class DeleteTrackingPixels
{
    public function execute($pixelIds)
    {
        TrackingPixel::withTrashed()->whereIn('id', $pixelIds)->forceDelete();

        // detach deleted pixels from links
        DB::table('link_tracking_pixel')
            ->whereIn('tracking_pixel_id', $pixelIds)
            ->delete();
    }
}
