<?php

namespace Common\Permissions\Config;

use Common\Permissions\Config\PermissionConfigItem;
use Common\Permissions\Models\Permission;
use Illuminate\Support\Facades\Auth;

class PermissionConfigLoader
{
    /**
     * unique flag is in case we need a different description or restrictions for same permission
     * on different role types. For example "files.create" permission for users and workspace.
     * unique:false should only be called in the "getWithId" method here, role_type param will filter out duplicates.
     *
     * @return array<PermissionConfigItem>
     */
    public function get(bool $unique = true): array
    {
        $permissionConfig = require resource_path('defaults/permissions.php');

        $flatPermissions = [];

        foreach ($permissionConfig['all'] as $groupName => $group) {
            foreach ($group as $permission) {
                $permission['group'] = $groupName;
                if ($unique) {
                    $flatPermissions[
                        $permission['name']
                    ] = new PermissionConfigItem($permission);
                } else {
                    $flatPermissions[] = new PermissionConfigItem($permission);
                }
            }
        }

        return array_values($flatPermissions);
    }

    /**
     * @return array<PermissionConfigItem>
     */
    public function getWithId(string $roleType): array
    {
        $config = $this->get(unique: false);
        $permissions = Permission::get();
        $filteredPermissions = [];

        foreach ($config as $key => $configItem) {
            $dbPermission = $permissions->first(
                fn(Permission $dbPermission) => $dbPermission->name ===
                    $configItem->name,
            );
            $configItem->id = $dbPermission->id;

            if (!in_array($roleType, $configItem->roleTypes)) {
                continue;
            }

            if (
                $configItem->name === 'admin' &&
                (!Auth::user() || !Auth::user()->hasExactPermission('admin'))
            ) {
                continue;
            }

            $filteredPermissions[] = $configItem;
        }

        return $filteredPermissions;
    }
}
