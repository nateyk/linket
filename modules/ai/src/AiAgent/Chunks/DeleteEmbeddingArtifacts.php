<?php

namespace Ai\AiAgent\Chunks;

use Ai\AiAgent\Models\AiAgentChunk;
use Ai\AiAgent\Models\AiAgentVector;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DeleteEmbeddingArtifacts extends Command
{
    protected $signature = 'embeddings:deleteArtifacts';
    protected $description = 'Delete chunks and vectors that are no longer used.';

    public function handle(): int
    {
        // get IDs of chunks that are not attached to anything
        $chunkIds = AiAgentChunk::whereDoesntHave('chunkable')->pluck('id');

        // delete chunks
        AiAgentChunk::query()->whereIn('id', $chunkIds)->delete();

        // delete vectors that are not attached to any chunk and have been created over a month ago
        AiAgentVector::query()
            ->where('created_at', '<', now()->subMonth())
            ->whereDoesntHave('chunks')
            ->delete();

        // update search index
        if (!$chunkIds->isEmpty()) {
            AiAgentChunk::query()->whereIn('id', $chunkIds)->unsearchable();
        }

        $this->info('Deleted unused chunks and vectors.');

        return Command::SUCCESS;
    }
}
