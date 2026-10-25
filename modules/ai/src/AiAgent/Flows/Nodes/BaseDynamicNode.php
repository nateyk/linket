<?php

namespace Ai\AiAgent\Flows\Nodes;

use Ai\AiAgent\Models\AiAgentTool;
use Ai\AiAgent\Tools\UsesToolResponseData;
use Ai\AiAgent\Variables\VariableReplacer;
use Ai\AiAgent\Variables\VariableReplacerData;
use Illuminate\Support\Arr;

abstract class BaseDynamicNode extends BaseNode
{
    use UsesToolResponseData;

    protected function getDataFromToolResponse(): array
    {
        $toolResponse =
            $this->executor->sessionContext
                ->getToolResponse(
                    $this->config['data']['toolId'],
                    $this->getAncestorIds(),
                )
                ?->getAsJson() ?? [];
        $tool = AiAgentTool::find($this->config['data']['toolId']);

        $data = new VariableReplacerData(
            conversation: $this->executor->conversation,
            user: $this->executor->user,
            session: $this->executor->sessionContext->getSession(),
            tool: $tool,
            toolResponse: $toolResponse,
        );

        $replacer = new VariableReplacer($data);

        $listPath = $this->getRealListPath($this->config['data']['listPath']);
        $list = !$listPath ? $toolResponse : Arr::get($toolResponse, $listPath);

        return [
            'list' => $list,
            'variableReplacer' => $replacer,
        ];
    }
}
