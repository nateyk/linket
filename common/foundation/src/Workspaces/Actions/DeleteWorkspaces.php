<?php

namespace Common\Workspaces\Actions;

use Common\Workspaces\Actions\RemoveMemberFromWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Events\WorkspaceDeleted;
use Common\Workspaces\Models\Workspace;
use Common\Workspaces\Models\WorkspaceMember;

class DeleteWorkspaces
{
    public function execute(array $ids)
    {
        $workspaces = Workspace::query()->whereIn('id', $ids)->get();

        $workspaces->each(function (Workspace $workspace) {
            $workspace->invites()->delete();
            $workspace->members->each(function (WorkspaceMember $member) use (
                $workspace,
            ) {
                (new RemoveMemberFromWorkspace())->execute(
                    $workspace,
                    $member->id,
                );
            });
            event(new WorkspaceDeleted($workspace->id, $workspace->owner_id));
        });

        Workspace::query()->whereIn('id', $ids)->delete();

        ActiveWorkspace::clearCache();
    }
}
