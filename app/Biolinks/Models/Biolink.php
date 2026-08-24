<?php

namespace App\Biolinks\Models;

use App\Stores\Models\Store;
use App\Biolinks\Factories\BiolinkFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Legacy shim — canonical model is App\Stores\Models\Store
 * Keep Biolink usable for 1 release with deprecation.
 * Table resolves to biolinks until config('stores.table_rename_done') true.
 */
class Biolink extends Store
{
    const MODEL_TYPE = 'biolink';

    public function getTable(): string
    {
        return config('stores.table_rename_done') ? 'stores' : 'biolinks';
    }

    public function getForeignKey(): string
    {
        return 'biolink_id';
    }

    public function getMorphClass()
    {
        return 'biolink';
    }

    protected static function newFactory()
    {
        return BiolinkFactory::new();
    }

    public static function getModelTypeAttribute(): string
    {
        return static::MODEL_TYPE;
    }

    // Ensure legacy relations still return legacy pivot/model types where needed
    // Override to keep Biolink* types for BC if code expects instanceof BiolinkWidget etc.
    public function widgets(): HasMany
    {
        // Return legacy widget relation for BC; underlying table still biolink_widgets
        return $this->hasMany(BiolinkWidget::class, 'biolink_id');
    }

    public function appearance(): HasOne
    {
        return $this->hasOne(BiolinkAppearance::class, 'biolink_id');
    }

    public function links(): BelongsToMany
    {
        return $this->belongsToMany(
            BiolinkLink::class,
            config('stores.table_rename_done') ? 'store_link' : 'biolink_link',
            'biolink_id',
            'link_id',
        )
            ->using(BiolinkPivot::class)
            ->withPivot(['position', 'animation', 'leap_until', 'active']);
    }

    public function toSearchableArray(): array
    {
        $array = parent::toSearchableArray();
        // Keep legacy searchable compat – but canonical is store
        // For Biolink shim, ensure model_type remains biolink for old index? Yet Store canonical is store.
        // We keep parent's store type but ensure searchable still works for scout batches 500.
        $array['model_type'] = 'store';
        return $array;
    }

    public function searchableAs(): string
    {
        $prefix = config('scout.prefix') ?? '';
        return $prefix . 'stores';
    }
}
