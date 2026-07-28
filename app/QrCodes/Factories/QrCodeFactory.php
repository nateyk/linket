<?php

namespace App\QrCodes\Factories;

use App\QrCodes\Models\QrCode;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class QrCodeFactory extends Factory
{
    protected $model = QrCode::class;

    public function definition(): array
    {
        $period = CarbonPeriod::create(now()->subMonths(3), now());

        $websites = json_decode(
            file_get_contents(database_path('seeders/top-websites.json')),
            true,
        );

        $website = Arr::random($websites);

        $createdAt = Arr::random($period->toArray());

        return [
            'back_half' => Str::random(6),
            'name' => $website['title'],
            'long_url' => $website['domain'],
            'user_id' => random_int(1, 100),
            'scans_count' => random_int(30, 300),
            'workspace_id' => 0,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ];
    }
}
