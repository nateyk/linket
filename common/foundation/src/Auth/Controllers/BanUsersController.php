<?php

namespace Common\Auth\Controllers;

use App\Models\User;
use Common\Core\Demo\BlocksFunctionalityOnDemoSite;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Users, Admin
 */
class BanUsersController extends Controller
{
    use BlocksFunctionalityOnDemoSite;

    /**
     * Ban users.
     *
     * @operationId banUsers
     */
    public function store(string $userIds, Request $request)
    {
        $data = $request->validate([
            'ban_until' => 'date|after:now',
            'comment' => 'string|max:255',
            'permanent' => 'boolean',
        ]);

        $userIds = explode(',', $userIds);

        Gate::authorize('destroy', [User::class, $userIds]);
        $this->blockOnDemoSite();

        $users = User::with('roles')->whereIn('id', $userIds)->get();

        foreach ($users as $user) {
            if ($user->hasPermission('admin')) {
                abort(403, 'Admin users can\'t be suspended');
            }

            if ($user->id === Auth::id()) {
                abort(403, 'You can\'t suspend yourself');
            }

            $user->createBan($data);
        }

        return response()->noContent();
    }

    /**
     * Unban users.
     *
     * @operationId unbanUsers
     */
    public function destroy(string $userIds)
    {
        $userIds = explode(',', $userIds);

        Gate::authorize('destroy', [User::class, $userIds]);
        $this->blockOnDemoSite();

        $users = User::with('roles')->whereIn('id', $userIds)->get();

        foreach ($users as $user) {
            $user->unban();
        }

        return response()->noContent();
    }
}
