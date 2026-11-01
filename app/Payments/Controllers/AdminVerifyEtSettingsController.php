<?php

namespace App\Payments\Controllers;

use App\Payments\VerifyEt\VerifyEtSettings;
use Common\Settings\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

final class AdminVerifyEtSettingsController extends Controller
{
    public function show(): array
    {
        Gate::authorize('admin.access');
        Gate::authorize('update', Setting::class);

        return ['data' => [
            'enabled' => (bool) VerifyEtSettings::get('enabled', false),
            'api_key_configured' => filled(VerifyEtSettings::get('api_key')),
            'webhook_secret_configured' => filled(VerifyEtSettings::get('webhook_secret')),
            'webhook_url' => url('billing/verify-et/webhook'),
            'alert_email' => VerifyEtSettings::get('alert_email', ''),
            'mock_enabled' => (bool) config('services.verify_et.mock', false),
        ]];
    }

    public function update(Request $request): array
    {
        Gate::authorize('admin.access');
        Gate::authorize('update', Setting::class);
        $data = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'api_key' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'webhook_secret' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'alert_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'base_url' => ['prohibited'],
            'mock' => ['prohibited'],
        ]);
        $saved = settings()->get(VerifyEtSettings::KEY, []);
        foreach (['api_key', 'webhook_secret'] as $key) {
            if (! filled($data[$key] ?? null)) {
                unset($data[$key]);
            }
        }
        if ($data['enabled'] ?? VerifyEtSettings::get('enabled', false)) {
            $errors = [];
            foreach (['api_key', 'webhook_secret'] as $key) {
                if (! filled($data[$key] ?? VerifyEtSettings::get($key))) {
                    $errors[$key] = __('Configure this credential before enabling Verify.et.');
                }
            }
            if ($errors) {
                throw ValidationException::withMessages($errors);
            }
        }
        $oldSecret = VerifyEtSettings::get('webhook_secret');
        if (isset($data['webhook_secret']) && filled($oldSecret) && $data['webhook_secret'] !== $oldSecret) {
            $saved['webhook_previous_secret'] = $oldSecret;
            $saved['webhook_previous_secret_rotated_at'] = now()->toIso8601String();
            $saved['webhook_previous_secret_expires_at'] = now()->addHours(24)->toIso8601String();
        }
        settings()->save([VerifyEtSettings::KEY => [...$saved, ...$data]]);

        return $this->show();
    }
}
