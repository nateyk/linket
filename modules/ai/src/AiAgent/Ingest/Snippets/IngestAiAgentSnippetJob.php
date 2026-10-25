<?php

namespace Ai\AiAgent\Ingest\Snippets;

use Ai\AiAgent\Chunks\GenerateChunksForDocument;
use Ai\AiAgent\Ingest\Parsing\HtmlToMarkdown;
use Ai\AiAgent\Models\AiAgentSnippet;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class IngestAiAgentSnippetJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(protected readonly AiAgentSnippet $snippet) {}

    public function handle(): void
    {
        if (
            $this->snippet->scan_pending &&
            strlen($this->snippet->body) > 100
        ) {
            $markdown = (new HtmlToMarkdown())->execute($this->snippet->body);
            (new GenerateChunksForDocument())->execute(
                $this->snippet,
                $markdown,
            );
        }

        $this->snippet->update([
            'scan_pending' => false,
            'scan_started_at' => null,
        ]);
    }

    public function uniqueId(): string
    {
        return $this->snippet->id;
    }
}
