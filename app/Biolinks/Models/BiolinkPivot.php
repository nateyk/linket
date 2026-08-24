<?php

namespace App\Biolinks\Models;

use App\Stores\Models\StorePivot;

/**
 * Legacy shim — canonical is App\Stores\Models\StorePivot
 */
class BiolinkPivot extends StorePivot
{
    public function getTable(): string
    {
        return config('stores.table_rename_done') ? 'store_link' : 'biolink_link';
    }
}
