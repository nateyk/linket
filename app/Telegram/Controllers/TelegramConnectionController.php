<?php

namespace App\Telegram\Controllers;

use App\Telegram\Models\TelegramLinkToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

final class TelegramConnectionController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $connection = $request->user()->telegramConnection;

        return response()->json([
            'telegram' => [
                'enabled' => (bool) config('services.telegram.enabled'),
                'connected' => $connection !== null,
                'username' => $connection?->telegram_username,
                'connected_at' => $connection?->connected_at?->toIso8601String(),
                'bot_username' => $this->botUsername(),
            ],
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

    private function botUsername(): string
    {
        return ltrim((string) config('services.telegram.bot_username'), '@');
    }
}
