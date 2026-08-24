<?php

namespace App\Biolinks\Models;

use App\Stores\Models\StoreWidget;

/**
 * Legacy shim — canonical is App\Stores\Models\StoreWidget
 */
class BiolinkWidget extends StoreWidget
{
    const MODEL_TYPE = 'biolinkWidget';

    public function getTable(): string
    {
        return config('stores.table_rename_done') ? 'store_widgets' : 'biolink_widgets';
    }

    public static function getModelTypeAttribute(): string
    {
        return static::MODEL_TYPE;
    }
}
