<?php

namespace App\TrackingPixels\Factories;

use App\TrackingPixels\Models\TrackingPixel;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class TrackingPixelFactory extends Factory
{
    protected $model = TrackingPixel::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'type' => $this->faker
                ->randomElement([
                    'facebook',
                    'twitter',
                    'google-tag-manager',
                    'bing',
                ]),
            'pixel_id' => Str::random(10),
            'head_code' => null,
            'body_code' => null,
            'workspace_id' => 0,
            'user_id' => 1,
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ];
    }
}
