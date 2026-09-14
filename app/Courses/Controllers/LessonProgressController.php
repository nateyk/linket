<?php

namespace App\Courses\Controllers;

use App\Courses\Models\Lesson;
use App\Courses\Services\ProgressService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class LessonProgressController extends Controller
{
    public function complete(Request $request, Lesson $lesson)
    {
        $user = $request->user('sanctum') ?? $request->user('web') ?? $request->user() ?? \Illuminate\Support\Facades\Auth::user();
        abort_unless($user, 401);
        $access = app(\App\Courses\CourseAccess::class);
        abort_unless($access->canAccessLesson($user, $lesson, false), 403, 'Locked.');
        abort_unless(app(ProgressService::class)->hasPassedRequiredQuiz($user->id, $lesson), 422, 'Pass the quiz before completing this lesson.');

        $progress = app(ProgressService::class)->complete($user->id, $lesson);

        $course = $lesson->course;
        $percent = app(ProgressService::class)->progressPercent($course, $user->id);

        return response()->json(['data' => ['lesson_id' => $lesson->id, 'completed_at' => $progress->completed_at, 'percent' => $percent]]);
    }

    public function uncomplete(Request $request, Lesson $lesson)
    {
        $user = $request->user('sanctum') ?? $request->user('web') ?? $request->user() ?? \Illuminate\Support\Facades\Auth::user();
        abort_unless($user, 401);
        // Allow uncomplete even if locked? Just require enrollment.
        $access = app(\App\Courses\CourseAccess::class);
        abort_unless($access->canAccessCourse($user, $lesson->course), 403);

        app(ProgressService::class)->uncomplete($user->id, $lesson);
        $percent = app(ProgressService::class)->progressPercent($lesson->course, $user->id);
        return response()->json(['data' => ['lesson_id' => $lesson->id, 'percent' => $percent]]);
    }

    public function progress(Request $request, \App\Courses\Models\Course $course)
    {
        $user = $request->user('sanctum') ?? $request->user('web') ?? $request->user() ?? \Illuminate\Support\Facades\Auth::user();
        abort_unless($user, 401);
        $access = app(\App\Courses\CourseAccess::class);
        abort_unless($access->canAccessCourse($user, $course), 403);
        $service = app(ProgressService::class);
        return response()->json([
            'data' => [
                'total' => $service->totalPublished($course),
                'completed' => $service->completedCount($course, $user->id),
                'percent' => $service->progressPercent($course, $user->id),
                'completed_ids' => $service->completedLessonIds($user->id, $course),
            ],
        ]);
    }
}
