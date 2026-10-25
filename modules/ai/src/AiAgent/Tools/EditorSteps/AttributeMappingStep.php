<?php

namespace Ai\AiAgent\Tools\EditorSteps;

use Ai\AiAgent\Models\AiAgentTool;

class AttributeMappingStep extends BaseStep
{
    public function handle(): array
    {
        $data = $this->validateStep([
            'responseSchema' => 'required|array',
        ]);

        $this->tool->update([
            'response_schema' => $data['responseSchema'],
        ]);

        return $this->tool->toArrayWithResponses();
    }
}
