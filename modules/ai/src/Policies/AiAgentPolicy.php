<?php

namespace Ai\Policies;

use App\Models\User;
use Common\Core\Policies\BasePolicy;

class AiAgentPolicy extends BasePolicy
{
    public function update(?User $user): bool
    {
        return $this->hasPermission($user, 'ai_agent.update');
    }
}
