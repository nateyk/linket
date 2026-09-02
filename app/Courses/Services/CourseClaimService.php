<?php

namespace App\Courses\Services;

use App\Courses\Models\Enrollment;
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

            // Skip if already enrolled (idempotent)
            if (Enrollment::where('user_id', $user->id)->where('course_id', $course->id)->exists()) {
                // Ensure order linkage for audit
                if ($order->buyer_user_id === null) {
                    $order->update(['buyer_user_id' => $user->id]);
                }
                continue;
            }

            // Only claim orders that are unassigned or already assigned to this user.
            // If order is assigned to a different user, do not hijack.
            if ($order->buyer_user_id !== null && (int) $order->buyer_user_id !== (int) $user->id) {
                continue;
            }

            DB::transaction(function () use ($order, $user, $course, &$claimed): void {
                // Link order to user before grant
                if ($order->buyer_user_id === null) {
                    $order->update(['buyer_user_id' => $user->id]);
                    $order = $order->fresh('product.course');
                }

                $enrollment = app(EnrollmentService::class)->grantFromOrder($order->fresh('product.course'));
                if ($enrollment) {
                    $claimed++;
                    Log::info('course.claimed', [
                        'course_id' => $course->id,
                        'user_id' => $user->id,
                        'order_id' => $order->id,
                    ]);
                }
            });
        }

        return $claimed;
    }
}
