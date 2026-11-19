<?php

declare(strict_types=1);

namespace App\Payments\Controllers;

use App\Payments\Chapa\ChapaMerchantProfiles;
use App\Payments\Chapa\ChapaModeSwitchGuard;
use App\Payments\Chapa\ChapaV2Client;
use App\Storefront\Services\ChapaTransferApprovalSecret;
use Common\Settings\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

final class AdminChapaEnvironmentsController extends Controller
{
    public function index(ChapaMerchantProfiles $profiles, ChapaModeSwitchGuard $guard): array
    {
        $this->authorizeSettings();
        $mode = $profiles->activeMode();

        return ['data' => [
            'active_mode' => $mode,
            'api_version' => 'v1',
            'checkout_enabled' => (bool) settings()->get('billing.chapa.enable', true)
                && $profiles->active('secret_key') !== '',
            'live_switch_allowed' => (bool) config('services.chapa.live_mode_switch_allowed', false),
            'live_payouts_enabled' => (bool) config('services.chapa.payouts_enabled', false),
            'profiles' => [
                'test' => $profiles->summary('test'),
                'live' => $profiles->summary('live'),
            ],
            'in_flight' => $guard->counts(),
            'webhook_url' => url('/billing/chapa/webhook'),
            'transfer_approval_url' => url('/api/v1/chapa/transfer-approval'),
        ]];
    }

    public function save(Request $request, string $mode, ChapaMerchantProfiles $profiles, ChapaModeSwitchGuard $guard): array
    {
        $this->authorizeSettings();
        $this->assertMode($mode);
        $data = $request->validate([
            'public_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'secret_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'webhook_secret' => ['sometimes', 'nullable', 'string', 'min:16', 'max:255'],
            'transfer_approval_secret' => ['sometimes', 'nullable', 'string', 'min:16', 'max:255'],
        ]);
        $values = array_map(static fn ($value) => (string) ($value ?? ''), $data);
        $this->validateProfile($mode, $values);
        if ($mode === $profiles->activeMode() && $values !== []) {
            $guard->assertNoInFlight();
        }

        $secret = $values['secret_key'] ?? '';
        if ($secret !== '') {
            $this->validateMerchantKey($secret);
        }

        $settings = [];
        foreach (['public_key', 'secret_key', 'webhook_secret'] as $field) {
            if (($values[$field] ?? '') !== '') {
                $settings[ChapaMerchantProfiles::key($mode, $field)] = $values[$field];
            }
        }
        if (($values['transfer_approval_secret'] ?? '') !== '') {
            $settings[ChapaTransferApprovalSecret::settingKey($mode)] = $values['transfer_approval_secret'];
        }
        if ($settings !== []) {
            settings()->save($settings);
        }

        return $this->index($profiles, $guard);
    }

    public function switch(Request $request, ChapaMerchantProfiles $profiles, ChapaModeSwitchGuard $guard): array
    {
        $this->authorizeSettings();
        $data = $request->validate([
            'mode' => ['required', 'string', 'in:test,live'],
            'confirmation' => ['required', 'string'],
            'admin_password' => ['required', 'string', 'max:255'],
        ]);
        $mode = $data['mode'];
        $this->assertConfirmation($request, $data, $mode, 'SWITCH TO ');
        if ($mode === 'live' && !config('services.chapa.live_mode_switch_allowed', false)) {
            throw ValidationException::withMessages([
                'mode' => __('Live checkout mode requires operator approval and the server release flag.'),
            ]);
        }
        if ($mode === 'live' && config('services.chapa.payouts_enabled', false)) {
            throw ValidationException::withMessages([
                'mode' => __('Disable the separate live payout flag before switching checkout mode.'),
            ]);
        }
        $guard->assertNoInFlight();
        $this->assertReady($mode, $profiles);
        $this->validateMerchantKey($profiles->credential($mode, 'secret_key'));

        // Fail closed: switching always PAUSES checkout. A separate confirmation
        // is required to allow paid orders in the selected environment.
        settings()->save([
            'billing.chapa.enable' => 'false',
            'billing.chapa.active_mode' => $mode,
        ]);
        Log::info('chapa.checkout.mode_changed', ['admin_id' => $request->user()->id, 'mode' => $mode]);

        return $this->index($profiles, $guard);
    }

