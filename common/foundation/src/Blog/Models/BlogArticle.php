<?php

namespace Common\Blog\Models;

use App\Models\User;
use Common\Blog\Actions\SanitizeBlogHtml;
use Common\Blog\Models\Concerns\GeneratesBlogSlugs;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Laravel\Scout\Searchable;

class BlogArticle extends Model
{
    use GeneratesBlogSlugs;
    use Searchable;

    const MODEL_TYPE = 'blogArticle';

    protected $fillable = [
        'blog_category_id',
        'author_id',
        'title',
        'slug',
        'excerpt',
        'body',
        'cover_image',
        'meta_title',
        'meta_description',
        'status',
        'published_at',
        'views',
    ];

    protected $casts = [
        'blog_category_id' => 'integer',
        'author_id' => 'integer',
        'published_at' => 'datetime',
        'reading_time_minutes' => 'integer',
        'views' => 'integer',
    ];

    protected static function booted(): void
    {
        // creating only — retitling an article must never change its URL, or
        // every ranking and inbound link for that post is lost.
        static::creating(function (BlogArticle $article) {
            if (empty($article->slug)) {
                $article->slug = static::generateUniqueBlogSlug(
                    $article->title ?? '',
                    'slug',
                );
            }
        });

        // Sanitise on write so stored, indexed, and prerendered content is
        // all the same safe copy. Derived columns are recomputed here so
        // they can never drift from the body they describe.
        static::saving(function (BlogArticle $article) {
            if (!$article->isDirty('body')) {
                return;
            }

            $safe = app(SanitizeBlogHtml::class)->execute($article->body);
            // Block tags become spaces first: strip_tags deletes them
            // outright, which would fuse words across block boundaries
            // ("</h2><p>" would yield "HiThere").
            $text = trim(
                preg_replace(
                    '/\s+/',
                    ' ',
                    strip_tags(str_replace(['</p>', '</h1>', '</h2>', '</h3>', '</h4>', '</li>', '</blockquote>'], ' ', $safe)),
                ),
            );

            $article->body = $safe;
            $article->body_text = $text;
            $article->reading_time_minutes = max(
                1,
                (int) ceil(str_word_count($text) / 200),
            );
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(BlogCategory::class, 'blog_category_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /**
     * Publicly visible articles. An article with a future published_at is
     * scheduled, not live, so it is excluded until its time arrives.
     */
    public function scopePublished(Builder $builder): Builder
    {
        return $builder
            ->where('status', 'published')
            ->where('published_at', '<=', now());
    }

    /**
     * `body` is deliberately excluded — indexing raw markup pollutes
     * relevance. body_text holds the same prose without tags.
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'excerpt' => $this->excerpt,
            'body_text' => $this->body_text,
        ];
    }
}