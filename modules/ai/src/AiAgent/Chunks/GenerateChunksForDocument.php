<?php

namespace Ai\AiAgent\Chunks;

use Ai\AiAgent\Ingest\Parsing\MarkdownTextSplitter;
use Ai\AiAgent\Models\AiAgentChunk;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;

class GenerateChunksForDocument
{
    const PARENT_CHUNK_SIZE = 2000;
    const PARENT_CHUNK_OVERLAP = 100;
    const PARENT_CHUNK_MIN_SIZE = 400;

    const CHILD_CHUNK_SIZE = 400;

    public function execute(Model $document, string $markdown): void
    {
        $document->chunks()->delete();

        if (!$markdown) {
            return;
        }

        $chunksData = $this->generateChunkData($markdown, $document);

        // smaller chunks that have vectors attached
        $vectorizableChunks = $chunksData['vectorizableChunks'];

        // larger chunks from which smaller chunks were generated
        $parentChunks = $chunksData['parentChunks'];

        $vectors = (new GenerateEmbeddingsForAiAgentChunks())->execute(
            $vectorizableChunks,
        );

        // insert larger chunks so we can get their ids
        AiAgentChunk::insert($parentChunks->toArray());
        $parentChunks = $document
            ->chunks()
            ->whereIn('content_hash', $parentChunks->pluck('content_hash'))
            ->pluck((new AiAgentChunk())->qualifyColumn('id'), 'content_hash');

        // insert smaller chunks and attach vector and parent to them
        $childChunkData = $vectorizableChunks->map(
            fn($chunk) => [
                ...Arr::except($chunk, 'parent_chunk_hash'),
                'parent_chunk_id' => isset($chunk['parent_chunk_hash'])
                    ? $parentChunks[$chunk['parent_chunk_hash']]
                    : null,
                'vector_id' => $vectors[$chunk['content_hash']],
            ],
        );
        AiAgentChunk::insert($childChunkData->toArray());

        // update search index with newly added chunks
        $document->chunks()->searchable();
    }

    protected function generateChunkData(
        string $markdown,
        Model $document,
    ): array {
        $parentChunks = collect();
        $vectorizableChunks = collect();

        $largeChunks = collect(
            (new MarkdownTextSplitter(
                chunkSize: self::PARENT_CHUNK_SIZE,
                chunkOverlap: self::PARENT_CHUNK_OVERLAP,
                minChunkSize: self::PARENT_CHUNK_MIN_SIZE,
            ))->split($markdown),
        )->map(fn($chunk) => $this->createDataArray($document, $chunk));

        $childSplitter = new MarkdownTextSplitter(
            chunkSize: self::CHILD_CHUNK_SIZE,
        );

        foreach ($largeChunks as $largeChunk) {
            if (strlen($largeChunk['content']) <= self::CHILD_CHUNK_SIZE) {
                $vectorizableChunks->push($largeChunk);
            } else {
                $childChunks = array_map(
                    fn($chunk) => $this->createDataArray(
                        $document,
                        $chunk,
                        $largeChunk['content_hash'],
                    ),
                    $childSplitter->split($largeChunk['content']),
                );
                $vectorizableChunks = $vectorizableChunks->merge($childChunks);

                $parentChunks->push($largeChunk);
            }
        }

        return [
            'parentChunks' => $parentChunks,
            'vectorizableChunks' => $vectorizableChunks,
        ];
    }

    protected function createDataArray(
        Model $document,
        string $content,
        string|null $parentChunkHash = null,
    ): array {
        $data = [
            'content' => $content,
            'content_hash' => AiAgentChunk::hashContent($content),
            'created_at' => now(),
            'updated_at' => now(),
            'chunkable_id' => $document->id,
            'chunkable_type' => $document->getMorphClass(),
        ];

        if ($parentChunkHash) {
            $data['parent_chunk_hash'] = $parentChunkHash;
        }

        return $data;
    }
}
