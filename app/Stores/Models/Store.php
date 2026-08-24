<?php

namespace App\Stores\Models;

use App\Biolinks\Models\Biolink as LegacyBiolink;
use Database\Factories\StoreFactory;

class Store extends LegacyBiolink
{
    const MODEL_TYPE = 'store';

    protected $table = 'biolinks';

    public function getTable(): string
    {
        return config('stores.table_rename_done') ? 'stores' : 'biolinks';
    }

    public function getForeignKey(): string
    {
        return 'biolink_id';
    }

    protected static function newFactory()
    {
        return StoreFactory::new();
    }

    public function toSearchableArray(): array
    {
        $array = parent::toSearchableArray();
        $array['model_type'] = 'store';
        return $array;
    }

    public static function filterableFields(): array
    {
        return parent::filterableFields();
    }

    public static function sortableFields(): array
    {
        return parent::sortableFields();
    }

    public function toNormalizedArray(): array
    {
        return parent::toNormalizedArray();
    }

    public static function getModelTypeAttribute(): string
    {
        return static::MODEL_TYPE;
    }
}
