<?php

namespace Common\Workspaces\Controllers;

use App\Models\User;
use Common\Workspaces\Actions\JoinWorkspace;
use Common\Workspaces\Actions\RemoveMemberFromWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Models\Workspace;
use Common\Workspaces\Models\WorkspaceInvite;
use Common\Workspaces\Models\WorkspaceMember;
use Common\Workspaces\Resources\WorkspaceMemberResource;
use Common\Workspaces\Resources\WorkspaceResource;
use Common\API\ExcludeRouteFromPublicDocs;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Session;

use const App\Providers\WORKSPACE_HOME_ROUTE;

/**
 * @tags Workspaces
 */
class WorkspaceMembersController extends Controller
{
    /**
     * List members.
     *
     * @operationId listWorkspaceMembers
     */
    public function index(int $id)
    {
        $workspace = Workspace::findOrFail($id);

        Gate::authorize('show', $workspace);

        $members = $workspace
            ->members()
            ->with('permissions')
            ->orderBy('workspace_user.created_at')
            ->limit(200)
            ->get();

        return WorkspaceMemberResource::collection($members);
    }

    /**
     * Join a workspace.
     *
     * Join a workspace using valid invite id.
     *
     * @operationId joinWorkspace
     * @response array{data: WorkspaceResource[], workspaceId: int}
     */
    #[ExcludeRouteFromPublicDocs]
    public function join(string $inviteId, Request $request)
    {
        $workspaceInvite = WorkspaceInvite::findOrFail($inviteId);

        if ($user = Auth::user()) {
            (new JoinWorkspace())->execute($workspaceInvite, $user);
            if ($request->expectsJson()) {
                return [
                    'data' => WorkspaceResource::collection(
                        ActiveWorkspace::getAll(),
                    ),
                    'workspaceId' => $workspaceInvite->workspace_id,
                ];
            }

            return redirect(WORKSPACE_HOME_ROUTE);
        }

        Session::put('workspaceInvite', $workspaceInvite->id);
        if (User::query()->where('email', $workspaceInvite->email)->exists()) {
            return redirect(
                "workspace/join/login?email={$workspaceInvite->email}",
            );
        }

        return redirect(
            "workspace/join/register?email={$workspaceInvite->email}",
        );
    }

    /**
     * Remove member.
     *
     * @operationId removeWorkspaceMember
     */
    public function destroy(int $id, int $userId)
    {
        $workspace = Workspace::findOrFail($id);

        Gate::authorize('destroy', [
            WorkspaceMember::class,
            $workspace,
            $userId,
        ]);

        (new RemoveMemberFromWorkspace())->execute($workspace, $userId);

        return WorkspaceResource::collection(ActiveWorkspace::getAll());
    }

    /**
     * Change member's role.
     *
     * @operationId changeWorkspaceMemberRole
     */
    public function changeRole(int $id, int $memberId, Request $request)
    {
        $workspace = Workspace::findOrFail($id);

        Gate::authorize('update', [WorkspaceMember::class, $workspace]);

        $validatedData = $request->validate([
            'roleId' => 'required|integer',
        ]);

        WorkspaceMember::query()
            ->where('id', $memberId)
            ->update(['role_id' => $validatedData['roleId']]);

        return response()->noContent();
    }
}