    public function enable(Request $request, ChapaMerchantProfiles $profiles, ChapaModeSwitchGuard $guard): array
    {
        $this->authorizeSettings();
        $mode = $profiles->activeMode();
        $data = $request->validate([
            'confirmation' => ['required', 'string'],
            'admin_password' => ['required', 'string', 'max:255'],
        ]);
        $this->assertConfirmation($request, $data, $mode, 'ENABLE ');
        if ($mode === 'live' && !config('services.chapa.live_mode_switch_allowed', false)) {
            throw ValidationException::withMessages(['mode' => __('Live checkout is not authorized on this server.')]);
        }
        $this->assertReady($mode, $profiles);
        $this->validateMerchantKey($profiles->active('secret_key'));
        settings()->save(['billing.chapa.enable' => 'true']);
        Log::info('chapa.checkout.enabled', ['admin_id' => $request->user()->id, 'mode' => $mode]);

        return $this->index($profiles, $guard);
    }

    public function pause(Request $request, ChapaMerchantProfiles $profiles, ChapaModeSwitchGuard $guard): array
    {
        $this->authorizeSettings();
        settings()->save(['billing.chapa.enable' => 'false']);
        Log::warning('chapa.checkout.paused', ['admin_id' => $request->user()->id]);

        return $this->index($profiles, $guard);
    }

    private function authorizeSettings(): void
    {
        Gate::authorize('admin.access');
        Gate::authorize('update', Setting::class);
    }

    private function assertMode(string $mode): void
    {
        abort_unless(in_array($mode, ChapaMerchantProfiles::MODES, true), 404);
    }

    /** @param array<string, string> $values */
    private function validateProfile(string $mode, array $values): void
    {
        $public = $values['public_key'] ?? '';
        $secret = $values['secret_key'] ?? '';
        if (($public === '') !== ($secret === '')) {
            throw ValidationException::withMessages(['secret_key' => __('Enter the public and secret keys together.')]);
        }
        if ($secret !== '' && ChapaMerchantProfiles::modeForSecret($secret) !== $mode) {
            throw ValidationException::withMessages(['secret_key' => __('This key belongs to a different Chapa environment or API version.')]);
        }
        if ($public !== '' && !str_starts_with($public, $mode === 'test' ? 'CHAPUBK_TEST-' : 'CHAPUBK-')) {
            throw ValidationException::withMessages(['public_key' => __('Use the matching Chapa v1 public key for this environment.')]);
        }
        foreach ($values as $field => $value) {
            if ($value !== '' && (trim($value) !== $value || preg_match('/[\\x00-\\x1F\\x7F]/', $value))) {
                throw ValidationException::withMessages([$field => __('Chapa configuration contains invalid whitespace or control characters.')]);
            }
        }
    }

    private function validateMerchantKey(string $secret): void
    {
        try {
            $status = app(ChapaV2Client::class)->secretStatus($secret);
        } catch (\Throwable) {
            throw ValidationException::withMessages(['secret_key' => __('Could not validate the Chapa merchant key with the provider.')]);
        }
        if ($status !== 'accepted') {
            throw ValidationException::withMessages(['secret_key' => __('Chapa rejected this key or its environment.')]);
        }
    }

    private function assertReady(string $mode, ChapaMerchantProfiles $profiles): void
    {
        $status = $profiles->summary($mode);
        if (!$status['configured'] || !$status['webhook_configured'] || !$status['approval_configured']) {
            throw ValidationException::withMessages([
                'mode' => __('Save matching merchant, webhook, and transfer-approval credentials first.'),
            ]);
        }
    }

    /** @param array<string, string> $data */
    private function assertConfirmation(Request $request, array $data, string $mode, string $prefix): void
    {
        $expected = $prefix.strtoupper($mode).($prefix === 'ENABLE ' ? ' CHECKOUT' : '');
        if ($data['confirmation'] !== $expected) {
            throw ValidationException::withMessages(['confirmation' => __('Type the exact confirmation phrase.')]);
        }

        $user = $request->user();
        $key = 'chapa-mode-step-up:'.hash('sha256', (string) $user->id.':'.$request->ip());
        if (RateLimiter::tooManyAttempts($key, 5) || !Hash::check((string) $data['admin_password'], (string) $user->getAuthPassword())) {
            RateLimiter::hit($key, 300);
            throw ValidationException::withMessages(['admin_password' => __('Administrator reauthentication failed or temporarily locked.')]);
        }
        RateLimiter::clear($key);
    }
}
