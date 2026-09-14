<?php

namespace App\Courses\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuizQuestion extends Model
{
    protected $fillable = [
        'quiz_id',
        'type',
        'question_text',
        'options',
        'correct_answer',
        'sort_order',
    ];

    protected $casts = [
        'quiz_id' => 'integer',
        'sort_order' => 'integer',
        'options' => 'array',
    ];

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }
}
