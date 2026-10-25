<?php

namespace Ai\AiAgent\Flows\Nodes;

class SetAttributeNode extends BaseNode
{
    public function execute(): bool
    {
        $this->executor::$debugLog[] = [
            'event' => 'SetAttributeNode::execute',
            'data' => [
                'attributes' => $this->data['attributes'],
            ],
        ];

        $this->executor->sessionContext->updateAttributes(
            $this->data['attributes'],
        );

        if ($childId = $this->getDirectChildId()) {
            $this->executor->goToNode($childId);
        }

        return true;
    }
}
