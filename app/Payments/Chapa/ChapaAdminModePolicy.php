<?php

declare(strict_types=1);

namespace App\Payments\Chapa;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

final class ChapaAdminModePolicy
{
    public function assertLiveAllowed(string $mode): void
    {
        if ($mode !== 'live') {
            return;
        }
        if (!config('services.chapa.live_mode_switch_allowed', false)) {
            throw ValidationException::withMessages([
                'mode' => __('Live checkout requires operator approval and the server release flag.'),
            ]);
        }
        if (config('services.chapa.payouts_enabled', false)) {
            throw ValidationException::withMessages([
                'mode' => __('Disable the separate live payout switch before changing checkout mode.'),
            ]);
        }
    }

    public function assertReady(string $mode, ChapaMerchantProfiles $profiles): void
    {
        $status = $profiles->summary(\App\Payments\Chapa\ChapaProfileMode::from($mode));
        if (in_array(false, [
            $status['configured'],
            $status['webhook_configured'],
            $status['approval_configured'],
        ], true)) {
            throw ValidationException::withMessages([
                'mode' => __('Save merchant, webhook and transfer-approval credentials first.'),
            ]);
        }
    }

    /** @param array<string, string> $data */
    public function assertConfirmation(Request $request, array $data, string $mode, string $prefix): void
    {
        $expected = $prefix.strtoupper($mode).($prefix === 'ENABLE ' ? ' CHECKOUT' : '');
        if ($data['confirmation'] !== $expected) {
            throw ValidationException::withMessages([
                'confirmation' => __('Type the exact confirmation phrase.'),
            ]);
        }

        $this->assertPassword($request, (string) $data['admin_password']);
    }

    private function assertPassword(Request $request, string $password): void
    {
        $user = $request->user();
        $key = 'chapa-mode-step-up:'.hash('sha256', (string) $user->id.':'.$request->ip());
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages([
                'admin_password' => __('Administrator confirmation is temporarily locked.'),
            ]);
        }
        if (!Hash::check($password, (string) $user->getAuthPassword())) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages([
                'admin_password' => __('Administrator reauthentication failed.'),
            ]);
        }
        RateLimiter::clear($key);
    }
}
