<?php

namespace App\CreatorServices\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceCategory extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'featured',
        'add_to_menu',
        'status',
        'position',
    ];

    protected $casts = [
        'featured' => 'boolean',
        'add_to_menu' => 'boolean',
        'position' => 'integer',
    ];

    public function subcategories(): HasMany
    {
        return $this->hasMany(ServiceSubcategory::class)->orderBy('position')->orderBy('name');
    }

    public function services(): HasMany
    {
        return $this->hasMany(CreatorService::class);
    }
}
