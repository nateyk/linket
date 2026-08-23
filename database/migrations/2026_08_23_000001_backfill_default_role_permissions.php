<?php

use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Collection;

/**
 * Existing installs never receive permissions added to
 * resources/defaults/permissions.php after their initial seed:
 * RolesTableSeeder only attaches permissions when it creates a role,
 * and production deploys run migrations without seeding. This left the
 * Users role without "files.create", so every non-avatar upload was
 * rejected with 403 on such environments.
 *
 * Backfills configured role permissions (and any missing permission rows)
 * onto existing roles. Idempotent.
 */
return new class extends Migration {
    public function up(): void
    {
        $config = require resource_path('defaults/permissions.php');

        foreach ($config['roles'] as $roleConfig) {
            $role = Role::query()
                ->where('name', $roleConfig['name'])
                ->where('type', $roleConfig['type'])
                ->first();

            if (!$role) {
                continue;
            }

            foreach ($roleConfig['permissions'] as $permissionConfig) {
                $name = is_array($permissionConfig)
                    ? $permissionConfig['name']
                    : $permissionConfig;
                $restrictions = is_array($permissionConfig)
                    ? ($permissionConfig['restrictions'] ?? [])
                    : [];

                /** @var Collection<int, mixed> $filtered */
                $filtered = collect($restrictions)->filter(
                    fn(array $restriction) => isset($restriction['value']),
                );

                Permission::firstOrCreate(['name' => $name]);

                $role->permissions()->syncWithoutDetaching([
                    Permission::query()
                        ->where('name', $name)
                        ->value('id') => [
                        'restrictions' => $filtered
                            ->map(
                                fn(array $restriction) => [
                                    'name' => $restriction['name'],
                                    'value' => $restriction['value'],
                                ],
                            )
                            ->values(),
                    ],
                ]);
            }
        }
    }

    public function down(): void
    {
        // Intentionally not reversible: restoring previously-missing
        // default permissions should not be rolled back.
    }
};
