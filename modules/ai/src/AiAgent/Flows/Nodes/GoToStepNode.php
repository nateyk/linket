<?php

namespace Ai\AiAgent\Flows\Nodes;

class GoToStepNode extends BaseNode
{
    public function execute(): bool
    {
        $targetNodeId = $this->data['targetNodeId'];

        $allNodes = collect(
            $this->executor->sessionContext->getAllNodes(),
        )->keyBy('id');

        $targetNode = $targetNodeId ? $allNodes->get($targetNodeId) : null;

        if ($targetNode) {
            $this->executor::$debugLog[] = [
                'event' => 'GoToStep::execute',
                'data' => [
                    'targetNodeId' => $targetNodeId,
                    'targetNode' => $targetNode,
                ],
            ];

            // if it's a buttons or branches item, go directly to child of that item this
            // will be the same if user clicked on button or branch item condition matches
            if (
                $targetNode['type'] === 'branchesItem' ||
                $targetNode['type'] === 'buttonsItem'
            ) {
                $childNode = $allNodes->first(
                    fn($node) => $node['parentId'] === $targetNode['id'],
                );

                $this->executor->goToNode($childNode['id']);
            } else {
                $this->executor->goToNode($targetNodeId);
            }

            return true;
        }

        return false;
    }
}
