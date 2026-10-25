<?php

namespace App\Demo;

use App\Models\User;
use App\Team\Models\Group;
use Common\Auth\Factories\UserSessionFactory;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Common\Auth\Models\UserSession;
use Faker\Generator;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CreateDemoCustomers
{
    protected Generator $faker;

    public function __construct()
    {
        $this->faker = app(Generator::class);
    }

    public function execute(): Collection
    {
        $data = [];
        for ($i = 0; $i < 40; $i++) {
            $isAnonymous = $i !== 0 && $this->faker->boolean(60);
            $gender = $this->faker->boolean() ? 'male' : 'female';

            $country = Arr::random([
                'us',
                'de',
                'fr',
                'gb',
                'ca',
                'au',
                'jp',
                'cn',
                'in',
                'ru',
            ]);

            $date = $this->faker->dateTimeBetween(now()->subHours(24), now());

            // Linket users.email is NOT NULL — always store an email (BeDesk allowed null).
            $data[] = [
                'type' => 'user',
                'email' => $this->faker->unique()->safeEmail,
                'password' => $i === 0 ? bcrypt('demo') : null,
                'name' => $isAnonymous
                    ? 'Guest '.$this->faker->firstName($gender)
                    : $this->faker->name($gender),
                'language' => 'en',
                'country' => $country,
                'timezone' => $this->faker->timezone,
                'gender' => $isAnonymous ? null : $gender,
                'image' => $isAnonymous ? null : $this->getAvatar($gender),
                'email_verified_at' => !$isAnonymous ? now() : null,
                'created_at' => $date,
                'updated_at' => $date,
            ];
        }

        $data[0]['email'] = 'customer@demo.com';

        if (! User::where('email', 'customer@demo.com')->exists()) {
            User::insert($data);
        }

        $customers = User::where('type', 'user')
            ->where('email', 'like', '%@%')
            ->orderByDesc('id')
            ->limit(40)
            ->get();

        $this->createUserSessions($customers);

        $customerRole = Role::query()
            ->whereIn('name', ['Customers', 'Users', 'users'])
            ->first();
        if ($customerRole) {
            $rows = $customers
                ->map(
                    fn(User $customer) => [
                        'user_id' => $customer->id,
                        'role_id' => $customerRole->id,
                        'created_at' => now(),
                    ],
                )
                ->toArray();
            DB::table('user_role')->insertOrIgnore($rows);
        }

        return $customers;
    }

    protected function getAvatar(string $gender)
    {
        $avatarFileName =
            $gender . '-' . $this->faker->numberBetween(2, 4) . '.jpg';
        return url("images/avatars/$avatarFileName");
    }

    protected function createUserSessions(Collection $customers)
    {
        $factory = app(UserSessionFactory::class);
        $sessions = $customers->map(function (User $customer) use ($factory) {
            $date = $this->faker->dateTimeBetween($customer->created_at, now());
            return [
                'user_id' => $customer->id,
                'ip_address' => $this->faker->ipv4,
                'country' => $customer->country,
                'city' => $factory->getCity($customer->country),
                'platform' => Arr::random([
                    'windows',
                    'linux',
                    'ios',
                    'androidos',
                ]),
                'device' => Arr::random(['mobile', 'tablet', 'desktop']),
                'browser' => Arr::random([
                    'chrome',
                    'firefox',
                    'edge',
                    'internet explorer',
                    'safari',
                ]),
                'user_agent' => $this->faker->userAgent,
                'created_at' => $date,
                'updated_at' => $date,
            ];
        });
        UserSession::insert($sessions->toArray());
    }
}
