<?php

namespace Ai\AiAgent\Flows\Nodes;

use Ai\AiAgent\Flows\MessageBuilderData;
use Ai\AiAgent\Models\AiAgentSession;
use Ai\AiAgent\Variables\VariableReplacer;
use Illuminate\Support\Arr;

class CardsNode extends BaseNode
{
    public static $canUseAsGreetingNode = true;

    public static function buildConversationMessagesData(
        MessageBuilderData $data,
    ): array {
        $cards = $data->nodeConfig['data']['cards'] ?? [];
        $messageContent = $data->nodeConfig['data']['message'] ?? null;
        $messages = [];

        $replacer = new VariableReplacer($data->toVariableReplacerData());

        if ($messageContent) {
            $messages[] = [
                'type' => 'message',
                'body' => $replacer->execute($messageContent),
                'data' => $data->nodeConfig['data'],
                'attachments' =>
                    $data->nodeConfig['data']['attachmentIds'] ?? [],
            ];
        }

        if (!empty($cards)) {
            $messages[] = [
                'type' => 'cards',
                'body' => [
                    'items' => array_map(
                        fn($card) => [
                            ...$card,
                            'title' => $replacer->execute($card['title']),
                            'description' => $replacer->execute(
                                $card['description'],
                            ),
                            'buttons' => Arr::map(
                                $card['buttons'] ?? [],
                                fn($button, $index) => self::prepareButtonData(
                                    $button,
                                    $replacer,
                                    $index,
                                ),
                            ),
                        ],
                        $cards,
                    ),
                ],
            ];
        }

        return $messages;
    }

    public function execute(): bool
    {
        if (
            $this->executor->sessionContext->getStatus() ===
            AiAgentSession::STATUS_WAITING_FOR_USER_INPUT
        ) {
            $this->executor::$debugLog[] = [
                'event' => 'CardsNode::matchingToUserInput',
            ];

            $child = $this->getDirectChild();
            if ($child) {
                $this->executor->goToNode($child['id']);
            }
            return true;
        } else {
            return $this->showCards();
        }
    }

    protected function showCards()
    {
        $this->executor::$debugLog[] = [
            'event' => 'CardsNode::showCards',
        ];

        $messages = self::buildConversationMessagesData(
            new MessageBuilderData(
                nodeConfig: $this->config,
                allNodes: $this->executor->sessionContext->getAllNodes(),
                conversation: $this->executor->conversation,
                user: $this->executor->user,
                session: $this->executor->sessionContext->getSession(),
            ),
        );

        foreach ($messages as $messageData) {
            $this->createConversationMessage($messageData);
        }

        $child = $this->getDirectChild();

        if ($child) {
            if ($child['type'] === NodeType::Branches->value) {
                $this->executor->waitForUserInput();
            } else {
                $this->executor->goToNode($child['id']);
            }
        }

        return true;
    }
}
