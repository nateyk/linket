<?php

namespace App\Webhooks\Policies;

use App\Models\User;
use App\Webhooks\Models\Webhook;
use Common\Core\Policies\BasePolicy;
use Illuminate\Database\Eloquent\Model;

class WebhookPolicy extends BasePolicy
{
    protected string $resource = Webhook::class;

    public function index(User $currentUser, int $userId = null): bool
    {
        $userId = $userId ?? (int) $this->request->get('userId');
        if ($userId) {
            return $currentUser->id === $userId;
        }

        [, $permission] = $this->parseNamespace($this->resource, 'view');
        return $this->hasPermission($currentUser, $permission);
    }

    public function show(User $currentUser, Model $resource): bool
    {
        [, $permission] = $this->parseNamespace($this->resource, 'view');
        return $resource->user_id === $currentUser->id ||
            $this->hasPermission($currentUser, $permission);
    }

    public function store(User $currentUser)
    {
        return $this->storeWithCountRestriction($currentUser, $this->resource);
    }

    public function update(User $currentUser, Model $resource): bool
    {
        [, $permission] = $this->parseNamespace($this->resource, 'update');
        return $resource->user_id === $currentUser->id ||
            $this->hasPermission($currentUser, $permission);
    }

    public function destroy(User $currentUser, $resourceIds = null)
    {
        [, $permission] = $this->parseNamespace($this->resource, 'delete');
        if ($this->hasPermission($currentUser, $permission)) {
            return true;
        }

        if (!$resourceIds) {
            return false;
        }

        $dbCount = app($this->resource)
            ->whereIn('id', $resourceIds)
            ->where('user_id', $currentUser->id)
            ->count();

        return $dbCount === count($resourceIds);
    }
}
