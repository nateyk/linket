<?php

namespace App\Courses\Services;

use App\Courses\Models\Course;
use App\Courses\Models\Lesson;
use App\Courses\Models\LessonProgress;
use Illuminate\Support\Facades\DB;

class ProgressService
{
    /**
     * Mark lesson complete — idempotent.
     */
    public function complete(int $userId, Lesson $lesson): LessonProgress
    {
        abort_unless($lesson->isPublished(), 422, 'Only published lessons can be completed.');

        return DB::transaction(function () use ($userId, $lesson): LessonProgress {
            $progress = LessonProgress::where('user_id', $userId)->where('lesson_id', $lesson->id)->lockForUpdate()->first();
            if ($progress) {
                return $progress;
            }

            $progress = LessonProgress::create([
                'user_id' => $userId,
                'course_id' => $lesson->course_id,
                'lesson_id' => $lesson->id,
                'completed_at' => now(),
            ]);

            // Check course completion
            $this->maybeMarkEnrollmentCompleted($userId, $lesson->course_id);

            return $progress;
        });
    }

    public function uncomplete(int $userId, Lesson $lesson): void
    {
        LessonProgress::where('user_id', $userId)->where('lesson_id', $lesson->id)->delete();
    }

    public function completedLessonIds(int $userId, Course $course): array
    {
        return LessonProgress::where('user_id', $userId)->where('course_id', $course->id)->pluck('lesson_id')->all();
    }

    public function progressPercent(Course $course, int $userId): int
    {
        $total = Lesson::where('course_id', $course->id)->where('status', 'published')->count();
        if ($total === 0) return 0;
        $completed = LessonProgress::where('user_id', $userId)
            ->where('course_id', $course->id)
            ->whereIn('lesson_id', Lesson::where('course_id', $course->id)->where('status', 'published')->pluck('id'))
            ->count();
        return (int) round($completed / $total * 100);
    }

    public function completedCount(Course $course, int $userId): int
    {
        return LessonProgress::where('user_id', $userId)
            ->where('course_id', $course->id)
            ->whereIn('lesson_id', Lesson::where('course_id', $course->id)->where('status', 'published')->pluck('id'))
            ->count();
    }

    public function totalPublished(Course $course): int
    {
        return Lesson::where('course_id', $course->id)->where('status', 'published')->count();
    }

    public function nextIncompleteLesson(Course $course, int $userId): ?Lesson
    {
        $completed = $this->completedLessonIds($userId, $course);
        return Lesson::where('course_lessons.course_id', $course->id)
            ->where('course_lessons.status', 'published')
            ->whereNotIn('course_lessons.id', $completed ?: [-1])
            ->join('course_chapters', 'course_chapters.id', '=', 'course_lessons.chapter_id')
            ->orderBy('course_chapters.sort_order')
            ->orderBy('course_lessons.sort_order')
            ->select('course_lessons.*')
            ->first();
    }

    public function orderedPublishedLessons(Course $course)
    {
        return Lesson::where('course_lessons.course_id', $course->id)
            ->where('course_lessons.status', 'published')
            ->join('course_chapters', 'course_chapters.id', '=', 'course_lessons.chapter_id')
            ->orderBy('course_chapters.sort_order')
            ->orderBy('course_lessons.sort_order')
            ->select('course_lessons.*')
            ->get();
    }

    private function maybeMarkEnrollmentCompleted(int $userId, int $courseId): void
    {
        $course = Course::find($courseId);
        if (!$course) return;
        $total = $this->totalPublished($course);
        if ($total === 0) return;
        $completed = $this->completedCount($course, $userId);
        if ($completed >= $total) {
            \App\Courses\Models\Enrollment::where('user_id', $userId)->where('course_id', $courseId)->whereNull('completed_at')->update(['completed_at' => now()]);
        }
    }

    /**
     * Quiz gate: true if lesson has no quiz, quiz does not require pass,
     * user has a passing attempt, or prior completion is grandfathered
     * (completed before quiz was created).
     */
    public function hasPassedRequiredQuiz(int $userId, Lesson $lesson): bool
    {
        $quiz = $lesson->relationLoaded('quiz') ? $lesson->quiz : \App\Courses\Models\Quiz::where('lesson_id', $lesson->id)->first();
        if (!$quiz || !$quiz->require_pass_to_progress) {
            return true;
        }

        $hasPassingAttempt = \App\Courses\Models\QuizAttempt::where('quiz_id', $quiz->id)
            ->where('user_id', $userId)
            ->where('passed', true)
            ->exists();
        if ($hasPassingAttempt) {
            return true;
        }

        // Grandfathered: completed before quiz existed
        $progress = LessonProgress::where('user_id', $userId)->where('lesson_id', $lesson->id)->first();
        if ($progress && $progress->completed_at && $quiz->created_at && $progress->completed_at->lt($quiz->created_at)) {
            return true;
        }

        return false;
    }
}
