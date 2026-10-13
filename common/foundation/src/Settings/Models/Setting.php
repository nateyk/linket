<?php

namespace Common\Settings\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    use TransformsSettingsTableRowValue;

    const MODEL_TYPE = 'setting';

    protected $table = 'settings';

    protected $fillable = ['name', 'value'];

    protected $casts = ['private' => 'bool'];

    protected static function booted(): void
    {
        // The settings manager serves every setting from the "settings.public"
        // cache blob. Any write through the model (seeders, installers, ad hoc
        // code) must invalidate that blob too, otherwise the new setting never
        // reaches the client until the cache expires.
        static::saved(fn() => Cache::forget('settings.public'));
        static::deleted(fn() => Cache::forget('settings.public'));
    }

    protected function value(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                return $this->decodeDbValue($this->attributes['name'], $value);
            },
            set: function ($value) {
                return $this->encodeValueForDb(
                    $this->attributes['name'],
                    $value,
                );
            },
        );
    }
}
