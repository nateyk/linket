<?php

namespace Common\Permissions\Controllers;

use Common\Permissions\Config\PermissionConfigLoader;
use Common\Permissions\Config\PermissionConfigItem;
use Common\Settings\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Roles, Admin
 */
class PermissionsController extends Controller
{
    /**
     * List all permissions.
     *
     * @operationId listPermissions
     */
    public function index(Request $request)
    {
        Gate::authorize('index', Setting::class);

        $data = $request->validate([
            'roleType' => 'required|string',
        ]);

        $permissions = (new PermissionConfigLoader())->getWithId(
            $data['roleType'],
        );

        /**
         * @body array{data: array<PermissionConfigItem>}
         */
        return response()->json([
            'data' => array_map(
                fn(PermissionConfigItem $permission) => $permission->toArray(),
                $permissions,
            ),
        ]);
    }
}
