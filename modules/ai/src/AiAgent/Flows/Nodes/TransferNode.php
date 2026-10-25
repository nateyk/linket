<?php

namespace Ai\AiAgent\Flows\Nodes;

use App\Conversations\Agent\Actions\ConversationsAssigner;

class TransferNode extends BaseNode
{
    public function execute(): bool
    {
        $agentId = $this->data['agentId'] ?? null;
        $groupId = $this->data['groupId'] ?? null;
        $message = $this->data['message'] ?? null;

        if ($message) {
            $this->createConversationMessage([
                'type' => 'message',
                'body' => $message,
                'attachments' => $this->data['attachmentIds'],
            ]);
        }

        if ($groupId) {
            $this->executor->conversation->update([
                'group_id' => $groupId,
            ]);
        }

        if ($agentId) {
            ConversationsAssigner::assignConversationsToAgent(
                [$this->executor->conversation],
                agentId: $agentId,
                addEvent: true,
            );
        } else {
            ConversationsAssigner::assignConversationToFirstAvailableAgent(
                $this->executor->conversation,
                addEvent: true,
            );
        }

        $this->executor::$debugLog[] = [
            'event' => 'TransferNode::execute',
            'data' => [
                'agentId' => $agentId,
                'groupId' => $groupId,
                'message' => $message,
            ],
        ];

        return true;
    }
}
