<?php

declare(strict_types=1);

namespace App\Payments\Controllers;

use App\Payments\Chapa\ChapaMerchantProfiles;
use App\Payments\Chapa\ChapaModeSwitchGuard;
use App\Payments\Chapa\ChapaProfileSettingsWriter;
use App\Payments\Chapa\ChapaAdminModePolicy;
use Common\Settings\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
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

    public function save(Request $request, string $mode): array
    {
        $this->authorizeSettings();
        $this->assertMode($mode);
        $profiles = app(ChapaMerchantProfiles::class);
        $data = $request->validate([
            'public_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'secret_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'webhook_secret' => ['sometimes', 'nullable', 'string', 'min:16', 'max:255'],
            'transfer_approval_secret' => ['sometimes', 'nullable', 'string', 'min:16', 'max:255'],
        ]);
        $values = array_map(static fn ($value) => (string) ($value ?? ''), $data);
        $guard = app(ChapaModeSwitchGuard::class);
        if ($mode === $profiles->activeMode() && $values !== []) {
            $guard->assertNoInFlight();
        }
        app(ChapaProfileSettingsWriter::class)->save($mode, $values);

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
        $policy = app(ChapaAdminModePolicy::class);
        $policy->assertConfirmation($request, $data, $mode, 'SWITCH TO ');
        $policy->assertLiveAllowed($mode);
        $guard->assertNoInFlight();
        $policy->assertReady($mode, $profiles);
        app(ChapaProfileSettingsWriter::class)->validateProviderSecret($profiles->credential($mode, 'secret_key'));

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
        $policy = app(ChapaAdminModePolicy::class);
        $policy->assertConfirmation($request, $data, $mode, 'ENABLE ');
        $policy->assertLiveAllowed($mode);
        $policy->assertReady($mode, $profiles);
        app(ChapaProfileSettingsWriter::class)->validateProviderSecret($profiles->active('secret_key'));
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


}
