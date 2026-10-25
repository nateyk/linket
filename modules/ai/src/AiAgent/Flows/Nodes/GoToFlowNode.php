<?php

namespace Ai\AiAgent\Flows\Nodes;

class GoToFlowNode extends BaseNode
{
    public function execute(): bool
    {
        if ($targetFlowId = $this->data['targetFlowId']) {
            $this->executor::$debugLog[] = [
                'event' => 'GoToFlow::execute',
                'data' => [
                    'targetFlowId' => $targetFlowId,
                ],
            ];

            $firstNodeId = $this->executor->sessionContext->setActiveFlow(
                $targetFlowId,
            );

            // if there's some issue with setting new flow, make sure we don't re-execute this node
            if ($firstNodeId && $firstNodeId !== $this->config['id']) {
                $this->executor->goToNode($firstNodeId);
            }

            return true;
        }

        return false;
    }
}
