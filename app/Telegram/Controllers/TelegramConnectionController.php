<?php

namespace App\Telegram\Controllers;

use App\Telegram\Models\TelegramConnection;
use App\Telegram\Models\TelegramLinkToken;
use App\Telegram\Support\TelegramNotificationPreferences;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

final class TelegramConnectionController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'telegram' => $this->payload($request->user()->telegramConnection),
        ]);
    }

    public function connect(Request $request): JsonResponse
    {
        abort_unless(
            config('services.telegram.enabled') &&
            filled(config('services.telegram.token')) &&
            filled($this->botUsername()),
            Response::HTTP_SERVICE_UNAVAILABLE,
            __('Telegram notifications are not available right now.'),
        );

        $plainToken = Str::random(48);
        $ttl = max(
            1,
            min(30, (int) config('services.telegram.link_token_ttl_minutes', 10)),
        );
        $expiresAt = now()->addMinutes($ttl);

        DB::transaction(function () use ($request, $plainToken, $expiresAt): void {
            TelegramLinkToken::query()
                ->where('user_id', $request->user()->id)
                ->whereNull('consumed_at')
                ->delete();

            TelegramLinkToken::query()->create([
                'user_id' => $request->user()->id,
                'token_hash' => hash('sha256', $plainToken),
                'expires_at' => $expiresAt,
            ]);
        });

        return response()->json([
            'telegram' => [
                'connect_url' => sprintf(
                    'https://t.me/%s?start=%s',
                    $this->botUsername(),
                    $plainToken,
                ),
                'expires_at' => $expiresAt->toIso8601String(),
            ],
        ], Response::HTTP_CREATED);
    }

    public function update(Request $request): JsonResponse
    {
        $connection = $request->user()->telegramConnection;

        if (! $connection) {
            throw ValidationException::withMessages([
                'telegram' => __('Connect Telegram before changing notification settings.'),
            ]);
        }

        $data = $request->validate([
            'notifications_enabled' => ['sometimes', 'boolean'],
            'preferences' => ['sometimes', 'array'],
            'preferences.*' => ['boolean'],
        ]);

        $preferences = $data['preferences'] ?? null;
        if (is_array($preferences)) {
            $unknown = array_diff(
                array_keys($preferences),
                TelegramNotificationPreferences::keys(),
            );

            if ($unknown !== []) {
                throw ValidationException::withMessages([
                    'preferences' => __('One or more Telegram notification preferences are invalid.'),
                ]);
            }
        }

        $connection->forceFill([
            'notifications_enabled' => $data['notifications_enabled']
                ?? $connection->notifications_enabled,
            'notification_preferences' => $preferences === null
                ? $connection->notification_preferences
                : TelegramNotificationPreferences::normalize([
                    ...$connection->notificationPreferences(),
                    ...$preferences,
                ]),
        ])->save();

        return response()->json([
            'telegram' => $this->payload($connection->fresh()),
        ]);
    }

    public function disconnect(Request $request): Response
    {
        DB::transaction(function () use ($request): void {
            $request->user()->telegramConnection()->delete();

            TelegramLinkToken::query()
                ->where('user_id', $request->user()->id)
                ->delete();
        });

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function payload(?TelegramConnection $connection): array
    {
        return [
            'enabled' => (bool) config('services.telegram.enabled'),
            'connected' => $connection !== null,
            'username' => $connection?->telegram_username,
            'connected_at' => $connection?->connected_at?->toIso8601String(),
            'last_seen_at' => $connection?->last_seen_at?->toIso8601String(),
            'bot_username' => $this->botUsername(),
            'notifications_enabled' => $connection?->notifications_enabled ?? true,
            'preferences' => $connection?->notificationPreferences()
                ?? TelegramNotificationPreferences::defaults(),
        ];
    }

    private function botUsername(): string
    {
        return ltrim((string) config('services.telegram.bot_username'), '@');
    }
}
