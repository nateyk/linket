<?php

namespace Common\Blog\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class BlogCategory extends Model
{
    const MODEL_TYPE = 'blogCategory';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'views',
        'sort_id',
    ];

    protected $casts = [
        'views' => 'integer',
        'sort_id' => 'integer',
    ];

    protected static function booted(): void
    {
        // Task 2 replaces this with transliterating, collision-safe
        // generation. Kept minimal here because Task 1's tests create rows
        // without a slug.
        static::creating(function (BlogCategory $category) {
            if (empty($category->slug)) {
                $category->slug = Str::slug($category->name ?? '');
            }
        });
    }

    public function articles(): HasMany
    {
        return $this->hasMany(BlogArticle::class, 'blog_category_id');
    }
}