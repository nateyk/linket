<?php

namespace Common\Blog\Models;

use Common\Blog\Models\Concerns\GeneratesBlogSlugs;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BlogCategory extends Model
{
    use GeneratesBlogSlugs;

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
        // creating only — renaming a category must not change its URL.
        static::creating(function (BlogCategory $category) {
            if (empty($category->slug)) {
                $category->slug = static::generateUniqueBlogSlug(
                    $category->name ?? '',
                    'slug',
                );
            }
        });
    }

    public function articles(): HasMany
    {
        return $this->hasMany(BlogArticle::class, 'blog_category_id');
    }
}