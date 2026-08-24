<?php

namespace App\Stores\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StoreAppearance extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function getTable(): string
    {
        return config('stores.table_rename_done') ? 'store_appearances' : 'biolink_appearances';
    }

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
