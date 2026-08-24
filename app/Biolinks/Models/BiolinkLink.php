<?php

namespace App\Biolinks\Models;

use App\Stores\Models\StoreLink;

/**
 * Legacy shim — canonical is App\Stores\Models\StoreLink
 */
class BiolinkLink extends StoreLink
{
    const MODEL_TYPE = 'biolinkLink';

    public static function getModelTypeAttribute(): string
    {
        return static::MODEL_TYPE;
    }

    public function getTable(): string
    {
        return 'links';
    }
}
