<?php

namespace App\Courses\Models;

use Common\Files\FileEntry;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lesson extends Model
{
    protected $table = 'course_lessons';

    protected $fillable = [
        'chapter_id',
        'course_id',
        'title',
        'content',
        'video_type',
        'video_file_entry_id',
        'video_url',
        'duration_seconds',
        'status',
        'sort_order',
    ];

    protected $casts = [
        'chapter_id' => 'integer',
        'course_id' => 'integer',
        'video_file_entry_id' => 'integer',
        'duration_seconds' => 'integer',
        'sort_order' => 'integer',
    ];

    public function chapter(): BelongsTo
    {
        return $this->belongsTo(Chapter::class, 'chapter_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function videoFile(): BelongsTo
    {
        return $this->belongsTo(FileEntry::class, 'video_file_entry_id');
    }

    public function resources(): HasMany
    {
        return $this->hasMany(LessonResource::class, 'lesson_id')->orderBy('sort_order')->orderBy('id');
    }

    public function isPublished(): bool
    {
        return $this->status === 'published';
    }

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }
}
