<?php

namespace Common\Database\Seeders;

use Common\Permissions\Models\Permission;
use Common\Permissions\Config\PermissionConfigLoader;
use Illuminate\Database\Seeder;

class PermissionTableSeeder extends Seeder
{
    public function run(): void
    {
        $allPermissions = (new PermissionConfigLoader())->get();

        foreach ($allPermissions as $permission) {
            app(Permission::class)->updateOrCreate([
                'name' => $permission->name,
            ]);
        }
    }
}
