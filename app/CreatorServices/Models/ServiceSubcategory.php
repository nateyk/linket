<?php

namespace App\CreatorServices\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceSubcategory extends Model
{
    protected $fillable = [
        'service_category_id',
        'name',
        'slug',
        'description',
        'featured',
        'add_to_menu',
        'status',
        'position',
    ];

    protected $casts = [
        'service_category_id' => 'integer',
        'featured' => 'boolean',
        'add_to_menu' => 'boolean',
        'position' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(ServiceCategory::class, 'service_category_id');
    }

    public function services(): HasMany
    {
        return $this->hasMany(CreatorService::class);
    }
}
