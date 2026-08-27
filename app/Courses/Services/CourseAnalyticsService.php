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

        $avgLessonCompletion = 0.0;
        if ($activeLearners > 0 && $totalLessons > 0) {
            $avgLessonCompletion = (float) ($lessonCompletions / ($activeLearners * $totalLessons) * 100);
        } elseif ($totalLessons === 0 || $activeLearners === 0) {
            $avgLessonCompletion = 0.0;
        } else {
            $avgLessonCompletion = (float) ($lessonCompletions / max($activeLearners * $totalLessons, 1) * 100);
        }

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

                // Drop-off: funnel style. First lesson in global order: (active - completed)/active*100
                // Later: (prevCompleted - currCompleted)/max(prevCompleted,1)*100 . Fallback 100 - completionRate acceptable.
                $dropOffRate = 0.0;
                if ($activeLearners === 0) {
                    $dropOffRate = 0.0;
                } else {
                    $idx = $orderedLessons->search(fn ($l) => $l->id === $lesson->id);
                    if ($idx === 0) {
                        $dropOffRate = (float) (($activeLearners - $completed) / max($activeLearners, 1) * 100);
                    } else {
                        $prevLesson = $orderedLessons->get($idx - 1);
                        $prevCompleted = $prevLesson ? ($lessonCompletedMap[$prevLesson->id] ?? 0) : $activeLearners;
                        if ($prevCompleted === 0) {
                            $dropOffRate = 0.0;
                        } else {
                            $dropOffRate = (float) (($prevCompleted - $completed) / max($prevCompleted, 1) * 100);
                            // Clamp negative drop (when current > previous) to 0? Spec says funnel drop, could be negative if more completions than previous — but we keep raw; if negative, set 0 to avoid negative drop.
                            if ($dropOffRate < 0) {
                                $dropOffRate = 0.0;
                            }
                        }
                        // Fallback alternative: 100 - completionRate is acceptable with one-liner note — we use funnel above.
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

        $avgChapterCompletion = 0.0;
        if ($activeLearners > 0 && $totalChapters > 0) {
            $avgChapterCompletion = (float) ($totalChapterCompletions / ($activeLearners * $totalChapters) * 100);
        } elseif ($totalChapters === 0 || $activeLearners === 0) {
            $avgChapterCompletion = 0.0;
        } else {
            $avgChapterCompletion = (float) ($totalChapterCompletions / max($activeLearners * $totalChapters, 1) * 100);
        }

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
