<?php

namespace Ai\AiAgent\Chunks;

use Ai\AiAgent\Models\AiAgentVector;
use Common\AI\Llm;
use Illuminate\Support\Collection;

class GenerateEmbeddingsForAiAgentChunks
{
    public function execute(Collection $chunkData): Collection
    {
        $hashes = $chunkData
            ->unique('content_hash')
            ->chunk(80)
            ->map(function (Collection $chunkData) {
                $newChunks = $this->findChunksWithoutVector($chunkData);

                if (!$newChunks->isEmpty()) {
                    $this->generateAndInsertVectors($newChunks);
                }

                return $chunkData->pluck('content_hash');
            })
            ->flatten(1);

        return AiAgentVector::whereIn('content_hash', $hashes)->pluck(
            'id',
            'content_hash',
        );
    }

    protected function findChunksWithoutVector(
        Collection $chunkData,
    ): Collection {
        // fetch vectors that were already generated for content hash
        $existingVectors = AiAgentVector::whereIn(
            'content_hash',
            $chunkData->pluck('content_hash'),
        )->pluck('id', 'content_hash');

        // only leave chunks that need a vector generated
        return $chunkData
            ->filter(
                fn(array $chunk) => !isset(
                    $existingVectors[$chunk['content_hash']],
                ),
            )
            ->values();
    }

    protected function generateAndInsertVectors(Collection $chunkData): void
    {
        $existingVectors = AiAgentVector::whereIn(
            'content_hash',
            $chunkData->pluck('content_hash'),
        )->pluck('id', 'content_hash');

        $chunksWithoutVector = $chunkData
            ->unique('content_hash')
            ->filter(
                fn(array $chunk) => !$existingVectors->contains(
                    $chunk['content_hash'],
                ),
            );

        $response = Llm::resolveEmbeddingProvider()->generateEmbeddings(
            $chunksWithoutVector->pluck('content'),
        );

        AiAgentVector::insert(
            $response->embeddings
                ->map(
                    fn($vector, $index) => [
                        'content_hash' =>
                            $chunksWithoutVector[$index]['content_hash'],
                        'vector' => json_encode($vector),
                        'vector_tokens_used' =>
                            $response->usage->totalTokens /
                            $chunksWithoutVector->count(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                )
                ->toArray(),
        );
    }
}
