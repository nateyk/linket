<?php

namespace Ai\AiAgent\Models;

use Common\Core\BaseModel;
use Laravel\Scout\Searchable;

class AiAgentSnippet extends BaseModel
{
    use Searchable;

    const MODEL_TYPE = 'aiAgentSnippet';

    protected $guarded = [];

    protected $casts = [
        'id' => 'integer',
        'scan_pending' => 'boolean',
        'used_by_ai_agent' => 'boolean',
        'scan_started_at' => 'datetime',
    ];

    public function chunks()
    {
        return $this->morphMany(AiAgentChunk::class, 'chunkable');
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'body' => strip_tags($this->body),
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
        ];
    }

    public static function filterableFields(): array
    {
        return [
            'id',
            'created_at',
            'updated_at',
            'scan_started_at',
            'scan_pending',
        ];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->title,
            'description' => null,
            'image' => null,
            'model_type' => self::MODEL_TYPE,
        ];
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
