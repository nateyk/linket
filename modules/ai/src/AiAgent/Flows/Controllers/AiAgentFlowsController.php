<?php

namespace Ai\AiAgent\Flows\Controllers;

use Ai\AiAgent\Models\AiAgentFlow;
use Common\Core\BaseController;
use Common\Database\Datasource\Datasource;

class AiAgentFlowsController extends BaseController
{
    public function index()
    {
        $this->authorize('update', 'aiAgent');

        $datasource = new Datasource(
            AiAgentFlow::query()->select([
                'id',
                'name',
                'intent',
                'activation_count',
                'updated_at',
                'created_at',
            ]),
            request()->all(),
        );

        return $this->success([
            'pagination' => $datasource->paginate(),
        ]);
    }

    public function show(int $flowId)
    {
        $this->authorize('update', 'aiAgent');

        $flow = AiAgentFlow::findOrFail($flowId);

        return $this->success([
            'flow' => $flow,
        ]);
    }

    public function store()
    {
        $this->authorize('update', 'aiAgent');

        $data = request()->validate([
            'name' => 'required|string',
            'intent' => 'string',
        ]);

        $flow = AiAgentFlow::create([
            'name' => $data['name'],
            'intent' => $data['intent'] ?? null,
            'config' => [],
        ]);

        return $this->success([
            'flow' => $flow,
        ]);
    }

    public function update(int $flowId)
    {
        $this->authorize('update', 'aiAgent');

        $data = request()->validate([
            'name' => 'string',
            'intent' => 'string|nullable',
            'config' => 'array',
        ]);

        $flow = AiAgentFlow::findOrFail($flowId);

        $flow->update($data);

        return $this->success([
            'flow' => $flow,
        ]);
    }

    public function destroy(string $ids)
    {
        $this->authorize('update', 'aiAgent');

        $ids = explode(',', $ids);

        AiAgentFlow::whereIn('id', $ids)->delete();

        return $this->success();
    }

    public function list()
    {
        $this->authorize('update', 'aiAgent');

        return $this->success([
            'flows' => AiAgentFlow::limit(50)->get()->map(
                fn(AiAgentFlow $flow) => [
                    'id' => $flow->id,
                    'name' => $flow->name,
                ],
            ),
        ]);
    }
}
