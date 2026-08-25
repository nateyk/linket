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
        return \App\Stores\Models\Store::appearanceTable();
    }
}
