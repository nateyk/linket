<?php

namespace App\Courses\Controllers;

use App\Courses\Models\Course;
use App\Courses\Models\Lesson;
use App\Courses\Resources\CourseResource;
use App\Courses\Resources\LessonResource;
use App\Courses\Services\ProgressService;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class StudentCoursesController extends Controller
{
    // For enrolled student: full curriculum with progress
    public function show(Request $request, Course $course)
    {
        $user = $request->user('sanctum') ?? $request->user('web') ?? $request->user() ?? \Illuminate\Support\Facades\Auth::user();
        abort_unless($user, 401);

        $access = app(\App\Courses\CourseAccess::class);
        // Must be enrolled or preview owner
        $isPreview = $request->boolean('preview');
        if ($isPreview) {
            abort_unless($access->canPreviewCourse($user, $course), 403);
            $course->load(['product.cover', 'chapters.lessons.resources.file', 'chapters.lessons.videoFile']);
            return new CourseResource($course);
        }

        abort_unless($access->canAccessCourse($user, $course), 403, 'You are not enrolled in this course.');

        // Published lessons only for students
        $course->load([
            'product.cover',
            'chapters' => fn($q) => $q->orderBy('sort_order'),
            'chapters.lessons' => function ($q) {
                $q->where('status', 'published')->orderBy('sort_order')->with(['resources.file', 'videoFile']);
            },
        ]);

        // Attach progress
        $progress = app(ProgressService::class);
        $completedIds = $progress->completedLessonIds($user->id, $course);
        $total = $progress->totalPublished($course);
        $completedCount = count(array_intersect($completedIds, $course->chapters->flatMap->lessons->pluck('id')->all()));
        $percent = $progress->progressPercent($course, $user->id);

        $resource = new CourseResource($course);
        $data = $resource->toArray($request);
        $data['progress'] = [
            'total' => $total,
            'completed' => $completedCount,
            'percent' => $percent,
            'completed_lesson_ids' => $completedIds,
        ];

        return response()->json(['data' => $data]);
    }

    public function curriculum(Request $request, Course $course)
    {
        // Public published curriculum without bodies — for product page
        abort_unless($course->published_at !== null && $course->product->status === 'approved', 404);
        $course->load([
            'chapters' => fn($q) => $q->orderBy('sort_order'),
            'chapters.lessons' => fn($q) => $q->where('status', 'published')->orderBy('sort_order')->select(['id','chapter_id','course_id','title','status','sort_order','duration_seconds']),
        ]);

        return new CourseResource($course);
    }

    public function lesson(Request $request, Course $course, Lesson $lesson)
    {
        $user = $request->user('sanctum') ?? $request->user('web') ?? $request->user() ?? \Illuminate\Support\Facades\Auth::user();
        abort_unless($user, 401);
        // Ensure hierarchy
        abort_unless((int) $lesson->course_id === (int) $course->id, 404);
        $isPreview = $request->boolean('preview');
        $access = app(\App\Courses\CourseAccess::class);

        if ($isPreview) {
            abort_unless($access->canPreviewCourse($user, $course), 403);
            $lesson->load(['resources.file', 'videoFile', 'chapter']);
            return new LessonResource($lesson);
        }

        // Enrolled + sequential gate
        abort_unless($access->canAccessLesson($user, $lesson, false), 403, 'This lesson is locked. Complete prior lessons first.');

        $lesson->load(['resources.file', 'videoFile', 'chapter']);

        // For video upload, provide signed temporary URL if needed (private disk)
        // The LessonResource will expose file url via FileEntry->url (private returns api path requiring auth).
        // For better streaming we could generate temporary signed route, but FileEntry->url already handles private via api/v1/file-entries/{id}.
        return new LessonResource($lesson);
    }

    public function myCourses(Request $request)
    {
        $user = $request->user('sanctum') ?? $request->user('web') ?? $request->user() ?? \Illuminate\Support\Facades\Auth::user() ?? \Illuminate\Support\Facades\Auth::guard('web')->user();
        abort_unless($user, 401);

        $enrollments = \App\Courses\Models\Enrollment::where('user_id', $user->id)->where('status', 'active')->with(['course.product.cover', 'course.chapters'])->get();

        $progressService = app(ProgressService::class);

        $data = $enrollments->map(function ($enrollment) use ($progressService, $user) {
            $course = $enrollment->course;
            $product = $course->product;
            $total = $progressService->totalPublished($course);
            $percent = $progressService->progressPercent($course, $user->id);
            $next = $progressService->nextIncompleteLesson($course, $user->id);
            return [
                'enrollment_id' => $enrollment->id,
                'course_id' => $course->id,
                'product_id' => $product->id,
                'title' => $product->title,
                'cover' => $product->cover ? ['url' => $product->cover->url] : null,
                'total_lessons' => $total,
                'percent' => $percent,
                'completed' => $progressService->completedCount($course, $user->id),
                'next_lesson_id' => $next?->id,
                'enrolled_at' => $enrollment->enrolled_at,
            ];
        });

        return response()->json(['data' => $data]);
    }
}
