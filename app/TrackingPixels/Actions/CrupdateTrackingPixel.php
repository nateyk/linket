<?php

namespace App\TrackingPixels\Actions;

use App\TrackingPixels\Models\TrackingPixel;
use Illuminate\Support\Arr;

class CrupdateTrackingPixel
{
    public function execute(
        array $data,
        ?TrackingPixel $pixel = null,
    ): TrackingPixel {
        if (!$pixel) {
            $pixel = new TrackingPixel([
                'user_id' => auth()->id(),
            ]);
        }

        $attributes = [
            'name' => $data['name'],
            'type' => $data['type'],
            'pixel_id' => Arr::get($data, 'pixel_id'),
            'head_code' => Arr::get($data, 'head_code'),
            'body_code' => Arr::get($data, 'body_code'),
        ];

        $pixel->fill($attributes)->save();

        return $pixel;
    }
}
