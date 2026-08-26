<?php

namespace App\Courses\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Chapter extends Model
{
    protected $table = 'course_chapters';

    protected $fillable = ['course_id', 'title', 'sort_order'];

    protected $casts = ['course_id' => 'integer', 'sort_order' => 'integer'];

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(Lesson::class, 'chapter_id')->orderBy('sort_order')->orderBy('id');
    }

    public function publishedLessons(): HasMany
    {
        return $this->lessons()->where('status', 'published');
    }
}
