<?php

namespace Common\Workspaces\Actions;

use Common\Workspaces\Models\Workspace;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Common\Workspaces\ActiveWorkspace;

class CreateWorkspace
{
    public function execute(array $data): Workspace
    {
        $ownerId = $data['owner_id'] ?? Auth::id();

        $workspace = Workspace::create([
            'owner_id' => $ownerId,
            ...$data,
        ]);

        $workspace
            ->members()
            ->create(['user_id' => $ownerId, 'is_owner' => true]);

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
