<?php

namespace Database\Seeders;

use Common\Permissions\Models\Permission;
use Common\Permissions\Traits\SyncsPermissions;
use Common\Roles\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

/**
 * Ensure Agents role exists with BeDesk support permissions from defaults.
 * RolesTableSeeder only attaches perms on first create — demo may create an empty Agents role.
 */
class SupportAgentsRoleSeeder extends Seeder
{
    use SyncsPermissions;

    public function run(): void
    {
        $config = File::getRequire(resource_path('defaults/permissions.php'));
        $appRole = collect($config['roles'] ?? [])->firstWhere('name', 'Agents');
        if (! $appRole) {
            return;
        }

        $attributes = [
            'type' => $appRole['type'] ?? 'agents',
            'default' => false,
            'guests' => false,
            'internal' => $appRole['internal'] ?? false,
        ];
        if (Schema::hasColumn('roles', 'agents')) {
            $attributes['agents'] = true;
        }

        $role = Role::query()->firstOrCreate(
            ['name' => 'Agents'],
            $attributes,
        );

        if (Schema::hasColumn('roles', 'agents') && ! $role->agents) {
            $role->update(['agents' => true]);
        }

        $defaultPermissions = collect($appRole['permissions'] ?? []);
        $names = $defaultPermissions->map(
            fn ($p) => is_array($p) ? $p['name'] : $p,
        );

        $dbPermissions = Permission::query()
            ->whereIn('name', $names)
            ->get()
            ->map(function (Permission $permission) use ($defaultPermissions) {
                $restrictions =
                    $defaultPermissions->first(
                        fn ($p) => is_array($p) &&
                            $p['name'] === $permission->name,
                    )['restrictions'] ?? [];
                $permission['restrictions'] = $restrictions;

                return $permission;
            });

        if ($dbPermissions->isEmpty()) {
            return;
        }

        $this->syncPermissions($role, $dbPermissions);
    }
}
