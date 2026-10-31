<?php

namespace Common\Files\Actions;

use Common\Files\FileEntry;
use Common\Files\FileEntryPayload;
use Common\Workspaces\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AuthorizeUploadDestination
{
    public function execute(Request $request, FileEntryPayload $payload): void
    {
        $user = $request->user('sanctum') ?? $request->user('web') ?? $request->user();
        abort_unless($user, 401);

        // Ownership comes from authentication, not client-supplied metadata.
        abort_if($payload->ownerId !== null && $payload->ownerId !== (int) $user->id, 403);
        $payload->ownerId = (int) $user->id;

        Gate::authorize('store', [FileEntry::class, $payload->parentId, $payload->uploadType->name]);

        abort_unless(in_array($payload->backend->id, $payload->uploadType->backendIds, true), 422);

        if ($payload->workspaceId !== null && $payload->workspaceId !== 0) {
            $workspace = Workspace::query()->find($payload->workspaceId);
            abort_unless($workspace, 404);
            abort_unless(
                $workspace->owner_id === $user->id ||
                $workspace->members()->where('workspace_user.user_id', $user->id)->exists(),
                403,
            );
        }

        if ($payload->parentId !== null) {
            $parent = FileEntry::query()->findOrFail($payload->parentId);
            abort_unless($parent->type === 'folder', 422);
            abort_unless((int) ($parent->workspace_id ?? 0) === (int) ($payload->workspaceId ?? 0), 403);
        }
    }
}
