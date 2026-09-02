<?php

namespace App\Courses\Listeners;

use App\Courses\Services\CourseClaimService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Log;

class ClaimCourseEnrollmentsOnVerified
{
    public function handle(Verified $event): void
    {
        $user = $event->user;

        try {
            app(CourseClaimService::class)->claimForUser($user);
        } catch (\Throwable $e) {
            Log::warning('course.claim_failed', [
                'user_id' => $user->id ?? null,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
