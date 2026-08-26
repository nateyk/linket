<?php

namespace App\Courses\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LessonProgress extends Model
{
    protected $table = 'course_lesson_progress';

    protected $fillable = ['user_id', 'course_id', 'lesson_id', 'completed_at'];

    protected $casts = [
        'user_id' => 'integer',
        'course_id' => 'integer',
        'lesson_id' => 'integer',
        'completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class, 'lesson_id');
    }
}
