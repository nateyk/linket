<?php

namespace App\Stores\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StoreWidget extends Model
{
    use HasFactory;

    const MODEL_TYPE = 'storeWidget';

    protected $guarded = [];
    protected $appends = ['model_type'];
    protected $casts = ['active' => 'boolean', 'position' => 'integer'];

    public function getTable(): string
    {
        return Store::isTableRenameDone() ? 'store_widgets' : 'biolink_widgets';
    }

    public function getForeignKey(): string
    {
        return 'biolink_id';
    }

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

    // Keep compatibility: biolinkWidget alias
    public static function getBiolinkWidgetTypeAttribute(): string
    {
        return 'biolinkWidget';
    }
}
