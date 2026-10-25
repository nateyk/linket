<?php

namespace Ai\Controllers;

use Ai\AiAgent\Models\AiAgentFlow;
use Common\Core\BaseController;

class AiAgentSettingsController extends BaseController
{
    public function index()
    {
        $this->authorize('update', 'aiAgent');

        $settings = settings('aiAgent');
        $flows = AiAgentFlow::query()
            ->select(['id', 'name'])
            ->get();

        return $this->success([
            'settings' => $settings ?? [],
            'flows' => $flows,
        ]);
    }

    public function update()
    {
        $this->authorize('update', 'aiAgent');

        $data = request()->validate([
            'aiAgent.name' => 'string|min:3',
            'aiAgent.enabled' => 'boolean',
            'aiAgent.personality' => 'string',
            'aiAgent.greetingType' => 'string',
            'aiAgent.initialFlowId' => 'integer|nullable',
            'aiAgent.basicGreeting' => 'array',
            'aiAgent.cantAssist' => 'array',
            'aiAgent.image' => 'string',
            'aiAgent.transfer' => 'array',
        ]);

        $settings = settings('aiAgent');

        foreach ($data['aiAgent'] as $key => $value) {
            $settings[$key] = $value;
        }

        settings()->save([
            'aiAgent' => $settings,
        ]);

        return $this->success();
    }
}
