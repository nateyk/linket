<?php

namespace App\Demo;

use App\Models\User;
use App\Team\Models\Group;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Common\Auth\Models\UserSession;
use Faker\Generator;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;

class CreateDemoAgents
{
    protected Generator $faker;

    public function __construct()
    {
        $this->faker = app(Generator::class);
    }

    public function execute()
    {
        $groups = Group::all();
        $defaultGroup = $groups->firstWhere('default') ?? $groups->first();

        $this->createMainAdmin();
        $this->createMainAgent();
        $this->createSecondaryAgents();

        $allAgents = User::where('type', 'agent')
            ->orWhere('email', 'admin@admin.com')
            ->orderBy('created_at', 'desc')
            ->get();

        if ($defaultGroup && $allAgents->isNotEmpty()) {
            $defaultGroup->users()->syncWithoutDetaching($allAgents->pluck('id'));
        }

        if ($defaultGroup && $groups->isNotEmpty() && $allAgents->count() >= 2) {
            foreach ($groups as $group) {
                foreach ($allAgents->random(min(3, $allAgents->count())) as $key => $agent) {
                    $agent->groups()->syncWithPivotValues(
                        [$group->id, $defaultGroup->id],
                        [
                            'conversation_priority' => rand(0, 1)
                                ? 'backup'
                                : 'primary',
                            'created_at' => now()->subSeconds($key),
                        ],
                        detaching: false,
                    );
                }
            }
        }

        $allAgents->each(function (User $agent) {
            if (! $agent->agentSettings()->exists()) {
                $agent->agentSettings()->create([
                    'accepts_conversations' => 'yes',
                    'assignment_limit' => 6,
                    'working_hours' => null,
                ]);
            }
        });

        $this->createUserSessions($allAgents);

        return $allAgents;
    }

    protected function createMainAdmin()
    {
        $adminsRole = $this->adminsRole();
        if (! $adminsRole) {
            return;
        }

        if (! User::where('email', 'admin@admin.com')->exists()) {
            $demoAdmin = User::forceCreate([
                'type' => 'agent',
                'name' => 'Demo Admin',
                'email' => 'admin@admin.com',
                'image' => url('images/avatars/male-1.jpg'),
                'password' => bcrypt('admin'),
                'email_verified_at' => now(),
            ]);

            $superAdminPermission = Permission::where('name', 'admin')->first();
            if ($superAdminPermission) {
                $demoAdmin->permissions()->attach($superAdminPermission);
            }

            $demoAdmin->roles()->sync([$adminsRole->id]);
        }

        $demoEmail = config('app.demo_email');
        if ($demoEmail && ! User::where('email', $demoEmail)->exists()) {
            $superAdmin = User::create([
                'email' => $demoEmail,
                'type' => 'admin',
                'password' => config('app.demo_password') ?: bcrypt('demo'),
            ]);
            $superAdminPermission = Permission::where('name', 'admin')->first();
            if ($superAdminPermission) {
                $superAdmin->permissions()->attach($superAdminPermission->id);
            }
            $superAdmin->roles()->attach($adminsRole->id);
        }
    }

    protected function createMainAgent()
    {
        $agentsRole = $this->agentsRole();
        if (! $agentsRole || User::where('email', 'agent@demo.com')->exists()) {
            return;
        }

        $demoAgent = User::create([
            'type' => 'agent',
            'name' => 'Demo Agent',
            'email' => 'agent@demo.com',
            'image' => url('images/avatars/male-2.jpg'),
            'password' => bcrypt('agent'),
            'email_verified_at' => now(),
        ]);
        $demoAgent
            ->roles()
            ->syncWithPivotValues([$agentsRole->id], ['created_at' => now()]);
    }

    /**
     * Creates secondary demo agents that can't be used to log in with.
     */
    protected function adminsRole(): ?Role
    {
        foreach (['Admins', 'Admin', 'admin'] as $name) {
            $role = Role::query()->where('name', $name)->first();
            if ($role) {
                return $role;
            }
        }

        return null;
    }

    protected function agentsRole(): ?Role
    {
        $role = Role::query()->where('name', 'Agents')->first();
        if ($role) {
            if (isset($role->agents) && ! $role->agents) {
                $role->update(['agents' => true]);
            }

            return $role;
        }

        return Role::query()->create([
            'name' => 'Agents',
            'default' => false,
            'guests' => false,
            'type' => 'agents',
            'agents' => true,
        ]);
    }

    protected function createSecondaryAgents()
    {
        $permission = Permission::where(
            'name',
            'conversations.update',
        )->first();
        $agentsRole = $this->agentsRole();
        if (! $agentsRole) {
            return;
        }

        for ($i = 0; $i < 4; $i++) {
            $gender = $this->faker->boolean() ? 'male' : 'female';
            $agent = User::create([
                'type' => 'agent',
                'language' => 'en',
                'country' => 'us',
                'timezone' => 'America/New_York',
                'email_verified_at' => now(),
                'email' => $this->faker->unique()->safeEmail,
                'name' => $this->faker->name($gender),
                'gender' => $gender,
                'image' => $this->getAvatar($gender),
                'created_at' => now()->subMinute(),
                'updated_at' => now()->subMinute(),
            ]);

            $agent
                ->roles()
                ->syncWithPivotValues(
                    [$agentsRole->id],
                    ['created_at' => now()],
                );

            if ($permission) {
                $agent->permissions()->attach($permission->id);
            }
        }
    }

    protected function getAvatar(string $gender)
    {
        $avatarFileName =
            $gender . '-' . $this->faker->numberBetween(2, 4) . '.jpg';
        return url("images/avatars/$avatarFileName");
    }

    protected function createUserSessions(Collection $agents)
    {
        $cities = [
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
        ];
        $sessions = $agents->map(
            fn(User $agent) => [
                'user_id' => $agent->id,
                'ip_address' => $this->faker->ipv4,
                'country' => 'us',
                'city' => Arr::random($cities),
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
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
        UserSession::insert($sessions->toArray());
    }
}
