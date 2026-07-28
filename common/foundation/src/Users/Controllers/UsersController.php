<?php

namespace Common\Users\Controllers;

use App\Models\User;
use Common\Auth\Actions\CreateUser;
use Common\Auth\Actions\DeleteUsers;
use Common\Auth\Actions\UpdateUser;
use Common\Auth\Actions\UsersQueryBuilder;
use Common\Auth\Jobs\ExportUsersCsv;
use Common\Core\Demo\BlockedOnDemoSite;
use Common\Csv\CsvExport;
use Common\Users\Requests\CreateUserRequest;
use Common\Users\Requests\UpdateUserRequest;
use Common\Users\Resources\UserResource;
use Common\API\ExcludeRouteFromPublicDocs;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Users, Admin
 */
class UsersController extends Controller
{
    /**
     * List all users.
     *
     * @operationId listUsers
     */
    public function index(Request $request)
    {
        Gate::authorize('index', User::class);

        $data = $request->validate([
            'query' => 'nullable|string',
            'per_page' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
            'include' => 'string',
            'fields_preset' => 'string',
            'email_confirmed' => 'string',
            'is_subscribed' => 'string',
            'created_at' => 'date',
            'updated_at' => 'date',
            'last_active_at' => 'date',
            'device' => 'string',
            'browser' => 'string',
            'platform' => 'string',
            'country' => 'string',
            'city' => 'string',
            'language' => 'string',
            'timezone' => 'string',
            'ip_address' => 'string',
        ]);

        $pagination = (new UsersQueryBuilder($data))->paginate();

        return UserResource::collection($pagination);
    }

    /**
     * Retrieve a user.
     *
     * @operationId retrieveUser
     */
    public function show(int $id, Request $request)
    {
        $user = User::findOrFail($id);

        Gate::authorize('show', $user);

        $request->validate([
            'include' => 'string',
            'fields_preset' => 'string',
        ]);

        return new UserResource($user);
    }

    /**
     * Create a user.
     *
     * @operationId createUser
     */
    #[BlockedOnDemoSite]
    public function store(CreateUserRequest $request)
    {
        Gate::authorize('store', User::class);

        $user = (new CreateUser())->execute($request->validated());

        return new UserResource($user);
    }

    /**
     * Update a user.
     *
     * @operationId updateUser
     */
    #[BlockedOnDemoSite]
    public function update(int $userId, UpdateUserRequest $request)
    {
        $user = User::findOrFail($userId);

        Gate::authorize('update', $user);

        $user = (new UpdateUser())->execute($user, $request->validated());

        return new UserResource($user);
    }

    /**
     * Bulk delete users.
     *
     * @operationId deleteUsers
     */
    #[BlockedOnDemoSite]
    public function bulkeDelete(Request $request)
    {
        $data = $request->validate([
            // Comma-separated list of user IDs to delete. Maximum of 100 IDs. Non-existing IDs will be ignored.
            'userIds' => 'required|string',
        ]);

        $userIds = array_slice(explode(',', $data['userIds']), 0, 100);

        Gate::authorize('destroy', [User::class, $userIds]);

        $users = User::query()->whereIn('id', $userIds)->get();

        foreach ($users as $user) {
            abort_if(
                $user->id === Auth::id(),
                422,
                __('Could not delete currently logged in user: :email', [
                    'email' => $user->email,
                ]),
            );

            abort_if(
                $user->hasPermission('admin'),
                422,
                __('Could not delete admin user: :email', [
                    'email' => $user->email,
                ]),
            );

            abort_if(
                $user->subscribed(),
                422,
                __('Could not delete subscribed user: :email', [
                    'email' => $user->email,
                ]),
            );
        }

        (new DeleteUsers())->execute($users->pluck('id')->toArray());

        return response()->noContent();
    }

    /**
     * Export users as CSV.
     *
     * @operationId exportUsersCsv
     */
    #[ExcludeRouteFromPublicDocs]
    public function exportCsv(Request $request)
    {
        Gate::authorize('index', User::class);

        return CsvExport::exportUsing(new ExportUsersCsv(Auth::id()));
    }
}
