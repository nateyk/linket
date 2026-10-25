<?php

namespace Ai\AiAgent\Flows\Nodes;

use Ai\AiAgent\Models\AiAgentSession;

class CollectDetailsNode extends BaseNode
{
    public static $waitsForUserInput = true;

    public function execute(): bool
    {
        if (
            $this->executor->sessionContext->getStatus() ===
            AiAgentSession::STATUS_WAITING_FOR_USER_INPUT
        ) {
            return $this->storeCollectedDetails();
        } else {
            return $this->showCollectDetailsForm();
        }
    }

    protected function showCollectDetailsForm(): bool
    {
        $message = $this->createConversationMessage([
            'type' => 'collectDetailsForm',
            'body' => [
                'message' => $this->data['message'] ?? '',
                'attributeIds' => $this->data['attributeIds'],
            ],
        ]);

        $this->executor->waitForUserInput();

        $this->executor::$debugLog[] = [
            'event' => 'CollectDetailsNode::showCollectDetailsForm',
            'data' => [
                'formMessageId' => $message->id,
            ],
        ];

        return true;
    }

    protected function storeCollectedDetails(): bool
    {
        $this->executor::$debugLog[] = [
            'event' => 'CollectDetailsNode::storeCollectedDetails',
            'data' => [
                'latestUserMessage' => $this->executor->latestUserMessage?->id,
                'previousMessage' => $this->executor->previousMessage?->id,
            ],
        ];

        $matchedFormData =
            $this->executor->previousMessage->type !== 'collectDetailsForm' ||
            $this->executor->latestUserMessage?->type !== 'submittedFormData'
                ? false
                : $this->executor->latestUserMessage->body['attributes'];

        $this->executor->setSessionStatus(AiAgentSession::STATUS_ACTIVE);

        if ($matchedFormData) {
            $this->executor->goToNode($this->getDirectChildId());
            return true;
        } else {
            $this->executor->sessionContext->setCurrentNodeId(null);
            return false;
        }
    }
}
