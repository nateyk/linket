<?php

namespace Common\Help\Models;

use Common\Help\Models\Concerns\HasUniqueSlug;
use Common\Help\Scopes\SortByIdScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HelpCategory extends Model
{
    use HasUniqueSlug;

    protected $fillable = [
        'name',
        'slug',
        'views',
        'sort_id',
    ];

    protected $casts = [
        'views' => 'integer',
        'sort_id' => 'integer',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new SortByIdScope);

        static::creating(function (HelpCategory $category) {
            if (empty($category->slug)) {
                $category->slug = static::generateUniqueSlug($category->name ?? '', 'slug');
            }
        });

        static::updating(function (HelpCategory $category) {
            if ($category->isDirty('name') && !$category->isDirty('slug')) {
                $category->slug = static::generateUniqueSlug($category->name ?? '', 'slug', $category->id);
            }
        });
    }

    public function articles(): HasMany
    {
        return $this->hasMany(HelpArticle::class, 'help_category_id');
    }
}
