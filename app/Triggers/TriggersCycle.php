<?php

namespace App\Triggers;

use App\Conversations\Models\Conversation;

/**
 * Phase 1 stub — full triggers land in Phase 2.
 * Keeps conversation event listeners from fatalling.
 */
class TriggersCycle
{
    public static bool $isRunning = false;

    public function executeTimeBasedTriggers(): void
    {
    }

    public function runAgainstConversation(
        Conversation $conversation,
        ?array $dataBeforeUpdate = null,
    ): void {
    }
}
