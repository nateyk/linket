<?php

namespace App\LinkPages\Factories;

use App\LinkPages\Models\LinkPage;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Arr;

class LinkPageFactory extends Factory
{
    protected $model = LinkPage::class;

    public function definition(): array
    {
        $period = CarbonPeriod::create(now()->subMonths(3), now());

        return [
            'title' => $this->faker->words(3, true),
            'body' => $this->faker->paragraphs(3, true),
            'hide_footer' => false,
            'hide_navbar' => false,
            'workspace_id' => 0,
            'user_id' => 1,
            'created_at' => Arr::random($period->toArray()),
            'updated_at' => Arr::random($period->toArray()),
        ];
    }
}
