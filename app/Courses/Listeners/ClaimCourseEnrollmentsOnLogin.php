<?php

namespace App\Courses\Listeners;

use App\Courses\Services\CourseClaimService;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Log;

class ClaimCourseEnrollmentsOnLogin
{
    public function handle(Login $event): void
    {
        $user = $event->user;
        if (! $user || blank($user->email) || ! $user->email_verified_at) {
            return;
        }

        try {
            app(CourseClaimService::class)->claimForUser($user);
        } catch (\Throwable $e) {
            Log::warning('course.claim_failed_on_login', [
                'user_id' => $user->id ?? null,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
