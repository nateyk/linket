<?php

namespace Common\Permissions\Traits;

use Common\Permissions\Models\Permission;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

trait HasPermissionsRelation
{
    public function permissions(): MorphToMany
    {
        return $this->morphToMany(Permission::class, 'permissionable')
            ->withPivot('restrictions')
            ->select('name', 'permissions.id');
    }

    public function hasPermission(string $name): bool
    {
        if (!is_null($this->getPermission($name)) ||
            !is_null($this->getPermission('admin'))) {
            return true;
        }

        $alias = $this->permissionAlias($name);
        if ($alias && !is_null($this->getPermission($alias))) {
            return true;
        }

        return false;
    }

    public function hasExactPermission(string $name): bool
    {
        return !is_null($this->getPermission($name));
    }

    public function getPermission(string $name): Permission|null
    {
        if (method_exists($this, 'loadPermissions')) {
            $this->loadPermissions();
        }

        foreach ($this->permissions as $permission) {
            if ($permission->name === $name) {
                return $permission;
            }
        }

        return null;
    }

    public function getRestrictionValue(
        string $permissionName,
        string $restriction,
    ): int|bool|null {
        $permission = $this->getPermission($permissionName);
        $value = $permission?->getRestrictionValue($restriction);
        if (!is_null($value)) {
            return $value;
        }

        $alias = $this->permissionAlias($permissionName);
        if ($alias) {
            $aliasPermission = $this->getPermission($alias);
            return $aliasPermission?->getRestrictionValue($restriction);
        }

        return null;
    }

    protected function permissionAlias(string $name): ?string
    {
        if (str_starts_with($name, 'stores.')) {
            return 'biolinks.' . substr($name, 7);
        }
        if (str_starts_with($name, 'biolinks.')) {
            return 'stores.' . substr($name, 9);
        }
        return null;
    }
}
