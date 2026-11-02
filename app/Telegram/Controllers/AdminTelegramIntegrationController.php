<?php

namespace App\Telegram\Controllers;

use App\Telegram\Models\TelegramConnection;
use App\Telegram\Notifications\TelegramIntegrationTestNotification;
use App\Telegram\Services\TelegramBotAdminService;
use Common\Settings\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

final class AdminTelegramIntegrationController extends Controller
{
    public function __construct(
        private readonly TelegramBotAdminService $telegram,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $this->authorize();

        return response()->json([
            'telegram' => $this->health($request),
        ]);
    }

    public function syncWebhook(Request $request): JsonResponse
    {
        $this->authorize();

        return response()->json([
            'telegram' => [
                ...$this->health($request),
                'webhook' => $this->telegram->syncWebhook(),
            ],
        ]);
    }

    public function sendTest(Request $request): JsonResponse
    {
        $this->authorize();

        if (! $request->user()->telegramConnection()->exists()) {
            throw ValidationException::withMessages([
                'telegram' => __('Connect Telegram to this admin account before sending a test notification.'),
            ]);
        }

        try {
            Notification::sendNow(
                $request->user(),
                new TelegramIntegrationTestNotification(),
            );
        } catch (\Throwable) {
            throw ValidationException::withMessages([
                'telegram' => __('The Telegram test notification could not be delivered.'),
            ]);
        }

        return response()->json([
            'telegram' => [
                ...$this->health($request),
                'test_sent' => true,
            ],
        ]);
    }

    private function authorize(): void
    {
        Gate::authorize('admin.access');
        Gate::authorize('update', Setting::class);
    }

    /** @return array<string, mixed> */
    private function health(Request $request): array
    {
        $enabled = (bool) config('services.telegram.enabled');
        $tokenConfigured = filled(config('services.telegram.token'));
        $secretConfigured = filled(config('services.telegram.webhook_secret'));
        $botUsername = ltrim(
            (string) config('services.telegram.bot_username'),
            '@',
        );
        $botUsernameConfigured = $botUsername !== '';

        return [
            'enabled' => $enabled,
            'ready' => $enabled
                && $tokenConfigured
                && $secretConfigured
                && $botUsernameConfigured,
            'bot_token_configured' => $tokenConfigured,
            'webhook_secret_configured' => $secretConfigured,
            'bot_username_configured' => $botUsernameConfigured,
            'bot_username' => $botUsername,
            'webhook_url' => url('integrations/telegram/webhook'),
            'connected_accounts' => TelegramConnection::query()->count(),
            'notification_enabled_accounts' => TelegramConnection::query()
                ->where('notifications_enabled', true)
                ->count(),
            'link_token_ttl_minutes' => max(
                1,
                min(
                    30,
                    (int) config(
                        'services.telegram.link_token_ttl_minutes',
                        10,
                    ),
                ),
            ),
            'http_timeout' => (float) config(
                'services.telegram.http.timeout',
                10,
            ),
            'http_connect_timeout' => (float) config(
                'services.telegram.http.connect_timeout',
                5,
            ),
            'current_admin_connected' => $request->user()
                ->telegramConnection()
                ->exists(),
        ];
    }
}
