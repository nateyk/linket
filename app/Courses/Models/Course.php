<?php

namespace App\Courses\Models;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Course extends Model
{
    protected $fillable = [
        'digital_product_id',
        'require_sequential_completion',
        'instructor_user_id',
        'published_at',
    ];

    protected $casts = [
        'require_sequential_completion' => 'boolean',
        'published_at' => 'datetime',
        'digital_product_id' => 'integer',
        'instructor_user_id' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(DigitalProduct::class, 'digital_product_id');
    }

    public function digitalProduct(): BelongsTo
    {
        return $this->product();
    }

    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_user_id');
    }

    public function chapters(): HasMany
    {
        return $this->hasMany(Chapter::class)->orderBy('sort_order')->orderBy('id');
    }

    public function lessons(): HasManyThrough
    {
        return $this->hasManyThrough(Lesson::class, Chapter::class, 'course_id', 'chapter_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function isPublished(): bool
    {
        return $this->published_at !== null;
    }

    public function scopePublished($query)
    {
        return $query->whereNotNull('published_at');
    }
}
