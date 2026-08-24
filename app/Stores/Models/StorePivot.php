<?php

namespace App\Stores\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class StorePivot extends Pivot
{
    protected $casts = [
        'position' => 'int',
        'leap_until' => 'datetime',
    ];

    public $incrementing = true;

    public function getTable(): string
    {
        return config('stores.table_rename_done') ? 'store_link' : 'biolink_link';
    }
}
