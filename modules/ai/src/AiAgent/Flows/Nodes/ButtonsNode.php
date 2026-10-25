<?php

namespace Ai\AiAgent\Flows\Nodes;

use Ai\AiAgent\Flows\MessageBuilderData;
use Ai\AiAgent\Variables\VariableReplacer;
use Ai\AiAgent\Models\AiAgentSession;
use Illuminate\Support\Arr;

class ButtonsNode extends BaseNode
{
    public static $canUseAsGreetingNode = true;
    public static $waitsForUserInput = true;

    public static function buildConversationMessagesData(
        MessageBuilderData $data,
    ): array {
        $allNodes = $data->allNodes;
        $messageText = $data->nodeConfig['data']['message'] ?? '';
        $buttons = collect($allNodes)
            ->filter(fn($node) => $node['parentId'] === $data->nodeConfig['id'])
            ->map(
                fn($buttonNode) => [
                    'id' => $buttonNode['id'],
                    'name' => $buttonNode['data']['name'],
                ],
            )
            ->values()
            ->toArray();

        $replacer = new VariableReplacer($data->toVariableReplacerData());

        return [
            [
                'type' => 'message',
                'body' => $replacer->execute($messageText),
                'attachments' => $data->nodeConfig['data']['attachmentIds'],
                'data' => [
                    'preventTyping' =>
                        $data->nodeConfig['data']['preventTyping'] ?? false,
                    'buttons' => array_map(
                        fn($button) => [
                            ...$button,
                            'name' => $replacer->execute($button['name']),
                        ],
                        $buttons,
                    ),
                ],
            ],
        ];
    }

    public function execute(): bool
    {
        if (
            $this->executor->sessionContext->getStatus() ===
            AiAgentSession::STATUS_WAITING_FOR_USER_INPUT
        ) {
            return $this->matchUserMessageToButtons();
        } else {
            return $this->showButtons();
        }
    }

    protected function showButtons()
    {
        $messagesData = self::buildConversationMessagesData(
            new MessageBuilderData(
                nodeConfig: $this->config,
                allNodes: $this->executor->sessionContext->getAllNodes(),
                conversation: $this->executor->conversation,
                user: $this->executor->user,
                session: $this->executor->sessionContext->getSession(),
            ),
        );

        $this->executor::$debugLog[] = [
            'event' => 'ButtonsNode::showButtons',
            'data' => $messagesData,
        ];

        foreach ($messagesData as $messageData) {
            $this->createConversationMessage($messageData);
        }

        $this->executor->waitForUserInput();

        return true;
    }

    protected function matchUserMessageToButtons()
    {
        $this->executor::$debugLog[] = [
            'event' => 'ButtonsNode::matchUserMessageToButtons',
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
            $nextNodeId = $this->getChildId($matchedButton['id']);
            $this->executor->goToNode($nextNodeId);
            return true;
        } else {
            $this->executor->sessionContext->setCurrentNodeId(null);
            return false;
        }
    }
}
