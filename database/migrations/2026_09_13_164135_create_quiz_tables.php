<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('quizzes')) {
            Schema::create('quizzes', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('lesson_id')->unique()->constrained('course_lessons')->cascadeOnDelete();
                $table->boolean('require_pass_to_progress')->default(false);
                $table->unsignedTinyInteger('passing_score')->default(70);
                $table->timestamps();
                $table->index('lesson_id');
            });
        }

        if (!Schema::hasTable('quiz_questions')) {
            Schema::create('quiz_questions', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('quiz_id')->constrained('quizzes')->cascadeOnDelete();
                $table->string('type', 20)->comment('multiple_choice|true_false');
                $table->text('question_text');
                $table->json('options')->nullable()->comment('["A","B","C"] for MC, null for TF');
                $table->string('correct_answer', 500)->comment('index or true/false string');
                $table->integer('sort_order')->default(0);
                $table->timestamps();
                $table->index(['quiz_id', 'sort_order']);
            });
        }

        if (!Schema::hasTable('quiz_attempts')) {
            Schema::create('quiz_attempts', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('quiz_id')->constrained('quizzes')->cascadeOnDelete();
                $table->unsignedInteger('user_id');
                $table->unsignedTinyInteger('score')->comment('0-100');
                $table->boolean('passed');
                $table->json('answers')->nullable()->comment('{question_id: answer}');
                $table->timestamps();
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->index(['quiz_id', 'user_id']);
                $table->index(['user_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('quiz_attempts');
        Schema::dropIfExists('quiz_questions');
        Schema::dropIfExists('quizzes');
    }
};
