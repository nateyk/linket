<?php

namespace App\Folders\Factories;

use App\Folders\Models\Folder;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class FolderFactory extends Factory
{
    protected $model = Folder::class;

    public function definition(): array
    {
        $period = CarbonPeriod::create(now()->subMonths(3), now());

        $name = Arr::random([
            'Holiday special',
            'Winter sale',
            'Personal links',
            'Business links',
            'Summer campaign',
            'Spring launch',
            'Product updates',
            'Social media',
            'Newsletter links',
            'Event promotions',
            'Client resources',
            'Affiliate links',
            'Blog posts',
            'Team favorites',
        ]);

        return [
            'name' => $name,
            'back_half' => Str::random(6),
            'user_id' => random_int(1, 100),
            'clicks_count' => 0,
            'rotator' => false,
            'created_at' => Arr::random($period->toArray()),
            'workspace_id' => 0,
        ];
    }
}
