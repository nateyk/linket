<?php

namespace Common\Roles\Controllers;

use App\Models\User;
use Common\Core\Demo\BlockedOnDemoSite;
use Common\Roles\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Common\Roles\Actions\RoleUsersQueryBuilder;
use Common\Roles\Resources\RoleUserResource;

/**
 * @tags Roles, Admin
 */
class RoleUsersController extends Controller
{
    /**
     * List all role users.
     *
     * @operationId listRoleUsers
     */
    public function index(int $id, Request $request)
    {
        Gate::authorize('update', Role::class);

        $data = $request->validate([
            'query' => 'string',
            'per_page' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
        ]);

        $pagination = (new RoleUsersQueryBuilder($id, $data))->paginate();

        return RoleUserResource::collection($pagination);
    }

    /**
     * Add users to a role.
     *
     * @operationId addUsersToRole
     */
    #[BlockedOnDemoSite]
    public function addUsers(int $id, Request $request)
    {
        Gate::authorize('update', Role::class);

        $data = $request->validate([
            'userIds' => 'required|array|min:1|max:25',
            'userIds.*' => 'required|int',
        ]);

        $role = Role::findOrFail($id);

        $userIds = User::query()
            ->with('roles')
            ->whereIn('id', $data['userIds'])
            ->pluck('id');

        abort_if(
            $userIds->isEmpty(),
            422,
            __('Could not attach specified users to role.'),
        );

        $role->users()->syncWithoutDetaching($userIds);

        return response()->noContent();
    }

    /**
     * Remove users from a role.
     *
     * @operationId removeUsersFromRole
     */
    #[BlockedOnDemoSite]
    public function removeUsers(int $id, Request $request)
    {
        Gate::authorize('update', Role::class);

        $data = $request->validate([
            'userIds' => 'required|array|min:1',
            'userIds.*' => 'required|integer',
        ]);

        $role = Role::findOrFail($id);

        $role->users()->detach($data['userIds']);

        return response()->noContent();
    }
}
