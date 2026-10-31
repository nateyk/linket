<?php

namespace App\Biolinks\Policies;

use App\Biolinks\Models\Biolink;
use App\Folders\Policies\FolderPolicy;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Hash;

class BiolinkPolicy extends FolderPolicy
{
    protected string $resource = Biolink::class;

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
