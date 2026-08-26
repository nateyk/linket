<?php

namespace App\Courses\Models;

use Common\Files\FileEntry;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LessonResource extends Model
{
    protected $table = 'course_lesson_resources';

    protected $fillable = ['lesson_id', 'file_entry_id', 'display_name', 'size', 'mime', 'sort_order'];

    protected $casts = ['lesson_id' => 'integer', 'file_entry_id' => 'integer', 'size' => 'integer', 'sort_order' => 'integer'];

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class, 'lesson_id');
    }

    public function file(): BelongsTo
    {
        return $this->belongsTo(FileEntry::class, 'file_entry_id');
    }

    public function fileEntry(): BelongsTo
    {
        return $this->file();
    }
}
