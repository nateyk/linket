<?php

namespace Common\Workspaces\Models;
use Illuminate\Database\Eloquent\Factories\Factory;

class WorkspaceFactory extends Factory
{
    protected $model = Workspace::class;

    private const DEMO_TEAM_NAMES = [
        'Marketing Team',
        'Product Team',
        'Engineering',
        'Sales',
        'Customer Success',
        'Design Studio',
        'Content Team',
        'Growth',
        'Support',
        'Operations',
    ];

    public function definition(): array
    {
        return [
            'name' => $this->faker->randomElement(self::DEMO_TEAM_NAMES),
            'owner_id' => $this->faker->numberBetween(1, 100),
        ];
    }
}
