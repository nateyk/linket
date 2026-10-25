<?php

namespace Ai\AiAgent\Flows;

use Ai\AiAgent\Models\AiAgentSession;
use Ai\AiAgent\Models\AiAgentTool;
use Ai\AiAgent\Variables\VariableReplacerData;
use App\Conversations\Models\Conversation;
use App\Models\User;

class MessageBuilderData
{
    public function __construct(
        public array $nodeConfig,
        public array $allNodes,
        public Conversation|null $conversation = null,
        public User|null $user = null,
        public AiAgentSession|null $session = null,
        public AiAgentTool|null $tool = null,
        public array|null $toolResponse = null,
    ) {}

    public function toVariableReplacerData(): VariableReplacerData
    {
        return new VariableReplacerData(
            $this->conversation,
            $this->user,
            $this->session,
            $this->tool,
            $this->toolResponse,
        );
    }
}
