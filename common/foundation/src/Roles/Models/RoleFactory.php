<?php

namespace Common\Roles\Models;

use Illuminate\Database\Eloquent\Factories\Factory;

class RoleFactory extends Factory
{
    protected $model = Role::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->words(2, true),
            'type' => 'users',
            'default' => false,
            'guests' => false,
            'internal' => false,
            'order' => 0,
        ];
    }
}
