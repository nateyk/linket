<?php

namespace App\Biolinks\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BiolinkWidget extends Model
{
    use HasFactory;

    const MODEL_TYPE = 'biolinkWidget';

    protected $guarded = [];
    protected $appends = ['model_type'];
    protected $casts = ['active' => 'boolean', 'position' => 'integer'];

    protected function config(): Attribute
    {
        return Attribute::make(
            get: fn($value) => json_decode($value, true) ?: [],
            set: fn($value) => is_string($value) ? $value : json_encode($value),
        );
    }

    public static function getModelTypeAttribute(): string
    {
        return self::MODEL_TYPE;
    }
}
