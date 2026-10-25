<?php

namespace Database\Seeders;

use App\Models\User;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'admin@admin.com'],
            [
                'name' => 'Admin',
                'username' => 'admin',
                'password' => 'password',
                'email_verified_at' => now(),
                'type' => 'user',
            ]
        );

        $adminPermission = Permission::firstOrCreate(
            ['name' => 'admin'],
            [
                'name' => 'admin',
                'group' => 'admin',
                'display_name' => 'Super Admin',
                'description' => 'Give all permissions to user.',
            ]
        );

        $user->permissions()->syncWithoutDetaching($adminPermission->id);

        $agentsRole = Role::query()->where('name', 'Agents')->first();
        if ($agentsRole) {
            $user->roles()->syncWithoutDetaching($agentsRole->id);
        }
    }
}
