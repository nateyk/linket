<?php

namespace App\Links\Models;

use Illuminate\Database\Eloquent\Model;

class LinkImage extends Model
{
    protected $guarded = [];

    protected $casts = [
        'id' => 'integer',
        'link_id' => 'integer',
    ];
}
