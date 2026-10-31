<?php

namespace App\Payments\VerifyEt;

use Illuminate\Support\Facades\Cache;

final class VerifyEtHealth
{
    public function reportFailure(): void
    {
        Cache::add('verify-et:first-failure', now()->toIso8601String(), now()->addHour());
    }

    public function reportSuccess(): void
    {
        Cache::forget('verify-et:first-failure');
    }

    public function degraded(): bool
    {
        $firstFailure = Cache::get('verify-et:first-failure');

        return is_string($firstFailure) && now()->diffInMinutes($firstFailure) >= 15;
    }
}
