<?php

namespace Common\Workspaces\Actions;

use App\Models\User;
use Common\Workspaces\Models\WorkspaceInvite;
use Illuminate\Support\Facades\Session;

class JoinWorkspace
{
    public function execute(WorkspaceInvite $invite, User $user)
    {
        if ($invite->email === $user->email) {
            $invite->workspace
                ->members()
                ->firstOrCreate(
                    ['user_id' => $user->id],
                    ['role_id' => $invite->role_id],
                );

            (new DeleteInviteNotification())->execute($invite, $user);

            $invite->delete();
        }
        Session::remove('activeWorkspace');
    }
}
