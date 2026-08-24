<?php

namespace App\Biolinks\Models;

use App\Stores\Models\StoreAppearance;

/**
 * Legacy shim — canonical is App\Stores\Models\StoreAppearance
 */
class BiolinkAppearance extends StoreAppearance
{
    public function getTable(): string
    {
        return config('stores.table_rename_done') ? 'store_appearances' : 'biolink_appearances';
    }
}
