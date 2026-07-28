<?php

namespace Common\Roles\Policies;

use App\Models\User;
use Common\Core\Policies\BasePolicy;
use Common\Roles\Models\Role;

class RolePolicy extends BasePolicy
{
    public function index(User $user, string|null $type = null): bool
    {
        // allow anyone to view workspace roles (needed for member inviting on frontend)
        if ($type === 'workspace') {
            return true;
        }

        return $this->hasPermission($user, 'roles.update');
    }

    public function show(User $user): bool
    {
        return $this->hasPermission($user, 'roles.update');
    }

    public function store(User $user): bool
    {
        return $this->hasPermission($user, 'roles.update');
    }

    public function update(User $user): bool
    {
        return $this->hasPermission($user, 'roles.update');
    }

    public function destroy(User $user, Role $role): bool
    {
        return !$role->internal && $this->hasPermission($user, 'roles.update');
    }
}
