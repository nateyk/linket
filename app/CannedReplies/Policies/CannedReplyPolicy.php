<?php

namespace App\CannedReplies\Policies;

use App\CannedReplies\Models\CannedReply;
use App\Models\User;
use Common\Core\Policies\BasePolicy;

class CannedReplyPolicy extends BasePolicy
{
    public function index(User $user): bool
    {
        return $this->hasPermission($user, 'canned_replies.update') ||
            $this->hasPermission($user, 'conversations.update') ||
            $this->hasPermission($user, 'tickets.update');
    }

    public function show(User $user, ?CannedReply $reply = null): bool
    {
        return $this->index($user);
    }

    public function store(User $user): bool
    {
        return $this->index($user);
    }

    public function update(User $user, CannedReply $reply): bool
    {
        return $this->index($user) || $user->id === $reply->user_id;
    }

    public function destroy(User $user): bool
    {
        return $this->index($user);
    }
}
