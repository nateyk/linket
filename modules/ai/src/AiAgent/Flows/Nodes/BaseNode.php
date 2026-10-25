<?php

namespace Ai\AiAgent\Flows\Nodes;

use Ai\AiAgent\Conversations\Streaming\EventEmitter;
use Ai\AiAgent\Flows\AiAgentFlowExecutor;
use Ai\AiAgent\Variables\VariableReplacer;
use App\Conversations\Events\ConversationMessageCreated;
use App\Conversations\Messages\CreateConversationMessage;
use App\Conversations\Models\ConversationItem;
use Illuminate\Support\Arr;

abstract class BaseNode
{
    protected array $data;
    protected string $id;

    public static $canUseAsGreetingNode = false;
    public static $waitsForUserInput = false;

    public function __construct(
        protected array $config,
        protected AiAgentFlowExecutor $executor,
    ) {
        $this->data = $config['data'] ?? [];
        $this->id = $config['id'];
    }

    protected function getDirectChildId(): string|null
    {
        return $this->getChildId($this->id);
    }

    protected function getDirectChild()
    {
        return $this->getChild($this->id);
    }

    protected function getDirectChildren()
    {
        return Arr::where(
            $this->executor->sessionContext->getAllNodes(),
            fn($node) => $node['parentId'] === $this->id,
        );
    }

    protected function getChildId(string $id): string|null
    {
        $child = $this->getChild($id);
        return $child ? $child['id'] : null;
    }

    protected function getChild(string $id): array|null
    {
        return Arr::first(
            $this->executor->sessionContext->getAllNodes(),
            fn($node) => $node['parentId'] === $id,
        );
    }

    protected function getAncestorIds(): array
    {
        $ancestorIds = [];
        $currentId = $this->id;
        $allNodes = $this->executor->sessionContext->getAllNodes();

        while ($currentId) {
            $node = Arr::first(
                $allNodes,
                fn($node) => $node['id'] === $currentId,
            );

            if (!$node || $node['parentId'] === 'start') {
                break;
            }

            $ancestorIds[] = $node['parentId'];
            $currentId = $node['parentId'];
        }

        return $ancestorIds;
    }

    protected function createConversationMessage(
        array $messageData,
    ): ConversationItem {
        $message = (new CreateConversationMessage())->execute(
            $this->executor->conversation,
            [
                'body' => $messageData['body'],
                'author' => 'bot',
                'type' => $messageData['type'],
                'data' => $messageData['data'] ?? null,
                'attachments' => $messageData['attachments'] ?? null,
            ],
        );

        event(
            new ConversationMessageCreated(
                $this->executor->conversation,
                $message,
            ),
        );

        EventEmitter::messageCreated($message);

        return $message;
    }

    protected static function prepareButtonData(
        array $button,
        VariableReplacer $replacer,
        int|null $index = null,
    ) {
        $data = [
            'name' => $replacer->execute($button['name'], $index),
        ];

        if (isset($button['attributes'])) {
            $data['attributes'] = array_map(
                fn($item) => [
                    ...$item,
                    'value' => $replacer->execute($item['value'], $index),
                ],
                $button['attributes'],
            );
        }

        if (isset($button['actionType']) && isset($button['actionValue'])) {
            $data['actionType'] = $button['actionType'];
            $data['actionValue'] = is_array($button['actionValue'])
                ? array_map(
                    fn($item) => [
                        ...$item,
                        'value' => $replacer->execute($item['value'], $index),
                    ],
                    $button['actionValue'],
                )
                : $replacer->execute($button['actionValue'], $index);
        }

        return $data;
    }

    abstract public function execute(): bool;
}
