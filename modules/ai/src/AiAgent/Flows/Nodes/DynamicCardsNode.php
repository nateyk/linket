<?php

namespace Ai\AiAgent\Flows\Nodes;

use Ai\AiAgent\Models\AiAgentSession;
use Illuminate\Support\Arr;

class DynamicCardsNode extends BaseDynamicNode
{
    public function execute(): bool
    {
        if (
            $this->executor->sessionContext->getStatus() ===
            AiAgentSession::STATUS_WAITING_FOR_USER_INPUT
        ) {
            $this->executor::$debugLog[] = [
                'event' => 'DynamicCardsNode::matchingToUserInput',
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
            'event' => 'DynamicCardsNode::showCards',
        ];

        $messages = $this->buildMessages();

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

    protected function buildMessages(): array
    {
        $data = $this->getDataFromToolResponse();
        $replacer = $data['variableReplacer'];
        $list = $data['list'];

        $card = $this->config['data']['card'] ?? [];
        $messageContent = $this->config['data']['message'] ?? null;
        $messages = [];

        if ($messageContent) {
            $messages[] = [
                'type' => 'message',
                'body' => $replacer->execute($messageContent),
                'data' => $this->config['data'],
                'attachments' => $this->config['data']['attachmentIds'] ?? [],
            ];
        }

        if (!empty($card) && !empty($list)) {
            $messages[] = [
                'type' => 'cards',
                'body' => [
                    'items' => collect($list)
                        ->slice(0, 6)
                        ->map(
                            fn($listItem, $index) => [
                                'image' => isset($card['image'])
                                    ? $replacer->execute($card['image'], $index)
                                    : null,
                                'title' => isset($card['title'])
                                    ? $replacer->execute($card['title'], $index)
                                    : null,
                                'description' => isset($card['description'])
                                    ? $replacer->execute(
                                        $card['description'],
                                        $index,
                                    )
                                    : null,
                                'buttons' => isset($card['buttons'])
                                    ? Arr::map(
                                        $card['buttons'] ?? [],
                                        fn(
                                            $button,
                                            $index,
                                        ) => self::prepareButtonData(
                                            $button,
                                            $replacer,
                                            $index,
                                        ),
                                    )
                                    : [],
                            ],
                        )
                        ->toArray(),
                ],
            ];
        }

        return $messages;
    }
}
