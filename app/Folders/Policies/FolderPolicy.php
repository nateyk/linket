<?php

namespace App\Folders\Policies;

use App\Folders\Models\Folder;
use App\Models\User;
use Common\Workspaces\Policies\WorkspacedResourcePolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Hash;

class FolderPolicy extends WorkspacedResourcePolicy
{
    protected string $resource = Folder::class;

    public function show(User $currentUser, Model $resource): bool|Response
    {
        // block when trying to access via API and no password is provided
        if (!!$resource->password && !requestIsFromFrontend()) {
            if (
                !request('password') ||
                !Hash::check(request('password'), $resource->password)
            ) {
                return false;
            }
        }

        return parent::show($currentUser, $resource);
    }
}
