<?php

namespace App\Links\Policies;

use App\Links\Models\Link;
use App\Models\User;
use Common\Workspaces\Policies\WorkspacedResourcePolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;

class LinkPolicy extends WorkspacedResourcePolicy
{
    protected string $resource = Link::class;

    public function show(User $currentUser, Model $resource): bool
    {
        // block when trying to access via API and no password is provided
        if (!!$resource->password && !requestIsFromFrontend()) {
            if (
                !request('password') ||
                Hash::make(request('password')) !== $resource->password
            ) {
                return false;
            }
        }

        return parent::show($currentUser, $resource);
    }
}
