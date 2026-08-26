<?php

namespace App\Courses;

use App\Courses\Models\Course;
use App\Courses\Models\Lesson;
use App\Courses\Services\EnrollmentService;
use App\Courses\Services\ProgressService;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class CourseAccess
{
    public function canManageCourse(User $user, Course $course): bool
    {
        $product = $course->product;
        return $product && $product->user_id === $user->id && $product->workspace_id === $this->activeWorkspaceId();
    }

    public function canPreviewCourse(User $user, Course $course): bool
    {
        return $this->canManageCourse($user, $course) || $user->hasPermission('admin.access');
    }

    /**
     * Student can access lesson if: enrolled OR creator preview.
     * Sequential gating is enforced via canAccessLesson.
     */
    public function canAccessCourse(User $user, Course $course): bool
    {
        if ($this->canPreviewCourse($user, $course)) return true;

        return app(EnrollmentService::class)->isEnrolled($course, $user->id);
    }

    public function canAccessLesson(User $user, Lesson $lesson, bool $isPreview = false): bool
    {
        if ($isPreview) {
            $course = $lesson->course;
            if ($this->canPreviewCourse($user, $course)) return true;
        }

        if ($lesson->isDraft()) {
            // Draft only via preview
            return false;
        }

        $course = $lesson->course;
        if (!$course->isPublished() && !$this->canPreviewCourse($user, $course)) {
            return false;
        }

        $enrolled = app(EnrollmentService::class)->isEnrolled($course, $user->id);
        if (!$enrolled && !$this->canPreviewCourse($user, $course)) {
            return false;
        }

        if (!$course->require_sequential_completion) {
            return true;
        }

        // Sequential: must have completed all prior published lessons in order.
        return $this->isLessonUnlocked($user->id, $course, $lesson);
    }

    public function isLessonUnlocked(int $userId, Course $course, Lesson $target): bool
    {
        $progress = app(ProgressService::class);
        $ordered = $progress->orderedPublishedLessons($course);
        $completedIds = LessonProgressIds($userId, $course);

        $targetIndex = $ordered->search(fn(Lesson $l) => $l->id === $target->id);
        if ($targetIndex === false) return false;
        if ($targetIndex === 0) return true;

        $prior = $ordered->slice(0, $targetIndex);
        foreach ($prior as $lesson) {
            if (!in_array($lesson->id, $completedIds, true)) {
                return false;
            }
        }

        return true;
    }

    public function canDownloadResource(User $user, Lesson $lesson): bool
    {
        return $this->canAccessLesson($user, $lesson);
    }

    private function activeWorkspaceId(): ?int
    {
        try {
            return \Common\Workspaces\ActiveWorkspace::get()->id;
        } catch (\Throwable $e) {
            return null;
        }
    }
}

if (!function_exists('LessonProgressIds')) {
    function LessonProgressIds(int $userId, Course $course): array
    {
        return app(ProgressService::class)->completedLessonIds($userId, $course);
    }
}
