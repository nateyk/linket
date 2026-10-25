<?php

namespace Livechat\Widget;

use App\Conversations\Models\Conversation;
use Ai\AiAgent\Conversations\AiAgent;
use App\Core\WidgetFlags;

class HandleLatestUserMessage
{
    public function __construct(protected Conversation $conversation) {}

    public function execute()
    {
        // if AI agent disabled or conversation is escalated to human, bail
        if (
            (!settings('aiAgent.enabled') &&
                !WidgetFlags::isAiAgentPreviewMode()) ||
            $this->conversation->assigned_to !== Conversation::ASSIGNED_BOT ||
            !class_exists(AiAgent::class)
        ) {
            return;
        }

        return (new AiAgent($this->conversation))->handleLatestUserMessage();
    }
}
