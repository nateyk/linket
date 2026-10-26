<?php

namespace App\Contacts\Controllers;

use App\Contacts\Actions\PaginateCustomers;
use App\Conversations\Models\Conversation;
use App\Models\User;
use Common\Core\BaseController;
use Illuminate\Support\Facades\Gate;

class CustomersController extends BaseController
{
    public function index()
    {
        $this->authorize('index', Conversation::class);

        $params = request()->all();

        return $this->success([
            'pagination' => (new PaginateCustomers($params))->execute(),
        ]);
    }

    public function destroy(int $userId)
    {
        $user = User::findOrFail($userId);

        // Only user accounts can be deleted through this endpoint — never admins
        // or workspace accounts.
        if ($user->type !== 'user') {
            return $this->error(__('Only user accounts can be deleted.'));
        }

        $this->authorize('update', User::class);
        $this->blockOnDemoSite();

        $user->delete();

        return $this->success();
    }
}
