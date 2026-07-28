<?php

namespace Common\Workspaces\Controllers;

use App\Models\User;
use Common\Validation\Validators\EmailsAreValid;
use Common\Workspaces\Actions\DeleteInviteNotification;
use Common\Workspaces\Notifications\WorkspaceInvitation;
use Common\Workspaces\Models\Workspace;
use Common\Workspaces\Models\WorkspaceInvite;
use Common\Workspaces\Models\WorkspaceMember;
use Common\Workspaces\Resources\WorkspaceInviteResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Exists;

/**
 * @tags Workspaces
 */
class WorkspaceInvitesController extends Controller
{
    /**
     * List invites.
     *
     * @operationId listWorkspaceInvites
     */
    public function index(int $id)
    {
        $workspace = Workspace::findOrFail($id);

        Gate::authorize('show', $workspace);

        $invites = $workspace
            ->invites()
            ->orderBy('workspace_invites.created_at')
            ->limit(200)
            ->get();

        return WorkspaceInviteResource::collection($invites);
    }

    /**
     * Resend invite.
     *
     * @operationId resendWorkspaceInvite
     */
    public function resend(int $id, string $inviteId)
    {
        $workspace = Workspace::findOrFail($id);
        $workspaceInvite = WorkspaceInvite::findOrFail($inviteId);

        Gate::authorize('store', [WorkspaceMember::class, $workspace, false]);

        $notification = new WorkspaceInvitation(
            $workspace,
            Auth::user()->name,
            $workspaceInvite->id,
        );

        if ($workspaceInvite->user) {
            Notification::send($workspaceInvite->user, $notification);
        } else {
            Notification::route('mail', $workspaceInvite->email)->notify(
                $notification,
            );
        }
        $workspaceInvite->touch();

        return new WorkspaceInviteResource($workspaceInvite);
    }

    /**
     * Invite members.
     *
     * @operationId inviteWorkspaceMembers
     */
    public function store(int $id, Request $request)
    {
        $workspace = Workspace::findOrFail($id);

        Gate::authorize('store', [WorkspaceMember::class, $workspace]);

        $emailRules = ['required', 'email'];
        if (settings('registration.disable')) {
            $emailRules[] = new Exists(User::class, 'email');
        }
        $validatedData = $request->validate([
            'emails' => ['required', 'array'],
            'emails.*.email' => $emailRules,
            'emails.*.roleId' => ['required', 'integer'],
        ]);
        $emails = collect($validatedData['emails']);
        $emailAddresses = $emails->pluck('email')->all();

        $invites = WorkspaceInvite::query()
            ->where('workspace_id', $workspace->id)
            ->whereIn('email', $emailAddresses)
            ->pluck('email');
        $alreadyInvitedEmails = WorkspaceMember::query()
            ->where('workspace_id', $workspace->id)
            ->join('users', 'users.id', 'workspace_user.user_id')
            ->whereIn('users.email', $emailAddresses)
            ->pluck('email')
            ->merge($invites)
            ->toArray();

        $emails = $emails->reject(
            fn($email) => in_array(
                $email['email'],
                $alreadyInvitedEmails,
                true,
            ),
        );

        if ($emails->isNotEmpty()) {
            $existingUsers = User::query()
                ->whereIn('email', $emails->pluck('email'))
                ->get()
                ->keyBy('email');

            $workspaceInvites = $emails
                ->map(function ($email) use ($existingUsers, $workspace) {
                    $emailAddress = $email['email'];
                    if (
                        settings('registration.disable') &&
                        !isset($existingUsers[$emailAddress])
                    ) {
                        return null;
                    }
                    return [
                        'id' => Str::orderedUuid(),
                        'email' => $emailAddress,
                        'user_id' =>
                            $existingUsers[$emailAddress]['id'] ?? null,
                        'workspace_id' => $workspace->id,
                        'image' => isset($existingUsers[$emailAddress])
                            ? $existingUsers[$emailAddress]->getRawOriginal(
                                    'image',
                                ) ?? null
                            : null,
                        'role_id' => $email['roleId'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                })
                ->filter();

            WorkspaceInvite::query()->insert($workspaceInvites->toArray());

            $workspaceInvites->each(function ($invite) use (
                $workspace,
                $existingUsers,
            ) {
                $notification = new WorkspaceInvitation(
                    $workspace,
                    Auth::user()->name,
                    $invite['id'],
                );
                if ($user = Arr::get($existingUsers, $invite['email'])) {
                    Notification::send($user, $notification);
                } else {
                    Notification::route('mail', $invite['email'])->notify(
                        $notification,
                    );
                }
            });

            $invites = $workspace
                ->invites()
                ->whereIn(
                    'workspace_invites.id',
                    $workspaceInvites->pluck('id'),
                )
                ->get();
        }

        return [
            'invites' => WorkspaceInviteResource::collection(
                $invites ?? collect(),
            ),
        ];
    }

    /**
     * Delete invite.
     *
     * @operationId deleteWorkspaceInvite
     */
    public function destroy(string $inviteId)
    {
        $workspaceInvite = WorkspaceInvite::findOrFail($inviteId);
        $workspace = Workspace::findOrFail($workspaceInvite->workspace_id);

        Gate::authorize('destroy', [
            WorkspaceMember::class,
            $workspace,
            $workspaceInvite->user_id,
        ]);

        if ($workspaceInvite->user) {
            (new DeleteInviteNotification())->execute(
                $workspaceInvite,
                $workspaceInvite->user,
            );
        }

        $workspaceInvite->delete();

        return response()->noContent();
    }

    /**
     * Change invite's role.
     *
     * @operationId changeWorkspaceInviteRole
     */
    public function changeRole(int $id, string $inviteId, Request $request)
    {
        $workspace = Workspace::findOrFail($id);

        Gate::authorize('update', [WorkspaceMember::class, $workspace]);

        $validatedData = $request->validate([
            'roleId' => 'required|integer',
        ]);

        WorkspaceInvite::query()
            ->where('id', $inviteId)
            ->update(['role_id' => $validatedData['roleId']]);

        return response()->noContent();
    }
}
