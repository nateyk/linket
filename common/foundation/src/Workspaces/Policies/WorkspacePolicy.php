<?php

namespace Common\Workspaces\Policies;

use Common\Auth\Models\BaseUser;
use Common\Core\Policies\BasePolicy;
use Common\Workspaces\Models\Workspace;

class WorkspacePolicy extends BasePolicy
{
    public function index(BaseUser $user, int|null $userId = null)
    {
        return $this->hasPermission($user, 'workspaces.view') ||
            $user->id === $userId;
    }

    public function show(BaseUser $user, Workspace $workspace)
    {
        return $this->hasPermission($user, 'workspaces.view') ||
            $workspace->owner_id === $user->id ||
            $workspace->isMember($user);
    }

    public function store(BaseUser $user)
    {
        return $this->storeWithCountRestriction($user, Workspace::class);
    }

    public function update(BaseUser $user, Workspace $workspace)
    {
        return $this->hasPermission($user, 'workspaces.update') ||
            $workspace->owner_id === $user->id;
    }

    public function destroy(BaseUser $user, Workspace $workspace)
    {
        if ($workspace->is_personal) {
            return false;
        }

        if ($this->hasPermission($user, 'workspaces.delete')) {
            return true;
        }

        return $workspace->owner_id === $user->id;
    }
}
