<?php

namespace Ai\AiAgent\Ingest\Snippets;

use Ai\AiAgent\Models\AiAgentSnippet;

class IngestSnippets
{
    public function execute(): void
    {
        AiAgentSnippet::query()
            ->where('scan_pending', true)
            // where scan not started by another process yet or started more than 10 minutes
            // ago and not finished. We can assume it failed for some reason in that case
            ->where(function ($query) {
                $query
                    ->whereNull('scan_started_at')
                    ->orWhere('scan_started_at', '<', now()->subMinutes(10));
            })
            ->chunkById(100, function ($snippets) {
                AiAgentSnippet::whereIn('id', $snippets->pluck('id'))->update([
                    'scan_started_at' => now(),
                ]);
                $snippets->each(function (AiAgentSnippet $snippet) {
                    dispatch(new IngestAiAgentSnippetJob($snippet));
                });
            });
    }
}
