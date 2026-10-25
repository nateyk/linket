<?php

namespace Ai\AiAgent\Flows\Nodes;

use Ai\AiAgent\Models\AiAgentSession;
use Illuminate\Support\Arr;

class DynamicButtonsNode extends BaseDynamicNode
{
    public function execute(): bool
    {
        if (
            $this->executor->sessionContext->getStatus() ===
            AiAgentSession::STATUS_WAITING_FOR_USER_INPUT
        ) {
            $this->executor->setSessionStatus(AiAgentSession::STATUS_ACTIVE);

            $child = $this->getDirectChild();
            if ($child) {
                $this->executor->goToNode($child['id']);
            }
            return true;
        } else {
            return $this->showButtons();
        }
    }

    protected function showButtons()
    {
        $this->executor::$debugLog[] = [
            'event' => 'DynamicButtonsNode::showButtons',
        ];

        $data = $this->getDataFromToolResponse();
        $replacer = $data['variableReplacer'];
        $list = $data['list'];

        if ($list && is_array($list)) {
            $messageText = $this->data['message'] ?? '';
            $buttons = collect($list)
                ->slice(0, 10)
                ->map(
                    fn($item, $index) => self::prepareButtonData(
                        $this->data['button'],
                        $replacer,
                        $index,
                    ),
                )
                ->values()
                ->toArray();

            $this->createConversationMessage([
                'type' => 'message',
                'body' => $messageText ? $replacer->execute($messageText) : '',
                'attachments' => $this->data['attachmentIds'] ?? [],
                'data' => [
                    'preventTyping' => $this->data['preventTyping'] ?? false,
                    'buttons' => $buttons,
                ],
            ]);

            $this->executor->waitForUserInput();

            return true;
        }

        return false;
    }

    protected function matchUserMessageToButtons()
    {
        $this->executor::$debugLog[] = [
            'event' => 'DynamicButtonsNode::matchUserMessageToButtons',
            'data' => [
                'latestUserMessage' => $this->executor->latestUserMessage?->id,
                'previousMessage' => $this->executor->previousMessage?->id,
            ],
        ];

        $previousButtons =
            $this->executor->previousMessage->data['buttons'] ?? null;

        $matchedButton =
            $this->executor->latestUserMessage?->type !== 'message' ||
            $this->executor->previousMessage?->type !== 'message' ||
            !$previousButtons
                ? false
                : Arr::first($previousButtons, function ($button) {
                    $name = slugify($button['name']);
                    $message = slugify(
                        $this->executor->latestUserMessage->body,
                    );
                    return $name === $message;
                });

        $this->executor->setSessionStatus(AiAgentSession::STATUS_ACTIVE);

        if ($matchedButton) {
            if (isset($this->data['selectionAttribute'])) {
                $this->executor->sessionContext->updateAttributes([
                    [
                        ...$this->data['selectionAttribute'],
                        'value' => $matchedButton['name'],
                    ],
                ]);
            }

            if ($childId = $this->getDirectChildId()) {
                $this->executor->goToNode($childId);
            }
            return true;
        } else {
            $this->executor->sessionContext->setCurrentNodeId(null);
            return false;
        }
    }
}
