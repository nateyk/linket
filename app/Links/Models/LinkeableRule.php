<?php

namespace App\Links\Models;

use Illuminate\Database\Eloquent\Model;

class LinkeableRule extends Model
{
    protected $guarded = [];

    protected $casts = [
        'linkeable_id' => 'integer',
    ];

    protected $hidden = [
        'linkeable_id',
        'linkeable_type',
        'id',
        'created_at',
        'updated_at',
    ];
}
