<?php

namespace Ai\AiAgent\Tools\EditorSteps;

use Ai\AiAgent\Models\AiAgentTool;

class GeneralStep extends BaseStep
{
    public function handle(): array
    {
        $data = $this->validateStep([
            'name' => 'required|string|max:100',
            'description' => 'required|string|max:2000',
            'allow_direct_use' => 'boolean',
        ]);

        $this->tool->update($data);

        return $this->tool->toArrayWithResponses();
    }
}
