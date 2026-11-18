<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Storefront\Models\PayoutRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/** Optional, password-based step-up for a specific approved withdrawal. */
final class AdminPayoutStepUp
{
    public function confirm(Request $request, PayoutRequest $payout): void
    {
        if (!config('services.chapa.admin_payout_step_up_required', false)) {
            return;
        }

        $data = $this->validatedConfirmation($request);
        $this->assertMatchingWithdrawal($data, $payout);
        $this->assertAdminPassword($request, (string) $data['admin_password']);

        Log::info('admin.payout.step_up_confirmed', [
            'admin_id' => $request->user()?->getAuthIdentifier(),
            'payout_id' => $payout->id,
        ]);
    }

    /** @return array<string, mixed> */
    private function validatedConfirmation(Request $request): array
    {
        return $request->validate([
            'admin_password' => ['required', 'string', 'max:255'],
            'confirmation_id' => ['required', 'integer'],
            'confirmation_amount_cents' => ['required', 'integer'],
            'confirmation_currency' => ['required', 'string'],
            'confirmation_destination_label' => ['required', 'string'],
        ]);
    }

    /** @param array<string, mixed> $data */
    private function assertMatchingWithdrawal(array $data, PayoutRequest $payout): void
    {
        $matches = (int) $data['confirmation_id'] === (int) $payout->id
            && (int) $data['confirmation_amount_cents'] === (int) $payout->amount_cents
            && hash_equals((string) $payout->currency, (string) $data['confirmation_currency'])
            && hash_equals((string) $payout->payout_method_label, (string) $data['confirmation_destination_label']);

        if (!$matches) {
            throw ValidationException::withMessages([
                'confirmation_id' => __('Withdrawal details changed. Reload before confirming.'),
            ]);
        }
    }

    private function assertAdminPassword(Request $request, string $password): void
    {
        $user = $request->user();
        if (!$user || !$user->getAuthPassword()) {
            throw ValidationException::withMessages(['admin_password' => __('Administrator confirmation unavailable.')]);
        }

        $key = 'admin-payout-stepup:'.hash('sha256', (string) $user->getAuthIdentifier().':'.$request->ip());
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages(['admin_password' => __('Administrator confirmation unavailable.')]);
        }

        if (!Hash::check($password, (string) $user->getAuthPassword())) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages(['admin_password' => __('Administrator confirmation failed.')]);
        }
        RateLimiter::clear($key);
    }
}
