<?php

namespace Ai\AiAgent\Flows\Nodes;

use Ai\AiAgent\Models\AiAgentTool;
use Ai\AiAgent\Models\ToolResponse;
use Ai\AiAgent\Tools\ToolExecutor;
use Ai\AiAgent\Tools\UsesToolResponseData;
use Ai\AiAgent\Variables\VariableReplacerData;
use Illuminate\Support\Arr;

class UseToolNode extends BaseNode
{
    use UsesToolResponseData;

    public function execute(): bool
    {
        $toolId = $this->data['toolId'] ?? null;

        $this->executor::$debugLog[] = [
            'event' => 'UseTool::execute',
            'data' => [
                'toolId' => $toolId,
            ],
        ];

        $childNodes = $this->getDirectChildren();
        $successNode = Arr::first(
            $childNodes,
            fn($node) => $node['data']['type'] === 'success',
        );
        $failureNode = Arr::first(
            $childNodes,
            fn($node) => $node['data']['type'] === 'failure',
        );

        if ($toolId && ($tool = AiAgentTool::find($toolId))) {
            $data = new VariableReplacerData(
                conversation: $this->executor->conversation,
                user: $this->executor->user,
                session: $this->executor->sessionContext->getSession(),
            );

            $response = ToolExecutor::execute($tool, $data);

            if ($response) {
                $this->executor->sessionContext->attachToolResponse(
                    $this->id,
                    $response,
                );

                $this->setAttributes($tool, $response);

                // trigger success branch
                if (
                    $successNode &&
                    ($childId = $this->getChildId($successNode['id']))
                ) {
                    $this->executor->goToNode($childId);
                }

                return true;
            }
        }

        // trigger failure branch
        if (
            $failureNode &&
            ($childId = $this->getChildId($failureNode['id']))
        ) {
            $this->executor->goToNode($childId);
        }

        return true;
    }

    protected function setAttributes(AiAgentTool $tool, ToolResponse $response)
    {
        $attributes = [];
        foreach ($tool->response_schema['properties'] as $property) {
            $name = $property['attribute']['name'] ?? null;
            $type = $property['attribute']['type'] ?? null;
            if ($name && $type) {
                $value = $this->getPropertyValue($response, $property['path']);
                if ($value) {
                    $attributes[$name] = [
                        'name' => $name,
                        'type' => $type,
                        'value' => is_array($value)
                            ? json_encode($value)
                            : $value,
                    ];
                }
            }
        }

        if (!empty($attributes)) {
            $this->executor->sessionContext->updateAttributes(
                array_values($attributes),
            );
        }
    }
}
