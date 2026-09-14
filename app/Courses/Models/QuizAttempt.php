<?php

namespace App\Courses\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuizAttempt extends Model
{
    protected $fillable = [
        'quiz_id',
        'user_id',
        'score',
        'passed',
        'answers',
    ];

    protected $casts = [
        'quiz_id' => 'integer',
        'user_id' => 'integer',
        'score' => 'integer',
        'passed' => 'boolean',
        'answers' => 'array',
    ];

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
