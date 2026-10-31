<?php

namespace Common\Workspaces\Policies;

use App\Models\User;
use Common\Core\Policies\BasePolicy;
use Common\Core\Policies\PolicyFailReason;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Auth\Access\Response;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

abstract class WorkspacedResourcePolicy extends BasePolicy
{
    protected string $resource;

    public function index(User $currentUser)
    {
        [, $permission] = $this->parseNamespace($this->resource, 'view');

        // has global permission to view resources
        if (parent::hasPermission($currentUser, $permission)) {
            return true;
        }

        // requested to view all resources and have no global permission
        if (!ActiveWorkspace::shouldScopeToWorkspace()) {
            return false;
        }

        // user can view all resources as member of workspace
        $workspace = ActiveWorkspace::get();
        if ($this->isWorkspaceMember($workspace, $currentUser)) {
            return true;
        }

        return Response::deny(
            'No permission',
            $workspace?->isOwner($currentUser)
                ? PolicyFailReason::NO_PERMISSION
                : PolicyFailReason::NO_WORKSPACE_PERMISSION,
        );
    }

    public function show(User $currentUser, Model $resource): bool|Response
    {
        $activeWorkspace = ActiveWorkspace::get(
            $resource->workspace_id,
            createIfNotFound: false,
        );
        [, $permission] = $this->parseNamespace($this->resource, 'view');

        // has global permission to view resources
        if (parent::hasPermission($currentUser, $permission)) {
            return true;
        }

        // workspace for resource does not exist in database, should generally not happen
        if (
            !$activeWorkspace ||
            $activeWorkspace->id !== $resource->workspace_id
        ) {
            return Response::deny(
                'No workspace found',
                PolicyFailReason::NO_PERMISSION,
            );
        }

        // user can view resource as member of workspace
        if ($this->isWorkspaceMember($activeWorkspace, $currentUser)) {
            return true;
        }

        return Response::deny(
            'No permission',
            $activeWorkspace->isOwner($currentUser)
                ? PolicyFailReason::NO_PERMISSION
                : PolicyFailReason::NO_WORKSPACE_PERMISSION,
        );
    }

    public function store(User $currentUser)
    {
        [
            $relationName,
            $permission,
            $singularName,
            $pluralName,
        ] = $this->parseNamespace($this->resource, 'create');

        $workspace = ActiveWorkspace::get();
        $ownerUser = $workspace->getOwnerUser();

        // owner has no permission to create resources
        if (
            !$workspace->isOwner($currentUser) &&
            !$ownerUser->hasPermission($permission)
        ) {
            return Response::deny(
                'No permission',
                PolicyFailReason::NO_PERMISSION,
            );
        }

        if ($workspace->findMember($currentUser)?->hasPermission($permission)) {
            // check if owner did not go over their max quota
            if (
                $maxCount = $ownerUser->getRestrictionValue(
                    $permission,
                    'count',
                )
            ) {
                $countName = Str::snake($relationName) . '_count';
                $count = is_null($ownerUser->$countName)
                    ? $ownerUser->loadCount($relationName)->$countName
                    : $ownerUser->$countName;

                if ($count >= $maxCount) {
                    return $this->denyWithReason(
                        message: $workspace->isOwner($currentUser)
                            ? __('You are over your allowed quota')
                            : __('This workspace is over the allowed quota'),
                        code: PolicyFailReason::OVER_QUOTA,
                        resources: $pluralName,
                        action: 'create',
                    );
                }
            }

            return Response::allow();
        }

        return Response::deny(
            'No permission',
            $workspace->isOwner($currentUser)
                ? PolicyFailReason::NO_PERMISSION
                : PolicyFailReason::NO_WORKSPACE_PERMISSION,
        );
    }

    public function update(
        User $currentUser,
        Model $resource,
        array|null $resourceIds = null,
    ) {
        $activeWorkspace = ActiveWorkspace::get($resource->workspace_id);
        [, $permission] = $this->parseNamespace($this->resource, 'update');

        // has global permission to update resources
        if (parent::hasPermission($currentUser, $permission)) {
            return true;
        }

        // workspace for resource does not exist in database, should generally not happen
        if (
            !$activeWorkspace ||
            $activeWorkspace->id !== $resource->workspace_id
        ) {
            return Response::deny(
                'No workspace found',
                PolicyFailReason::NO_PERMISSION,
            );
        }

        $member = $activeWorkspace->members()->where('user_id', $currentUser->id)->first();
        $hasWorkspacePermission = $member?->hasPermission($permission);

        $resolvedResources = $resourceIds === null ? null : $this->resource::query()
            ->whereIn('id', $resourceIds)
            ->select(['id', 'workspace_id'])
            ->get();
        $allResourcesAreForActiveWorkspace = $resolvedResources === null || (
            $resolvedResources->count() === count(array_unique($resourceIds))
            && $resolvedResources->every(fn ($resolvedResource) => $resolvedResource->workspace_id === $activeWorkspace->id)
        );

        // user has permission to delete resources in the active workspace
        if ($allResourcesAreForActiveWorkspace && $hasWorkspacePermission) {
            return true;
        }

        return Response::deny(
            'No permission',
            $activeWorkspace->isOwner($currentUser)
                ? PolicyFailReason::NO_PERMISSION
                : PolicyFailReason::NO_WORKSPACE_PERMISSION,
        );
    }

    public function destroy(User $currentUser, mixed $resourceIds = null)
    {
        $workspace = ActiveWorkspace::get();
        [, $permission] = $this->parseNamespace($this->resource, 'delete');

        // has global permission to delete resources
        if (parent::hasPermission($currentUser, $permission)) {
            return true;
        }

        if (!$workspace) {
            return Response::deny('No workspace found', PolicyFailReason::NO_PERMISSION);
        }

        if (!$resourceIds) {
            $resources = collect([]);
        } elseif ($resourceIds instanceof Model) {
            $resources = collect([$resourceIds]);
        } else {
            $requestedIds = is_array($resourceIds) ? $resourceIds : [$resourceIds];
            $resources = app($this->resource)
                ->whereIn('id', $requestedIds)
                ->select(['id', 'workspace_id'])
                ->get();
            if ($resources->count() !== count(array_unique($requestedIds))) {
                return Response::deny('Some resources were not found', PolicyFailReason::NO_PERMISSION);
            }
        }

        if ($resources->isEmpty()) {
            return Response::deny('No resources found', PolicyFailReason::NO_PERMISSION);
        }

        $member = $workspace->members()->where('user_id', $currentUser->id)->first();
        $hasWorkspacePermission = $member?->hasPermission($permission);

        $allResourcesAreForActiveWorkspace =
            $resources->isEmpty() ||
            $resources->every(fn($r) => $r->workspace_id === $workspace->id);

        // user has permission to delete resources in the active workspace
        if ($allResourcesAreForActiveWorkspace && $hasWorkspacePermission) {
            return true;
        }

        return Response::deny(
            'No permission',
            $workspace->isOwner($currentUser)
                ? PolicyFailReason::NO_PERMISSION
                : PolicyFailReason::NO_WORKSPACE_PERMISSION,
        );
    }

    private function isWorkspaceMember(mixed $workspace, User $user): bool
    {
        if (!$workspace) {
            return false;
        }

        return $workspace->members()->where('user_id', $user->id)->exists();
    }

}
