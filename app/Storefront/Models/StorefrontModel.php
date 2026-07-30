<?php

namespace App\Storefront\Models;

use Common\Core\BaseModel;

abstract class StorefrontModel extends BaseModel
{
    public function toNormalizedArray(): array
    {
        return ['id' => $this->id];
    }

    public function toSearchableArray(): array
    {
        return $this->toNormalizedArray();
    }

    public static function filterableFields(): array
    {
        return ['id', 'workspace_id', 'user_id', 'creator_id', 'created_at', 'updated_at'];
    }

    public static function sortableFields(): array
    {
        return ['id', 'created_at', 'updated_at'];
    }

    public static function getModelTypeAttribute(): string
    {
        return static::class;
    }

    public function getMorphClass(): string
    {
        return static::class;
    }
}
