<?php

namespace App\Courses\Services;

use App\Courses\Models\Course;
use App\Courses\Models\Enrollment;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Support\Facades\DB;

class EnrollmentService
{
    /**
     * Idempotent grant — safe against duplicate webhooks / retries.
     */
    public function grantFromOrder(StorefrontOrder $order): ?Enrollment
    {
        $product = $order->product()->with('course')->first();
        if (!$product || !$product->isCourse() || !$product->course) {
            return null;
        }

        $course = $product->course;
        $userId = $order->buyer_user_id ?? $this->resolveUserIdByEmail($order->buyer_email);

        if ($order->status !== 'paid' && (int) $order->gross_amount_cents !== 0) {
            return null;
        }

        if (!$userId) {
            return $this->grantFromPortalOrder($order);
        }

        return $this->grant($course, (int) $userId, $order->id);
    }

    /**
     * Guest portal enrollment keyed by buyer email hash (no Linket account yet).
     */
    public function grantFromPortalOrder(StorefrontOrder $order): ?Enrollment
    {
        $product = $order->product()->with('course')->first();
        if (!$product || !$product->isCourse() || !$product->course) {
            return null;
        }

        if ($order->status !== 'paid' && (int) $order->gross_amount_cents !== 0) {
            return null;
        }

        $email = strtolower(trim((string) $order->buyer_email));
        if ($email === '') {
            return null;
        }

        $hash = hash('sha256', $email);
        $course = $product->course;

        return DB::transaction(function () use ($course, $hash, $order): Enrollment {
            $existing = Enrollment::query()
                ->where('course_id', $course->id)
                ->where('portal_email_hash', $hash)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                if ($existing->status === 'revoked') {
                    $existing->update([
                        'status' => 'active',
                        'storefront_order_id' => $order->id,
                        'enrolled_at' => now(),
                    ]);
                }

                return $existing->fresh();
            }

            return Enrollment::query()->create([
                'course_id' => $course->id,
                'user_id' => null,
                'portal_email_hash' => $hash,
                'storefront_order_id' => $order->id,
                'status' => 'active',
                'enrolled_at' => now(),
            ]);
        });
    }

    public function grant(Course $course, int $userId, ?int $orderId = null): Enrollment
    {
        return DB::transaction(function () use ($course, $userId, $orderId): Enrollment {
            // Lock unique row to prevent races.
            $existing = Enrollment::where('user_id', $userId)->where('course_id', $course->id)->lockForUpdate()->first();
            if ($existing) {
                if ($existing->status === 'revoked') {
                    $existing->update(['status' => 'active', 'storefront_order_id' => $orderId ?? $existing->storefront_order_id, 'enrolled_at' => now()]);
                }
                return $existing->fresh();
            }

            return Enrollment::create([
                'course_id' => $course->id,
                'user_id' => $userId,
                'storefront_order_id' => $orderId,
                'status' => 'active',
                'enrolled_at' => now(),
            ]);
        });
    }

    public function grantFree(Course $course, int $userId): Enrollment
    {
        return $this->grant($course, $userId, null);
    }

    public function revokeForOrder(StorefrontOrder $order): void
    {
        $product = $order->product;
        if (!$product || !$product->isCourse()) return;

        Enrollment::where('storefront_order_id', $order->id)->update(['status' => 'revoked']);
        Enrollment::where('course_id', $product->course?->id)->where('user_id', $order->buyer_user_id)->update(['status' => 'revoked']);
    }

    public function isEnrolled(Course $course, int $userId): bool
    {
        return Enrollment::where('course_id', $course->id)->where('user_id', $userId)->where('status', 'active')->exists();
    }

    public function isEnrolledByPortal(Course $course, string $portalEmailHash): bool
    {
        return Enrollment::query()
            ->where('course_id', $course->id)
            ->where('portal_email_hash', $portalEmailHash)
            ->where('status', 'active')
            ->exists();
    }

    private function resolveUserIdByEmail(?string $email): ?int
    {
        if (!$email) return null;
        $user = \App\Models\User::where('email', $email)->first();
        return $user?->id;
    }
}
