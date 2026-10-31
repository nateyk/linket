<?php

namespace Common\Workspaces\Actions;

use Common\Workspaces\Models\Workspace;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateWorkspace
{
    public function execute(array $data): Workspace
    {
        $ownerId = $data['owner_id'] ?? Auth::id();
        $workspace = DB::transaction(function () use ($ownerId, $data): Workspace {
            $owner = User::query()->whereKey($ownerId)->lockForUpdate()->firstOrFail();
            $plan = $owner->getSubscriptionProduct();
            $isFreeAccount = !$plan || $plan->free;
            $isPersonalWorkspace = (bool) ($data['is_personal'] ?? false);
            $hasPersonalWorkspace = Workspace::query()->where('owner_id', $ownerId)->where('is_personal', true)->exists();
            if ($isFreeAccount && (!$isPersonalWorkspace || $hasPersonalWorkspace)) {
                throw ValidationException::withMessages(['workspace' => __('Free accounts can have one personal workspace.')]);
            }
            $workspace = Workspace::create(['owner_id' => $ownerId, ...$data]);
            $workspace->members()->create(['user_id' => $ownerId, 'is_owner' => true]);
            return $workspace;
        });

        ActiveWorkspace::clearCache();

        return $workspace;
    }

    public function createPersonalWorkspace(User $user): Workspace
    {
        $workspace = Workspace::query()
            ->where('owner_id', $user->id)
            ->where('is_personal', true)
            ->first();

        if (!$workspace) {
            $workspace = $this->execute([
                'name' => __('Personal'),
                'is_personal' => true,
                'owner_id' => $user->id,
            ]);
        }

        return $workspace;
    }
}
