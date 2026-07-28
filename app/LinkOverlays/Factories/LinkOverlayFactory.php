<?php

namespace App\LinkOverlays\Factories;

use App\LinkOverlays\Models\LinkOverlay;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;

class LinkOverlayFactory extends Factory
{
    protected $model = LinkOverlay::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'position' => 'bottom-left',
            'message' => $this->faker->word(),
            'label' => $this->faker->word(),
            'btn_link' => $this->faker->url,
            'btn_text' => $this->faker->text(),
            'colors' => [
                'bg-color' => 'rgb(61, 75, 101)',
                'text-color' => 'rgb(255, 255, 255)',
                'label-bg-color' => 'rgb(255, 255, 255)',
                'label-color' => 'rgb(0, 0, 0)',
            ],
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
            'theme' => Arr::random(['default', 'rounded']),
            'user_id' => 1,
        ];
    }
}
