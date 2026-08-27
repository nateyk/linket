<?php

namespace App\Courses\Services;

use App\Courses\Models\Course;
use App\Courses\Models\LessonProgress;

class CourseAnalyticsService
{
    /**
     * @return array{activeLearners:int,totalLessons:int,totalChapters:int,lessonCompletions:int,avgLessonCompletion:float,avgChapterCompletion:float,chapters:array}
     */
    public function forCourse(Course $course): array
    {
        // Active learners = enrollments where status='active' (revoked excluded everywhere)
        $activeUserIds = $course->enrollments()->where('status', 'active')->pluck('user_id')->all();
        $activeLearners = count($activeUserIds);

        $totalLessons = $course->lessons()->count();
        $totalChapters = $course->chapters()->count();

        // Fetch chapters with ordered lessons
        $chapters = $course->chapters()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->with(['lessons' => fn ($q) => $q->orderBy('sort_order')->orderBy('id')])
            ->get();

        // Flatten lessons in global course order (chapter order -> lesson order)
        $orderedLessons = $chapters->flatMap(fn ($ch) => $ch->lessons)->values();
        $lessonIndexById = $orderedLessons->pluck('id')->flip()->all();

        // Lesson progress filtered to active learners (revoked excluded)
        $progressRows = collect();
        $lessonCompletedMap = [];
        $userLessonMap = [];

        if ($activeLearners > 0) {
            $progressRows = LessonProgress::where('course_id', $course->id)
                ->whereIn('user_id', $activeUserIds)
                ->get();

            // Map lesson_id => completed count
            $lessonCompletedMap = $progressRows->groupBy('lesson_id')->map->count()->all();

            // Map user_id => set of lesson_ids completed
            foreach ($activeUserIds as $uid) {
                $userLessonMap[$uid] = $progressRows->where('user_id', $uid)->pluck('lesson_id')->all();
            }
        }

        // Ensure every lesson has entry in map (0 if none)
        foreach ($orderedLessons as $lesson) {
            if (!isset($lessonCompletedMap[$lesson->id])) {
                $lessonCompletedMap[$lesson->id] = 0;
            }
        }

        $lessonCompletions = $progressRows->count();

        $avgLessonCompletion = $activeLearners > 0 && $totalLessons > 0
            ? (float) ($lessonCompletions / ($activeLearners * $totalLessons) * 100)
            : 0.0;

        // Per chapter computations
        $chaptersResult = [];
        $totalChapterCompletions = 0;

        foreach ($chapters as $chapter) {
            $lessonIds = $chapter->lessons->pluck('id')->all();
            $lessonsCount = count($lessonIds);

            $completedLearners = 0;
            if ($activeLearners > 0 && $lessonsCount > 0) {
                foreach ($activeUserIds as $uid) {
                    $userLessons = $userLessonMap[$uid] ?? [];
                    // chapter complete when ALL its lessons have progress entries
                    $hasAll = true;
                    foreach ($lessonIds as $lid) {
                        if (!in_array($lid, $userLessons, true)) {
                            $hasAll = false;
                            break;
                        }
                    }
                    if ($hasAll) {
                        $completedLearners++;
                    }
                }
            } elseif ($lessonsCount === 0) {
                $completedLearners = 0;
            }

            $totalChapterCompletions += $completedLearners;

            $completionRate = $activeLearners > 0 ? (float) ($completedLearners / $activeLearners * 100) : 0.0;

            // Build lessons array for this chapter with per-lesson rates and dropOff
            $lessonsResult = [];
            foreach ($chapter->lessons as $lesson) {
                $completed = $lessonCompletedMap[$lesson->id] ?? 0;
                $completionRateLesson = $activeLearners > 0 ? (float) ($completed / $activeLearners * 100) : 0.0;

                $dropOffRate = 0.0;
                if ($activeLearners > 0) {
                    $idx = $lessonIndexById[$lesson->id];
                    if ($idx === 0) {
                        $dropOffRate = (float) max(0, ($activeLearners - $completed) / $activeLearners * 100);
                    } else {
                        $prevLesson = $orderedLessons->get($idx - 1);
                        $prevCompleted = $lessonCompletedMap[$prevLesson->id] ?? 0;
                        $dropOffRate = $prevCompleted > 0
                            ? (float) max(0, ($prevCompleted - $completed) / $prevCompleted * 100)
                            : 0.0;
                    }
                }

                $lessonsResult[] = [
                    'id' => (int) $lesson->id,
                    'title' => (string) $lesson->title,
                    'completedLearners' => (int) $completed,
                    'completionRate' => (float) $completionRateLesson,
                    'dropOffRate' => (float) $dropOffRate,
                ];
            }

            $chaptersResult[] = [
                'id' => (int) $chapter->id,
                'title' => (string) $chapter->title,
                'lessonsCount' => (int) $lessonsCount,
                'completedLearners' => (int) $completedLearners,
                'completionRate' => (float) $completionRate,
                'lessons' => $lessonsResult,
            ];
        }

        $avgChapterCompletion = $activeLearners > 0 && $totalChapters > 0
            ? (float) ($totalChapterCompletions / ($activeLearners * $totalChapters) * 100)
            : 0.0;

        // Zero-state (active 0) -> every rate 0.0 and every count 0 already handled via above branches.
        // Ensure all rates are floats
        return [
            'activeLearners' => (int) $activeLearners,
            'totalLessons' => (int) $totalLessons,
            'totalChapters' => (int) $totalChapters,
            'lessonCompletions' => (int) $lessonCompletions,
            'avgLessonCompletion' => (float) $avgLessonCompletion,
            'avgChapterCompletion' => (float) $avgChapterCompletion,
            'chapters' => $chaptersResult,
        ];
    }
}
