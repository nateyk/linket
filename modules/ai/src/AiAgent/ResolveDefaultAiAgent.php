<?php

namespace Ai\AiAgent;

use Ai\AiAgent\Models\AiAgent;

class ResolveDefaultAiAgent
{
    public function execute(?int $aiAgentId = null): AiAgent
    {
        if ($aiAgentId) {
            return AiAgent::query()->findOrFail($aiAgentId);
        }

        $agent = AiAgent::query()
            ->where('enabled', true)
            ->orderBy('id')
            ->first();

        if ($agent) {
            return $agent;
        }

        return AiAgent::query()->create([
            'name' => 'Default',
            'enabled' => true,
        ]);
    }
}
