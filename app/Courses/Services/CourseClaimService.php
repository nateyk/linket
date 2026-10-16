<?php

namespace App\Courses\Services;

use App\Courses\Models\Enrollment;
use App\Courses\Models\LessonProgress;
use App\Models\User;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CourseClaimService
{
    public function claimForUser(User $user): int
    {
        if (blank($user->email) || !$user->email_verified_at) {
            return 0;
        }

        $email = strtolower(trim((string) $user->email));
        $hash = hash('sha256', $email);

        $orders = StorefrontOrder::query()
            ->whereRaw('LOWER(buyer_email) = ?', [$email])
            ->where('status', 'paid')
            ->with('product.course')
            ->get();

        $claimed = 0;

        foreach ($orders as $order) {
            $product = $order->product;
            if (!$product || !$product->isCourse() || !$product->course) {
                continue;
            }

            $course = $product->course;

            // Only claim orders that are unassigned or already assigned to this user.
            if ($order->buyer_user_id !== null && (int) $order->buyer_user_id !== (int) $user->id) {
                continue;
            }

            DB::transaction(function () use ($order, $user, $course, $hash, &$claimed): void {
                if ($order->buyer_user_id === null) {
                    $order->update(['buyer_user_id' => $user->id]);
                    $order = $order->fresh('product.course');
                }

                $portalEnrollment = Enrollment::query()
                    ->where('course_id', $course->id)
                    ->where('portal_email_hash', $hash)
                    ->lockForUpdate()
                    ->first();

                $userEnrollment = Enrollment::query()
                    ->where('course_id', $course->id)
                    ->where('user_id', $user->id)
                    ->lockForUpdate()
                    ->first();

                if ($portalEnrollment && $userEnrollment && $portalEnrollment->id !== $userEnrollment->id) {
                    $this->mergePortalProgress($hash, $course->id, $user->id);
                    if ($userEnrollment->status === 'revoked') {
                        $userEnrollment->update([
                            'status' => 'active',
                            'storefront_order_id' => $order->id,
                            'enrolled_at' => now(),
                        ]);
                    }
                    $portalEnrollment->delete();
                    $claimed++;
                } elseif ($portalEnrollment) {
                    $portalEnrollment->update([
                        'user_id' => $user->id,
                        'portal_email_hash' => null,
                        'status' => 'active',
                        'storefront_order_id' => $order->id,
                    ]);
                    $this->mergePortalProgress($hash, $course->id, $user->id);
                    $claimed++;
                } elseif (!$userEnrollment) {
                    $enrollment = app(EnrollmentService::class)->grant($course, (int) $user->id, $order->id);
                    if ($enrollment) {
                        $this->mergePortalProgress($hash, $course->id, $user->id);
                        $claimed++;
                    }
                } else {
                    $this->mergePortalProgress($hash, $course->id, $user->id);
                    if ($order->buyer_user_id === null) {
                        $order->update(['buyer_user_id' => $user->id]);
                    }
                }

                Log::info('course.claimed', [
                    'course_id' => $course->id,
                    'user_id' => $user->id,
                    'order_id' => $order->id,
                ]);
            });
        }

        // Orphan portal enrollments: only claim when a paid order for this
        // email+course is unassigned or already owned by this user.
        $orphanPortals = Enrollment::query()
            ->where('portal_email_hash', $hash)
            ->where('status', 'active')
            ->whereNull('user_id')
            ->get();

        foreach ($orphanPortals as $portalEnrollment) {
            $claimableOrder = StorefrontOrder::query()
                ->whereRaw('LOWER(buyer_email) = ?', [$email])
                ->where('status', 'paid')
                ->where(function ($q) use ($user) {
                    $q->whereNull('buyer_user_id')->orWhere('buyer_user_id', $user->id);
                })
                ->whereHas('product.course', fn ($q) => $q->where('courses.id', $portalEnrollment->course_id))
                ->exists();

            if (! $claimableOrder) {
                continue;
            }

            DB::transaction(function () use ($portalEnrollment, $user, $hash, &$claimed): void {
                $existing = Enrollment::query()
                    ->where('course_id', $portalEnrollment->course_id)
                    ->where('user_id', $user->id)
                    ->lockForUpdate()
                    ->first();
                if ($existing) {
                    $this->mergePortalProgress($hash, $portalEnrollment->course_id, $user->id);
                    $portalEnrollment->delete();
                } else {
                    $portalEnrollment->update([
                        'user_id' => $user->id,
                        'portal_email_hash' => null,
                    ]);
                    $this->mergePortalProgress($hash, $portalEnrollment->course_id, $user->id);
                    $claimed++;
                }
            });
        }

        return $claimed;
    }

    private function mergePortalProgress(string $portalEmailHash, int $courseId, int $userId): void
    {
        $rows = LessonProgress::query()
            ->where('portal_email_hash', $portalEmailHash)
            ->where('course_id', $courseId)
            ->lockForUpdate()
            ->get();

        foreach ($rows as $row) {
            $existing = LessonProgress::query()
                ->where('user_id', $userId)
                ->where('lesson_id', $row->lesson_id)
                ->first();

            if ($existing) {
                $row->delete();
                continue;
            }

            $row->update([
                'user_id' => $userId,
                'portal_email_hash' => null,
            ]);
        }
    }
}
