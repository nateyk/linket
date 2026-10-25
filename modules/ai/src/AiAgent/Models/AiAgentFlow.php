<?php

namespace Ai\AiAgent\Models;

use Common\Core\BaseModel;
use Common\Files\FileEntry;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Laravel\Scout\Searchable;

class AiAgentFlow extends BaseModel
{
    use Searchable;

    const MODEL_TYPE = 'aiAgentFlow';

    protected $guarded = ['id'];

    protected $casts = [
        'config' => 'array',
    ];

    public function files(): BelongsToMany
    {
        return $this->morphToMany(
            FileEntry::class,
            'model',
            'file_entry_models',
        )->orderBy('created_at', 'desc');
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
        ];
    }

    public static function filterableFields(): array
    {
        return ['id', 'created_at', 'updated_at'];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
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
