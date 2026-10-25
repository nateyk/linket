<?php

namespace Ai\AiAgent\Variables;

use Ai\AiAgent\Models\AiAgentSession;
use Ai\AiAgent\Models\AiAgentTool;
use App\Conversations\Models\Conversation;
use App\Models\User;

class VariableReplacerData
{
    public function __construct(
        public Conversation|null $conversation = null,
        public User|null $user = null,
        public AiAgentSession|null $session = null,
        public AiAgentTool|null $tool = null,
        public array|null $toolResponse = null,
        // optional array of attributes with type and name. Will take priority over attributes on models
        public array|null $attributes = null,
    ) {}

    public static function fromConversation(
        Conversation $conversation,
        array|null $attributes = null,
    ) {
        return new self(
            conversation: $conversation,
            user: $conversation->user,
            session: $conversation->AiAgentSession,
            attributes: $attributes,
        );
    }
}
