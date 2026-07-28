<?php

namespace App\Biolinks\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BiolinkAppearance extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function getConfigAttribute($value)
    {
        return json_decode($value, true) ?: [];
    }

    public function setConfigAttribute($value)
    {
        if (is_string($value)) {
            return;
        }
        $this->attributes['config'] = json_encode($value);
    }
}
