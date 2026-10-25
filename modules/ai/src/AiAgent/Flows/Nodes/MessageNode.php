<?php

namespace Ai\AiAgent\Flows\Nodes;

use Ai\AiAgent\Flows\MessageBuilderData;
use Ai\AiAgent\Variables\VariableReplacer;

class MessageNode extends BaseNode
{
    public static $canUseAsGreetingNode = true;

    public static function buildConversationMessagesData(
        MessageBuilderData $data,
    ): array {
        $messageText = $data->nodeConfig['data']['message'] ?? '';

        if (!$messageText) {
            return [];
        }

        $replacer = new VariableReplacer($data->toVariableReplacerData());

        return [
            [
                'type' => 'message',
                'attachments' => $data->nodeConfig['data']['attachmentIds'],
                'body' => $replacer->execute($messageText),
                'data' => [
                    'buttons' => array_map(
                        fn($button) => [
                            ...$button,
                            'name' => $replacer->execute($button['name']),
                            'actionValue' => $replacer->execute(
                                $button['actionValue'],
                            ),
                        ],
                        $data->nodeConfig['data']['buttons'] ?? [],
                    ),
                ],
            ],
        ];
    }

    public function execute(): bool
    {
        $messages = self::buildConversationMessagesData(
            new MessageBuilderData(
                nodeConfig: $this->config,
                allNodes: $this->executor->sessionContext->getAllNodes(),
                user: $this->executor->user,
                conversation: $this->executor->conversation,
                session: $this->executor->sessionContext->getSession(),
            ),
        );

        foreach ($messages as $messageData) {
            $this->createConversationMessage($messageData);
        }

        $childId = $this->getDirectChildId();

        if ($childId) {
            $this->executor->goToNode($childId);
        }

        return true;
    }
}
