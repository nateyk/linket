<?php

namespace Ai\AiAgent\Tools;

use Ai\AiAgent\Models\AiAgentTool;
use Ai\AiAgent\Variables\VariableReplacerData;
use App\Conversations\Models\Conversation;
use Common\AI\Tools\BaseTool;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Arr;

class ToolBoundToConversation extends BaseTool
{
    public function __construct(
        protected AiAgentTool $tool,
        protected Conversation $conversation,
    ) {
        $this->name = $tool->name;
        $this->description = $tool->description;

        if ($tool->config['apiRequest']['collectedData']) {
            $this->params = [];

            foreach ($tool->config['apiRequest']['collectedData'] as $item) {
                $name = strtolower(str_replace(' ', '_', $item['name']));
                $this->params[$name] = [
                    'type' => $item['format'],
                    'description' => $item['description'],
                    'required' => $item['required'],
                ];
            }
        }
    }

    public function execute(?array $params = null): string
    {
        $collectedData = isset($params)
            ? Arr::map(
                $params,
                fn($key, $value) => [
                    'name' => $key,
                    'type' => 'collectedData',
                    'value' => $value,
                ],
            )
            : [];

        try {
            return ToolExecutor::execute(
                $this->tool,
                VariableReplacerData::fromConversation(
                    $this->conversation,
                    $collectedData,
                ),
                throw: true,
            )?->response ?? '';
        } catch (RequestException $e) {
            return json_encode([
                'status' => 'error',
                'code' => $e->getCode(),
                'error' => $e->getMessage() ?? 'tool call failed',
            ]);
        }
    }
}
