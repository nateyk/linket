<?php

namespace Ai\AiAgent\Ingest\Files;

use Ai\AiAgent\Chunks\GenerateChunksForDocument;
use Ai\AiAgent\Ingest\Parsing\BasicDocumentParser;
use Ai\AiAgent\Ingest\Parsing\MarkitdownParser;
use Ai\AiAgent\Models\AiAgentDocument;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class IngestAiAgentDocumentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(protected readonly AiAgentDocument $document) {}

    public function handle(): void
    {
        $entry = $this->document->fileEntry;
        if (!$entry) {
            $this->document->markAsFailed();
            return;
        }

        try {
            $markdown =
                config('app.ai_agent_document_parser') === 'markitdown'
                    ? (new MarkitdownParser())->parseUploadedFile($entry)
                    : (new BasicDocumentParser())->parse($entry);
        } catch (Exception $e) {
        }

        if (!$markdown) {
            $this->document->markAsFailed();
            return;
        }

        $hash = AiAgentDocument::hashContent($markdown);

        // document with this content hash is already ingested
        if (AiAgentDocument::where('content_hash', $hash)->exists()) {
            $this->document->markAsFailed();
            return;
        }

        $this->document->update([
            'content_hash' => $hash,
            'markdown' => $markdown,
        ]);

        (new GenerateChunksForDocument())->execute($this->document, $markdown);

        $this->document->markAsScanned();
    }
}
