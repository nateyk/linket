<?php

namespace Ai\AiAgent\Tools;

use Ai\AiAgent\Models\AiAgentTool;
use Ai\AiAgent\Tools\EditorSteps\BaseStep;
use Ai\AiAgent\Variables\VariableReplacerData;
use Common\Core\BaseController;
use Common\Database\Datasource\Datasource;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class ToolsController extends BaseController
{
    public function index()
    {
        $this->authorize('update', 'aiAgent');

        $datasource = new Datasource(AiAgentTool::query(), request()->all());

        return $this->success([
            'pagination' => $datasource->paginate(),
        ]);
    }

    public function show(int $toolId)
    {
        $this->authorize('update', 'aiAgent');

        $tool = AiAgentTool::findOrFail($toolId);

        if (request('loader') === 'editor') {
            $tool = $tool->toArrayWithResponses();
        } else {
            $tool = $tool->toArray();
        }

        return $this->success([
            'tool' => $tool,
        ]);
    }

    public function store()
    {
        $this->authorize('update', 'aiAgent');

        $data = request()->validate([
            'name' => 'required|string',
            'description' => 'required|string',
            'allow_direct_use' => 'boolean',
            'config' => 'array',
            'response_schema' => 'array',
        ]);
        $data['config'] = $data['config'] ?? [];

        $tool = AiAgentTool::create($data);

        return $this->success([
            'tool' => $tool,
        ]);
    }

    public function update(int $toolId)
    {
        $this->authorize('update', 'aiAgent');

        $tool = AiAgentTool::findOrFail($toolId);

        if (request('step')) {
            $handler = BaseStep::getHandler(request('step'), $tool);
            $tool = $handler->handle();
        } else {
            $data = $this->validate(request(), [
                'active' => 'boolean',
            ]);
            $tool->update($data);
        }

        return $this->success([
            'tool' => $tool,
        ]);
    }

    public function testRequest()
    {
        $this->authorize('update', 'aiAgent');

        $config = request()->validate([
            'apiRequest.url' => 'required|string',
            'apiRequest.headers' => 'array',
            'apiRequest.method' => 'required|string',
            'apiRequest.bodyType' => 'string',
            'apiRequest.body' => 'string|nullable',
            'attributes' => 'array',
        ]);

        $data = new VariableReplacerData(attributes: $config['attributes']);
        $requestData = ToolExecutor::prepareRequestData(
            $config['apiRequest'],
            $data,
        );

        $response = Http::withHeaders($requestData['headers'])
            ->when(
                $requestData['body'],
                fn(PendingRequest $client) => $client->withBody(
                    $requestData['body'],
                    $requestData['contentType'],
                ),
            )
            ->send($requestData['method'], $requestData['url']);

        if (!$response->successful()) {
            return $this->error(
                $response->body() ?? __('Request failed with unknown error.'),
            );
        }

        if (!$response->json()) {
            return $this->error(__('Response is not valid JSON.'));
        }

        // check if response is less then 100kb
        if (strlen($response) > 100 * 1024) {
            return $this->error(__('Maximum response size is 100kb.'));
        }

        return $this->success([
            'response' => $response->json(),
        ]);
    }

    public function list()
    {
        $this->authorize('update', 'aiAgent');

        return $this->success([
            'tools' => AiAgentTool::whereActive()->limit(50)->get()->map(
                fn(AiAgentTool $tool) => [
                    'id' => $tool->id,
                    'name' => $tool->name,
                ],
            ),
        ]);
    }

    public function destroy(int $toolId)
    {
        $this->authorize('update', 'aiAgent');

        $tool = AiAgentTool::findOrFail($toolId);

        $toolResponseIds = DB::table('tool_responses')
            ->where('tool_id', $toolId)
            ->pluck('id');
        DB::table('ai_agent_session_tool_response')
            ->whereIn('tool_response_id', $toolResponseIds)
            ->delete();
        DB::table('tool_responses')
            ->whereIn('tool_id', $toolResponseIds)
            ->delete();

        $tool->delete();

        return $this->success();
    }
}
