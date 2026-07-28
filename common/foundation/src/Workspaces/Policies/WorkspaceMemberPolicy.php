<?php

namespace Common\Workspaces\Policies;

use App\Models\User;
use Common\Core\Policies\BasePolicy;
use Common\Core\Policies\PolicyFailReason;
use Common\Workspaces\Models\Workspace;

class WorkspaceMemberPolicy extends BasePolicy
{
    public function store(
        User $currentUser,
        Workspace $workspace,
        $checkMemberCount = true,
    ) {
        $member = $workspace->findMember($currentUser);

        if (!$member || !$member->hasPermission('workspace_members.invite')) {
            return false;
        }

        $owner =
            $currentUser->id === $workspace->owner_id
                ? $currentUser
                : $workspace->owner;
        $maxMemberCount = $owner->getRestrictionValue(
            'workspaces.create',
            'member_count',
        );

        if (!$checkMemberCount || !$maxMemberCount) {
            return true;
        }

        $currentMemberCount =
            $workspace->members()->count() + $workspace->invites->count();

        if ($currentMemberCount >= $maxMemberCount) {
            return $this->denyWithReason(
                message: __('You are over your allowed quota'),
                code: PolicyFailReason::OVER_QUOTA,
                action: 'create',
                resources: 'workspace members',
            );
        }

        return true;
    }

    public function update(User $currentUser, Workspace $workspace)
    {
        if ($workspace->isOwner($currentUser)) {
            return true;
        } else {
            return $workspace
                ->findMember($currentUser)
                ->hasPermission('workspace_members.update');
        }
    }

    public function destroy(
        User $currentUser,
        Workspace $workspace,
        int|null $userId = null,
    ) {
        if ($workspace->isOwner($currentUser)) {
            return true;
        } elseif ($currentUser->id === $userId) {
            // user is trying to delete their own membership, aka leaving workspace
            return true;
        } else {
            return $workspace
                ->findMember($currentUser)
                ->hasPermission('workspace_members.delete');
        }
    }
}
