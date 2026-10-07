<?php

namespace Common\Help\Models;

use Common\Help\Models\Concerns\HasUniqueSlug;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Laravel\Scout\Searchable;

class HelpArticle extends Model
{
    use HasUniqueSlug;
    use Searchable;

    protected $fillable = [
        'title',
        'slug',
        'body',
        'short_description',
        'views',
        'likes',
        'dislikes',
        'help_category_id',
    ];

    protected $casts = [
        'views' => 'integer',
        'likes' => 'integer',
        'dislikes' => 'integer',
        'help_category_id' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (HelpArticle $article) {
            if (empty($article->slug)) {
                $article->slug = static::generateUniqueSlug($article->title ?? '', 'slug');
            }
        });

        static::updating(function (HelpArticle $article) {
            if ($article->isDirty('title') && !$article->isDirty('slug')) {
                $article->slug = static::generateUniqueSlug($article->title ?? '', 'slug', $article->id);
            }
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(HelpCategory::class, 'help_category_id');
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'short_description' => $this->short_description,
            'body' => $this->body,
        ];
    }
}
