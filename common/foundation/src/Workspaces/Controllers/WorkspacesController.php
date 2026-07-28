<?php

namespace Common\Workspaces\Controllers;

use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Actions\DeleteWorkspaces;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Models\Workspace;
use Common\Workspaces\Requests\CreateWorkspaceRequest;
use Common\Workspaces\Requests\UpdateWorkspaceRequest;
use Common\Workspaces\Resources\WorkspaceResource;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Workspaces
 */
class WorkspacesController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * List workspaces.
     *
     * @operationId listWorkspaces
     */
    public function index()
    {
        return WorkspaceResource::collection(ActiveWorkspace::getAll());
    }

    /**
     * Retrieve a workspace.
     *
     * @operationId retrieveWorkspace
     */
    public function show(int $id)
    {
        $workspace = Workspace::findOrFail($id);

        Gate::authorize('show', $workspace);

        $workspace->loadMissing(['invites', 'members.permissions']);

        return new WorkspaceResource($workspace);
    }

    /**
     * Create a workspace.
     *
     * @operationId createWorkspace
     */
    public function store(CreateWorkspaceRequest $request)
    {
        Gate::authorize('store', Workspace::class);

        (new CreateWorkspace())->execute($request->validated());

        return WorkspaceResource::collection(ActiveWorkspace::getAll());
    }

    /**
     * Update a workspace.
     *
     * @operationId updateWorkspace
     */
    public function update(int $id, UpdateWorkspaceRequest $request)
    {
        $workspace = Workspace::findOrFail($id);

        Gate::authorize('update', $workspace);

        $workspace->fill($request->validated())->save();

        return new WorkspaceResource($workspace);
    }

    /**
     * Delete a workspace.
     *
     * @operationId deleteWorkspace
     */
    public function destroy(int $id)
    {
        $workspace = Workspace::findOrFail($id);

        Gate::authorize('destroy', $workspace);

        (new DeleteWorkspaces())->execute([$id]);

        return WorkspaceResource::collection(ActiveWorkspace::getAll());
    }
}
