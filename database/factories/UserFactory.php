<?php

namespace Database\Factories;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition()
    {
        $gender = $this->faker->randomElement(['male', 'female']);
        $avatarNumber = $this->faker->numberBetween(1, 4);
        $date = $this->faker->dateTimeBetween(now()->subYears(1), now());

        return [
            'name' => $this->faker->name($gender),
            'username' => $this->faker->userName(),
            'language' => $this->faker->languageCode(),
            'country' => $this->faker->countryCode(),
            'gender' => $this->faker->randomElement(['male', 'female']),
            'timezone' => $this->faker->timezone(),
            'image' => "images/avatars/{$gender}-{$avatarNumber}.jpg",
            'email' => $this->faker->unique()->safeEmail(),
            'email_verified_at' => Carbon::now(),
            'password' =>
                '$2y$12$v0wg/7lkLcPLrFl/xX24/OHwXYLGIO6uuDCXcTwXQuXsFZpXyH/re', // password
            'remember_token' => Str::random(10),
            'created_at' => $date,
            'updated_at' => $date,
        ];
    }
}
