<?php

namespace App\Payments\Controllers;

use App\Payments\Chapa\ChapaV2Client;
use App\Payments\ChapaGateway;
use App\Payments\SubscriptionPaymentGateway;
use Common\Settings\Models\Setting;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use RuntimeException;

final class AdminSubscriptionGatewayController extends Controller
{
    public function show(): array
    {
        Gate::authorize('admin.access');
        Gate::authorize('update', Setting::class);

        return ['data' => $this->payload()];
    }

    public function update(Request $request): array
    {
        Gate::authorize('admin.access');
        Gate::authorize('update', Setting::class);
        $data = $request->validate([
            'gateway' => ['sometimes', 'string', 'in:chapa'],
            'public_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'secret_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'webhook_secret' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);
        $publicKey = trim((string) ($data['public_key'] ?? ''));
        $secretKey = trim((string) ($data['secret_key'] ?? ''));
        $webhookSecret = trim((string) ($data['webhook_secret'] ?? ''));
        if ($this->containsWhitespace($publicKey) || $this->containsWhitespace($secretKey) || $this->containsWhitespace($webhookSecret)) {
            throw ValidationException::withMessages([
                'public_key' => __('Chapa credentials cannot contain spaces.'),
                'secret_key' => __('Chapa credentials cannot contain spaces.'),
                'webhook_secret' => __('Chapa credentials cannot contain spaces.'),
            ]);
        }
        if ($publicKey !== '' || $secretKey !== '') {
            if ($publicKey === '' || $secretKey === '') {
                throw ValidationException::withMessages([
                    'public_key' => __('Enter the public key and the secret key.'),
                    'secret_key' => __('Enter the public key and the secret key.'),
                ]);
            }
            try {
                $status = app(ChapaV2Client::class)->secretStatus($secretKey);
            } catch (ConnectionException|RuntimeException $exception) {
                Log::warning('Chapa credential validation could not reach Chapa.', [
                    'exception' => $exception::class,
                ]);

                throw ValidationException::withMessages([
                    'secret_key' => __('Chapa could not be reached to validate this secret key.'),
                ]);
            }
            if ($status === 'environment_mismatch') {
                throw ValidationException::withMessages([
                    'secret_key' => __('This private key is for the other Chapa environment. Use the test key while the business is in test mode, or the live key while it is live.'),
                ]);
            }
            if ($status !== 'accepted') {
                throw ValidationException::withMessages([
                    'secret_key' => __('Chapa did not accept this secret key.'),
                ]);
            }
            settings()->save([
                'billing.chapa.public_key' => $publicKey,
                'billing.chapa.secret_key' => $secretKey,
            ]);
        }
        if (isset($data['gateway'])) {
            settings()->save([SubscriptionPaymentGateway::KEY => $data['gateway']]);
        }
        if ($webhookSecret !== '') {
            settings()->save(['billing.chapa.webhook_secret' => $webhookSecret]);
        }

        return $this->show();
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        $publicKey = settings()->get('billing.chapa.public_key');

        return [
            'gateway' => SubscriptionPaymentGateway::current(),
            'secret_configured' => filled(app(ChapaGateway::class)->platformSecret()),
            'public_key_masked' => is_string($publicKey) && $publicKey !== '' ? $this->mask($publicKey) : null,
            'webhook_secret_configured' => filled(app(ChapaGateway::class)->webhookSecret()),
            'webhook_url' => url('/billing/chapa/webhook'),
        ];
    }

    private function mask(string $key): string
    {
        $visible = substr($key, -4);

        return str_repeat('•', max(4, strlen($key) - 4)).$visible;
    }

    private function containsWhitespace(string $value): bool
    {
        return $value !== '' && preg_match('/\s/u', $value) === 1;
    }
}
