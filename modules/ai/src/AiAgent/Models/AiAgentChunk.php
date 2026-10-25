<?php

namespace Ai\AiAgent\Models;

use App\HelpCenter\Models\HcArticle;
use Common\Core\BaseModel;
use Common\Search\SupportsVectorSearch;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Laravel\Scout\Searchable;

class AiAgentChunk extends BaseModel
{
    use Searchable, SupportsVectorSearch {
        searchUsingVector as protected _searchUsingVector;
    }

    const MODEL_TYPE = 'aiAgentChunk';

    protected $guarded = ['id'];

    protected static function booted(): void
    {
        parent::booted();

        static::creating(function (self $chunk) {
            if (!$chunk->hash) {
                $chunk->hash = static::hashContent($chunk->content);
            }
        });
    }

    public function chunkable(): MorphTo
    {
        return $this->morphTo()->constrain([
            AiAgentWebpage::class => fn($q) => $q->select([
                'id',
                'url',
                'title',
            ]),
            AiAgentDocument::class => fn($q) => $q->select([
                'id',
                'file_entry_id',
            ]),
            HcArticle::class => fn($q) => $q->select(['id', 'title', 'slug']),
            AiAgentSnippet::class => fn($q) => $q->select(['id', 'title']),
        ]);
    }

    public static function searchUsingVector(
        array $vector,
        int $limit = 5,
        array|null $categoryIds = [],
    ) {
        $rawResults = static::_searchUsingVector(
            $vector,
            $limit,
            distinctAttribute: 'parent_chunk_id',
            categoryIds: $categoryIds,
        );

        $chunkIds = $rawResults->map(
            fn($chunk) => $chunk['parent_chunk_id'] ?? $chunk['id'],
        );

        $chunks = static::whereIn('id', $chunkIds)->with('chunkable')->get();

        return $chunks
            ->map(
                fn($chunk) => [
                    'id' => $chunk->id,
                    'content' => $chunk->content,
                    'score' => $rawResults->first(
                        fn($c) => $c['id'] === $chunk->id ||
                            $c['parent_chunk_id'] === $chunk->id,
                    )['score'],
                    'parent_chunk_id' => $chunk->parent_chunk_id,
                    'chunkable' =>
                        $chunk->chunkable &&
                        method_exists($chunk->chunkable, 'toChunkableArray')
                            ? $chunk->chunkable->toChunkableArray()
                            : null,
                ],
            )
            ->sortByDesc('score')
            ->values();
    }

    public function scopeSelectWithoutContent(Builder $query): Builder
    {
        return $query->select([
            'id',
            'hash',
            'parent_id',
            'temp_id',
            'created_at',
            'updated_at',
        ]);
    }

    public static function hashContent(string $content): string
    {
        return hash('xxh3', $content);
    }

    public static function filterableFields(): array
    {
        return [
            'id',
            'hash',
            'parent_chunk_id',
            // for filtering chunks by article category id
            'category_ids',
            'chunkable_id',
            'chunkable_type',
            'created_at',
            'updated_at',
        ];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->hash,
            'description' => null,
            'image' => null,
            'model_type' => self::MODEL_TYPE,
        ];
    }

    public function shouldBeSearchable(): bool
    {
        return !is_null($this->vector_id);
    }

    public function makeSearchableUsing(
        \Illuminate\Database\Eloquent\Collection $models,
    ) {
        return $models->load([
            'vector',
            'chunkable' => function (MorphTo $morphTo) {
                $morphTo->morphWith([
                    HcArticle::class => ['categories'],
                ]);
            },
        ]);
    }

    public function makeAllSearchableUsing($query)
    {
        return $query->with([
            'vector',
            'chunkable' => function (MorphTo $morphTo) {
                $morphTo->morphWith([
                    HcArticle::class => ['categories'],
                ]);
            },
        ]);
    }

    public function toSearchableArray(): array
    {
        $categoryIds = [];

        if (
            $this->chunkable_type === HcArticle::MODEL_TYPE &&
            $this->chunkable
        ) {
            $categoryIds = $this->chunkable->categories->pluck('id')->toArray();
        }

        return [
            'id' => $this->id,
            'hash' => $this->hash,
            '_vectors' => [
                self::MODEL_TYPE => $this->vector_id
                    ? json_decode($this->vector->vector)
                    : null,
            ],
            'chunkable_id' => $this->chunkable_id,
            'chunkable_type' => $this->chunkable_type,
            'parent_chunk_id' => $this->parent_chunk_id,
            'category_ids' => $categoryIds,
            'content' => $this->content,
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
        ];
    }

    public function getVectorDimensions(): int
    {
        return 1536;
    }

    public static function getModelTypeAttribute(): string
    {
        return self::MODEL_TYPE;
    }

    public static function sortableFields(): array
    {
        return [];
    }
}
