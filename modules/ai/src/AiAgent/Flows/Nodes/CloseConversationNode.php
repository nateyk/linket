<?php

namespace Ai\AiAgent\Flows\Nodes;

use App\Conversations\Actions\ConversationEventsCreator;
use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationStatus;

class CloseConversationNode extends BaseNode
{
    public function execute(): bool
    {
        $message = $this->data['message'] ?? null;

        if ($message) {
            $this->createConversationMessage([
                'type' => 'message',
                'body' => $message,
                'attachments' => $this->data['attachmentIds'] ?? [],
            ]);
        }

        $this->executor::$debugLog[] = [
            'event' => 'CloseConversationNode::execute',
            'data' => [
                'message' => $message,
            ],
        ];

        $conversation = $this->executor->conversation;
        $status = ConversationStatus::getDefaultClosed();
        Conversation::changeStatus($status, [$conversation]);

        (new ConversationEventsCreator($conversation))->closedByAiAgent();

        return true;
    }
}
