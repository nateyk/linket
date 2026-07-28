<?php

namespace Common\Permissions\Policies;

use Common\Permissions\Models\Permission;
use Common\Auth\Models\BaseUser;
use Common\Core\Policies\BasePolicy;
use Illuminate\Http\Request;
use Illuminate\Auth\Access\HandlesAuthorization;

class PermissionPolicy extends BasePolicy
{
    public function index(BaseUser $user)
    {
        return $this->hasPermission($user, 'permission.view');
    }

    public function show(BaseUser $user, Permission $permission)
    {
        return $this->hasPermission($user, 'permission.view');
    }

    public function store(BaseUser $user)
    {
        return $this->hasPermission($user, 'permission.create');
    }

    public function update(BaseUser $user)
    {
        return $this->hasPermission($user, 'permission.update');
    }

    public function destroy(BaseUser $user)
    {
        return $this->hasPermission($user, 'permission.delete');
    }
}
