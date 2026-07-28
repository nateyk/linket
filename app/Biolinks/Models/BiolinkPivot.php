<?php

namespace App\Biolinks\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class BiolinkPivot extends Pivot
{
    protected $casts = [
        'position' => 'int',
        'leap_until' => 'datetime',
    ];

    public $incrementing = true;
}
