<?php

namespace App\Courses\Services;

use App\Courses\Models\Course;
use App\Courses\Models\Enrollment;
use App\Courses\Models\Lesson;
use App\Storefront\Models\DigitalProductOrderRecovery;
use App\Storefront\Models\StorefrontOrder;

class PortalCourseAccess
{
    public function emailHash(DigitalProductOrderRecovery $recovery): string
    {
        return hash('sha256', strtolower(trim((string) $recovery->email)));
    }

    public function canAccessCourse(DigitalProductOrderRecovery $recovery, Course $course): bool
    {
        $hash = $this->emailHash($recovery);

        if (app(EnrollmentService::class)->isEnrolledByPortal($course, $hash)) {
            return true;
        }

        return StorefrontOrder::query()
            ->where('status', 'paid')
            ->whereRaw('LOWER(buyer_email) = ?', [strtolower(trim((string) $recovery->email))])
            ->whereHas('product.course', fn ($q) => $q->where('courses.id', $course->id))
            ->exists();
    }

    public function ensureEnrollment(DigitalProductOrderRecovery $recovery, Course $course): ?Enrollment
    {
        $order = StorefrontOrder::query()
            ->where('status', 'paid')
            ->whereRaw('LOWER(buyer_email) = ?', [strtolower(trim((string) $recovery->email))])
            ->whereHas('product.course', fn ($q) => $q->where('courses.id', $course->id))
            ->latest('paid_at')
            ->first();

        if (!$order) {
            return null;
        }

        return app(EnrollmentService::class)->grantFromPortalOrder($order->fresh('product.course'));
    }

    public function canAccessLesson(DigitalProductOrderRecovery $recovery, Lesson $lesson): bool
    {
        $course = $lesson->course;
        if (!$course || $lesson->isDraft()) {
            return false;
        }

        if (!$course->isPublished() && $course->published_at === null) {
            return false;
        }

        if (!$this->canAccessCourse($recovery, $course)) {
            return false;
        }

        $this->ensureEnrollment($recovery, $course);

        if (!$course->require_sequential_completion) {
            return true;
        }

        return $this->isLessonUnlocked($recovery, $course, $lesson);
    }

    public function isLessonUnlocked(DigitalProductOrderRecovery $recovery, Course $course, Lesson $target): bool
    {
        $progress = app(ProgressService::class);
        $hash = $this->emailHash($recovery);
        $ordered = $progress->orderedPublishedLessons($course);
        $completedIds = $progress->completedLessonIdsForPortal($hash, $course);

        $targetIndex = $ordered->search(fn (Lesson $lesson) => $lesson->id === $target->id);
        if ($targetIndex === false) {
            return false;
        }
        if ($targetIndex === 0) {
            return true;
        }

        $prior = $ordered->slice(0, $targetIndex);
        foreach ($prior as $lesson) {
            if (! in_array($lesson->id, $completedIds, true)) {
                return false;
            }
            if (! $progress->hasPassedRequiredQuizForPortal($hash, $lesson)) {
                return false;
            }
        }

        return true;
    }
}
