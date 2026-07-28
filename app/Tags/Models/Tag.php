<?php

namespace App\Tags\Models;

use Common\Core\BaseModel;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Laravel\Scout\Searchable;

class Tag extends BaseModel
{
    use BelongsToWorkspace, Searchable;

    const MODEL_TYPE = 'tag';

    protected $guarded = [];

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'model_type' => static::MODEL_TYPE,
        ];
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

    public static function sortableFields(): array
    {
        return ['id', 'name', 'created_at', 'updated_at'];
    }

    public static function getModelTypeAttribute(): string
    {
        return static::MODEL_TYPE;
    }
}
