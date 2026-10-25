<?php

namespace Ai\Controllers;

use Ai\AiAgent\Ingest\Articles\IngestArticles;
use Ai\AiAgent\Models\AiAgentChunk;
use Ai\AiAgent\ResolveDefaultAiAgent;
use App\HelpCenter\Models\HcArticle;
use Common\Core\BaseController;
use Illuminate\Support\Arr;

class AiAgentArticlesController extends BaseController
{
    public function ingestArticles()
    {
        $this->authorize('update', 'aiAgent');

        $data = $this->validate(request(), [
            'all' => 'boolean',
            'articleIds' => 'array',
            'aiAgentId' => 'integer|nullable',
        ]);

        $agent = (new ResolveDefaultAiAgent())->execute(
            isset($data['aiAgentId']) ? (int) $data['aiAgentId'] : null,
        );

        $articles = HcArticle::query()
            ->where('draft', false)
            ->when(
                ! Arr::get($data, 'all'),
                fn ($query) => $query->whereIn('id', $data['articleIds'] ?? []),
            )
            ->whereDoesntHave(
                'aiAgents',
                fn ($q) => $q->where('ai_agents.id', $agent->id),
            )
            ->get(['id']);

        foreach ($articles as $article) {
            $agent->articles()->syncWithoutDetaching([$article->id]);
        }

        HcArticle::query()
            ->whereIn('id', $articles->pluck('id'))
            ->update([
                'scan_pending' => true,
                'scan_started_at' => null,
            ]);

        (new IngestArticles())->execute();

        return $this->success();
    }

    public function uningestArticles()
    {
        $this->authorize('update', 'aiAgent');

        $data = $this->validate(request(), [
            'all' => 'boolean',
            'articleIds' => 'array',
            'aiAgentId' => 'integer|nullable',
        ]);

        $agent = (new ResolveDefaultAiAgent())->execute(
            isset($data['aiAgentId']) ? (int) $data['aiAgentId'] : null,
        );

        $articleIds = HcArticle::query()
            ->when(
                ! Arr::get($data, 'all'),
                fn ($query) => $query->whereIn('id', $data['articleIds'] ?? []),
            )
            ->whereHas(
                'aiAgents',
                fn ($q) => $q->where('ai_agents.id', $agent->id),
            )
            ->pluck('id');

        AiAgentChunk::query()
            ->where('chunkable_type', HcArticle::MODEL_TYPE)
            ->whereIn('chunkable_id', $articleIds)
            ->delete();

        $agent->articles()->detach($articleIds);

        HcArticle::query()
            ->whereIn('id', $articleIds)
            ->whereDoesntHave('aiAgents')
            ->update([
                'scan_pending' => false,
                'scan_started_at' => null,
            ]);

        return $this->success();
    }
}
