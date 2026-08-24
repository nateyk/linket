<?php

use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Collection;

/**
 * Add stores.* permissions as canonical alias for biolinks.*.
 * Keeps biolinks.* rows for BC, inserts stores.* if missing,
 * and copies role assignments and restrictions from biolinks.* to stores.*.
 * Idempotent.
 */
return new class extends Migration {
    public function up(): void
    {
        $map = [
            'biolinks.create' => 'stores.create',
            'biolinks.update' => 'stores.update',
            'biolinks.delete' => 'stores.delete',
        ];

        foreach ($map as $old => $new) {
            $oldPermission = Permission::where('name', $old)->first();
            $newPermission = Permission::firstOrCreate(['name' => $new]);

            if (!$oldPermission) {
                continue;
            }

            // Copy role assignments from old to new, preserving restrictions
            $rolesWithOld = Role::whereHas('permissions', function ($q) use ($old) {
                $q->where('permissions.name', $old);
            })->with(['permissions' => function ($q) use ($old) {
                $q->where('permissions.name', $old);
            }])->get();

            foreach ($rolesWithOld as $role) {
                $oldPivot = $role->permissions->firstWhere('name', $old);
                $restrictions = $oldPivot?->pivot?->restrictions ?? $oldPivot?->restrictions ?? [];

                // Normalize restrictions to array
                if (is_string($restrictions)) {
                    $restrictions = json_decode($restrictions, true) ?? [];
                }

                $filtered = collect($restrictions)->filter(
                    fn($r) => isset($r['name']) && array_key_exists('value', $r),
                )->values();

                // Only sync if not already attached
                $exists = $role->permissions()->where('permissions.name', $new)->exists();
                if (!$exists) {
                    $role->permissions()->attach($newPermission->id, [
                        'restrictions' => $filtered->isNotEmpty() ? json_encode($filtered) : null,
                    ]);
                } else {
                    // Ensure restrictions are copied if new has none but old has
                    $newPivot = $role->permissions()->where('permissions.name', $new)->first();
                    $newRestrictions = $newPivot?->pivot?->restrictions ?? null;
                    if (empty($newRestrictions) && $filtered->isNotEmpty()) {
                        $role->permissions()->updateExistingPivot($newPermission->id, [
                            'restrictions' => json_encode($filtered),
                        ]);
                    }
                }
            }
        }

        // Also ensure config-driven seeding: insert any missing stores.* permissions from defaults
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
                $name = is_array($permissionConfig) ? $permissionConfig['name'] : $permissionConfig;
                if (!str_starts_with($name, 'stores.')) {
                    continue;
                }
                Permission::firstOrCreate(['name' => $name]);
                $exists = $role->permissions()->where('permissions.name', $name)->exists();
                if (!$exists) {
                    // Copy restrictions from biolinks alias if available
                    $restrictions = is_array($permissionConfig) ? ($permissionConfig['restrictions'] ?? []) : [];
                    $filtered = collect($restrictions)->filter(fn($r) => isset($r['value']))->values();
                    // Fallback to biolinks restrictions if stores config has none but role has biolinks
                    if ($filtered->isEmpty()) {
                        $alias = str_replace('stores.', 'biolinks.', $name);
                        $aliasPerm = $role->permissions()->where('permissions.name', $alias)->first();
                        $aliasRestrictions = $aliasPerm?->pivot?->restrictions ?? [];
                        if (is_string($aliasRestrictions)) {
                            $aliasRestrictions = json_decode($aliasRestrictions, true) ?? [];
                        }
                        $filtered = collect($aliasRestrictions)->filter(fn($r) => isset($r['name']))->values();
                    }
                    $role->permissions()->attach(Permission::where('name', $name)->value('id'), [
                        'restrictions' => $filtered->isNotEmpty() ? json_encode($filtered) : null,
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        // Intentionally not reversible: keep stores.* permissions for forward compat
    }
};
