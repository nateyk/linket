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
        return \App\Stores\Models\Store::pivotTable();
    }
}
