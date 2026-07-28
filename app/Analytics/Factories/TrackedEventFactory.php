<?php

namespace App\Analytics\Factories;

use App\Links\Models\Link;
use App\Analytics\Models\TrackedEvent;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Arr;

class TrackedEventFactory extends Factory
{
    protected $model = TrackedEvent::class;

    public function definition(): array
    {
        $period = CarbonPeriod::create(now()->subMonths(1), now());
        $referrers = json_decode(
            file_get_contents(database_path('seeders/referrers.json')),
            true,
        );
        $referrers = array_map(function ($referrer) {
            return "https://{$referrer}";
        }, $referrers);
        // Direct, Email, SMS
        $referrers[] = null;

        $country = Arr::random([
            'US',
            'DE',
            'FR',
            'GB',
            'CA',
            'AU',
            'JP',
            'CN',
            'IN',
            'RU',
        ]);

        return [
            'linkeable_id' => $this->faker->numberBetween(1, 500),
            'linkeable_type' => Link::MODEL_TYPE,
            'location' => $country,
            'city' => $this->getCity($country),
            'ip' => $this->faker->ipv4,
            'platform' => Arr::random(['windows', 'linux', 'ios', 'androidos']),
            'device' => Arr::random(['mobile', 'tablet', 'desktop']),
            'crawler' => false,
            'browser' => Arr::random([
                'chrome',
                'firefox',
                'edge',
                'internet explorer',
                'safari',
            ]),
            'referrer' => Arr::random($referrers),
            'created_at' => Arr::random($period->toArray()),
        ];
    }

    protected function getCity(string $country)
    {
        $citiesByPopulation = [
            'US' => [
                'New York',
                'Los Angeles',
                'Chicago',
                'Houston',
                'Phoenix',
                'Philadelphia',
                'San Antonio',
                'San Diego',
                'Dallas',
                'San Jose',
            ],
            'DE' => [
                'Berlin',
                'Hamburg',
                'Munich',
                'Cologne',
                'Frankfurt',
                'Stuttgart',
                'Düsseldorf',
                'Dortmund',
                'Essen',
                'Leipzig',
            ],
            'FR' => [
                'Paris',
                'Marseille',
                'Lyon',
                'Toulouse',
                'Nice',
                'Nantes',
                'Montpellier',
                'Strasbourg',
                'Bordeaux',
                'Lille',
            ],
            'GB' => [
                'London',
                'Birmingham',
                'Glasgow',
                'Liverpool',
                'Leeds',
                'Sheffield',
                'Edinburgh',
                'Bristol',
                'Manchester',
                'Leicester',
            ],
            'CA' => [
                'Toronto',
                'Montreal',
                'Calgary',
                'Ottawa',
                'Edmonton',
                'Mississauga',
                'Winnipeg',
                'Vancouver',
                'Brampton',
                'Quebec City',
            ],
            'AU' => [
                'Sydney',
                'Melbourne',
                'Brisbane',
                'Perth',
                'Adelaide',
                'Gold Coast',
                'Canberra',
                'Newcastle',
                'Wollongong',
                'Logan City',
            ],
            'JP' => [
                'Tokyo',
                'Yokohama',
                'Osaka',
                'Nagoya',
                'Sapporo',
                'Kobe',
                'Kyoto',
                'Fukuoka',
                'Kawasaki',
                'Saitama',
            ],
            'CN' => [
                'Shanghai',
                'Beijing',
                'Tianjin',
                'Guangzhou',
                'Shenzhen',
                'Chengdu',
                'Dongguan',
                'Chongqing',
                'Nanjing',
                'Xi\'an',
            ],
            'IN' => [
                'Mumbai',
                'Delhi',
                'Bangalore',
                'Hyderabad',
                'Ahmedabad',
                'Chennai',
                'Kolkata',
                'Surat',
                'Pune',
                'Jaipur',
            ],
            'RU' => [
                'Moscow',
                'Saint Petersburg',
                'Novosibirsk',
                'Yekaterinburg',
                'Nizhny Novgorod',
                'Kazan',
                'Chelyabinsk',
                'Omsk',
                'Samara',
                'Rostov-on-Don',
            ],
        ];

        return Arr::random($citiesByPopulation[$country]);
    }
}
