<?php

namespace App\Biolinks\Factories;

use App\Biolinks\Models\Biolink;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class BiolinkFactory extends Factory
{
    protected $model = Biolink::class;

    public function definition(): array
    {
        $period = CarbonPeriod::create(now()->subMonths(2), now());

        return [
            'name' => $this->faker->company,
            'back_half' => Str::random(6),
            'clicks_count' => random_int(30, 300),
            'user_id' => random_int(1, 100),
            'workspace_id' => 0,
            'clicked_at' => Arr::random($period->toArray()),
            'created_at' => Arr::random($period->toArray()),
            'updated_at' => Arr::random($period->toArray()),
        ];
    }
}
