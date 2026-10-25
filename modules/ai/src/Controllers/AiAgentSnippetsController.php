<?php

namespace Ai\Controllers;

use Ai\AiAgent\Ingest\Snippets\IngestSnippets;
use Ai\AiAgent\Models\AiAgentChunk;
use Ai\AiAgent\Models\AiAgentSnippet;
use Common\Core\BaseController;
use Common\Database\Datasource\Datasource;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class AiAgentSnippetsController extends BaseController
{
    public function index()
    {
        $this->authorize('update', 'aiAgent');

        $datasource = new Datasource(
            AiAgentSnippet::select([
                'id',
                'title',
                'used_by_ai_agent',
                'scan_pending',
                'created_at',
            ]),
            request()->all(),
        );

        return $this->success([
            'pagination' => $datasource->paginate(),
        ]);
    }

    public function show(int $snippetId)
    {
        $this->authorize('update', 'aiAgent');

        $snippet = AiAgentSnippet::findOrFail($snippetId);

        return $this->success([
            'snippet' => $snippet,
        ]);
    }

    public function store()
    {
        $this->authorize('update', 'aiAgent');

        $data = $this->validate(request(), [
            'title' => 'required|string|min:3',
            'body' => 'required|string|min:100',
        ]);

        $snippet = AiAgentSnippet::create(
            array_merge($data, [
                'used_by_ai_agent' => true,
                'scan_pending' => true,
            ]),
        );

        return $this->success([
            'snippet' => $snippet,
        ]);
    }

    public function update(int $snippetId)
    {
        $this->authorize('update', 'aiAgent');

        $snippet = AiAgentSnippet::findOrFail($snippetId);

        $data = $this->validate(request(), [
            'title' => 'required|string|min:3',
            'body' => 'required|string|min:100',
        ]);

        if ($data['body'] !== $snippet->body && $snippet->used_by_ai_agent) {
            $data['scan_pending'] = true;
        }

        $snippet = $snippet->update($data);

        return $this->success([
            'snippet' => $snippet,
        ]);
    }

    public function destroy(string $snippetIds)
    {
        $this->authorize('update', 'aiAgent');

        DB::transaction(function () use ($snippetIds) {
            $snippetIds = explode(',', $snippetIds);

            DB::table('ai_agent_snippets')
                ->whereIn('id', $snippetIds)
                ->delete();

            DB::table('ai_agent_chunks')
                ->where('chunkable_type', AiAgentSnippet::MODEL_TYPE)
                ->whereIn('chunkable_id', $snippetIds)
                ->delete();
        });

        return $this->success();
    }

    public function ingest()
    {
        $this->authorize('update', 'aiAgent');

        $data = $this->validate(request(), [
            'all' => 'boolean',
            'snippetIds' => 'array',
        ]);

        AiAgentSnippet::query()
            ->when(
                !Arr::get($data, 'all'),
                fn($query) => $query->whereIn('id', $data['snippetIds']),
            )
            ->where('used_by_ai_agent', false)
            ->update([
                'used_by_ai_agent' => true,
                'scan_pending' => true,
                'scan_started_at' => null,
            ]);

        (new IngestSnippets())->execute();

        return $this->success();
    }

    public function uningest()
    {
        $this->authorize('update', 'aiAgent');

        $data = $this->validate(request(), [
            'all' => 'boolean',
            'snippetIds' => 'array',
        ]);

        AiAgentChunk::query()
            ->where('chunkable_type', AiAgentSnippet::MODEL_TYPE)
            ->when(
                !Arr::get($data, 'all'),
                fn($query) => $query->whereIn(
                    'chunkable_id',
                    $data['snippetIds'],
                ),
            )
            ->delete();

        AiAgentSnippet::query()
            ->when(
                !Arr::get($data, 'all'),
                fn($query) => $query->whereIn('id', $data['snippetIds']),
            )
            ->update([
                'used_by_ai_agent' => false,
                'scan_pending' => false,
                'scan_started_at' => null,
            ]);

        return $this->success();
    }
}
