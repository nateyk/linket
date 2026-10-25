<?php

namespace Ai\AiAgent\Chunks;

use Ai\AiAgent\Models\AiAgentChunk;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class InsertMultipleChunks
{
    public static function execute(array $chunks, Model $document): Collection
    {
        $tempId = Str::ulid();

        $allExistingChunks = collect();

        collect($chunks)
            ->chunk(100)
            ->each(function (Collection $chunkGroup) use (
                $tempId,
                $document,
                &$allExistingChunks,
            ) {
                // prepare values to be inserted
                $values = $chunkGroup
                    ->map(
                        fn(array $chunk) => [
                            'content' => $chunk['content'],
                            'parent_chunk_id' => $chunk['parent_chunk_id'],
                            'hash' => AiAgentChunk::hashContent(
                                $chunk['content'],
                            ),
                            'chunkable_id' => $document->id,
                            'chunkable_type' => $document->getMorphClass(),
                            'temp_id' => $tempId,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ],
                    )
                    ->unique('hash');

                // fetch chunks that already exist for a given content hash
                $existingChunks = AiAgentChunk::whereIn(
                    'hash',
                    $values->pluck('hash')->toArray(),
                )->get();

                // add existing chunks to $chunkIds so they are attached to document
                $allExistingChunks = $allExistingChunks->merge($existingChunks);

                // filter out existing chunks from the values to be inserted
                $existingChunkHashes = $existingChunks->pluck('hash');
                $values = $values->filter(
                    fn($value) => !$existingChunkHashes->contains(
                        $value['hash'],
                    ),
                );

                AiAgentChunk::insert($values->toArray());
            });

        $newChunks = AiAgentChunk::where('temp_id', $tempId)->get();
        return $allExistingChunks->merge($newChunks);
    }
}
