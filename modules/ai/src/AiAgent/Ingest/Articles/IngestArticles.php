<?php

namespace Ai\AiAgent\Ingest\Articles;

use App\HelpCenter\Models\HcArticle;

class IngestArticles
{
    public function execute(): void
    {
        HcArticle::where('draft', false)
            ->where('scan_pending', true)
            // where scan not started by another process yet or started more than 10 minutes
            // ago and not finished. We can assume it failed for some reason in that case
            ->where(function ($query) {
                $query
                    ->whereNull('scan_started_at')
                    ->orWhere('scan_started_at', '<', now()->subMinutes(10));
            })
            ->chunkById(100, function ($articles) {
                HcArticle::whereIn('id', $articles->pluck('id'))->update([
                    'scan_started_at' => now(),
                ]);
                $articles->each(function (HcArticle $article) {
                    dispatch(new IngestHcArticleJob($article));
                });
            });
    }
}
