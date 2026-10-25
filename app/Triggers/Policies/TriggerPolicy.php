<?php

namespace App\Triggers\Policies;

use App\Models\User;
use Common\Core\Policies\BasePolicy;

class TriggerPolicy extends BasePolicy
{
    public function index(User $user): bool
    {
        return $this->canManageTriggers($user);
    }

    public function show(User $user): bool
    {
        return $this->canManageTriggers($user);
    }

    public function store(User $user): bool
    {
        return $this->canManageTriggers($user);
    }

    public function update(User $user): bool
    {
        return $this->canManageTriggers($user);
    }

    public function destroy(User $user): bool
    {
        return $this->canManageTriggers($user);
    }

    protected function canManageTriggers(User $user): bool
    {
        return $this->hasPermission($user, 'triggers.update') ||
            $this->hasPermission($user, 'admin');
    }
}
