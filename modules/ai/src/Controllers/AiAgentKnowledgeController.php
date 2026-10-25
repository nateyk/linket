<?php

namespace Ai\Controllers;

use Ai\AiAgent\Models\AiAgentDocument;
use Ai\AiAgent\Models\AiAgentSnippet;
use Ai\AiAgent\Models\AiAgentWebsite;
use App\HelpCenter\Models\HcArticle;
use Common\Core\BaseController;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;

class AiAgentKnowledgeController extends BaseController
{
    public function index()
    {
        $this->authorize('update', 'aiAgent');

        $websites = AiAgentWebsite::query()->get([
            'id',
            'url',
            'scan_pending',
            'updated_at',
        ]);

        $documents = AiAgentDocument::with([
            'fileEntry' => fn(BelongsTo $q) => $q->select([
                'id',
                'name',
                'mime',
                'type',
            ]),
        ])->get([
            'id',
            'file_entry_id',
            'scan_pending',
            'scan_failed',
            'updated_at',
        ]);

        $articles = HcArticle::query()
            ->whereHas('aiAgents')
            ->get(['id', 'title', 'scan_pending', 'updated_at']);

        $snippets = AiAgentSnippet::query()
            ->where('used_by_ai_agent', true)
            ->get(['id', 'title', 'scan_pending', 'updated_at']);

        $websites = $this->prepareResponse($websites);
        $documents = $this->prepareResponse($documents);
        $articles = $this->prepareResponse($articles);
        $snippets = $this->prepareResponse($snippets);

        $ingesting =
            $websites['ingesting'] ||
            $documents['ingesting'] ||
            $articles['ingesting'] ||
            $snippets['ingesting'];

        return $this->success([
            'websites' => $websites,
            'documents' => $documents,
            'articles' => $articles,
            'snippets' => $snippets,
            'ingesting' => $ingesting,
        ]);
    }

    protected function prepareResponse(Collection $items): array
    {
        $visibleItems = $items->take(3);
        $otherItems = $items->slice(3);

        return [
            'items' => $visibleItems,
            'ingesting' => $items->some(fn($i) => $i->scan_pending),
            'more' => [
                'count' => $otherItems->count(),
                'ingesting' => $otherItems->some(fn($i) => $i->scan_pending),
            ],
        ];
    }
}
