<?php

namespace Common\Roles\Controllers;

use Common\Permissions\Traits\SyncsPermissions;
use Common\Auth\Jobs\ExportRolesCsv;
use Common\Core\Demo\BlockedOnDemoSite;
use Common\Csv\CsvExport;
use Common\Roles\Models\Role;
use Common\Roles\Requests\CreateRoleRequest;
use Common\Roles\Requests\UpdateRoleRequest;
use Common\Roles\Resources\RoleResource;
use Common\API\ExcludeRouteFromPublicDocs;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Roles, Admin
 */
class RolesController extends Controller
{
    use SyncsPermissions;

    /**
     * List all roles.
     *
     * @operationId listRoles
     */
    public function index(Request $request)
    {
        $data = $request->validate([
            'type' => 'string',
            'include' => 'string',
            'query' => 'string',
        ]);

        Gate::authorize('index', [Role::class, $data['type'] ?? null]);

        $roles = Role::query()
            ->when(
                isset($data['type']),
                fn($q) => $q->where('type', $data['type']),
            )
            ->withRequestedRelations($data)
            ->limit(200)
            ->orderBy('id', 'desc')
            ->get();

        return RoleResource::collection($roles);
    }

    /**
     * Retrieve a role.
     *
     * @operationId retrieveRole
     */
    public function show(int $id, Request $request)
    {
        $role = Role::query()
            ->withRequestedRelations($request->all())
            ->findOrFail($id);

        Gate::authorize('show', $role);

        $request->validate([
            'include' => 'string',
        ]);

        $role->loadMissing(['permissions']);

        return new RoleResource($role);
    }

    /**
     * Create a role.
     *
     * @operationId createRole
     */
    #[BlockedOnDemoSite]
    public function store(CreateRoleRequest $request)
    {
        Gate::authorize('store', Role::class);

        $data = $request->validated();

        $role = Role::create(Arr::except($data, 'permissions'));

        if (isset($data['permissions'])) {
            $this->syncPermissions($role, $data['permissions']);
        }

        return (new RoleResource($role))->response()->setStatusCode(201);
    }

    /**
     * Update a role.
     *
     * @operationId updateRole
     */
    #[BlockedOnDemoSite]
    public function update(int $id, UpdateRoleRequest $request)
    {
        Gate::authorize('update', Role::class);

        $data = $request->validated();

        $role = Role::findOrFail($id);

        $role->update(Arr::except($data, 'permissions'));

        if (isset($data['permissions'])) {
            $this->syncPermissions($role, $data['permissions']);
        }

        return new RoleResource($role);
    }

    /**
     * Delete a role.
     *
     * @operationId deleteRole
     */
    #[BlockedOnDemoSite]
    public function destroy(int $id)
    {
        $role = Role::findOrFail($id);

        abort_if(
            $role->internal,
            422,
            __("System role ':name' cannot be deleted.", [
                'name' => $role->name,
            ]),
        );

        Gate::authorize('destroy', $role);

        $role->users()->detach();
        $role->delete();

        return response()->noContent();
    }

    /**
     * Export roles as CSV.
     *
     * @operationId exportRolesCsv
     */
    #[ExcludeRouteFromPublicDocs]
    public function exportCsv(Request $request)
    {
        Gate::authorize('index', Role::class);

        return CsvExport::exportUsing(new ExportRolesCsv(Auth::id()));
    }
}
