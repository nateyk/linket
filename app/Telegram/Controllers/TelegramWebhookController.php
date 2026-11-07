<?php

namespace App\Telegram\Controllers;

use App\Telegram\Models\TelegramConnection;
use App\Telegram\Services\TelegramAccountLinker;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

final class TelegramWebhookController extends Controller
{
    public function __construct(
        private readonly TelegramAccountLinker $accountLinker,
    ) {}

    public function handle(Request $request): Response
    {
        abort_unless(
            \App\Telegram\Support\TelegramSettings::isOperational(),
            Response::HTTP_NOT_FOUND,
        );

        $configuredSecret = (string) \App\Telegram\Support\TelegramSettings::get('webhook_secret');
        $providedSecret = (string) $request->header(
            'X-Telegram-Bot-Api-Secret-Token',
            '',
        );

        abort_unless(
            $configuredSecret !== '' &&
            $providedSecret !== '' &&
            hash_equals($configuredSecret, $providedSecret),
            Response::HTTP_UNAUTHORIZED,
        );

        $payload = $request->json()->all();
        $updateId = data_get($payload, 'update_id');

        if (! is_int($updateId) && ! ctype_digit((string) $updateId)) {
            return response()->noContent();
        }

        DB::transaction(function () use ($payload, $updateId): void {
            $inserted = DB::table('telegram_webhook_updates')->insertOrIgnore([
                'update_id' => (int) $updateId,
                'processed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($inserted === 0) {
                return;
            }

            $message = data_get($payload, 'message');
            if (! is_array($message) || data_get($message, 'chat.type') !== 'private') {
                return;
            }

            $telegramUserId = (int) data_get($message, 'from.id', 0);
            $telegramChatId = (int) data_get($message, 'chat.id', 0);

            if ($telegramUserId <= 0 || $telegramChatId <= 0) {
                return;
            }

            TelegramConnection::query()
                ->where('telegram_user_id', $telegramUserId)
                ->where('telegram_chat_id', $telegramChatId)
                ->update(['last_seen_at' => now()]);

            $text = trim((string) data_get($message, 'text', ''));
            if (! preg_match(
                '/^\/start(?:@[A-Za-z0-9_]+)?(?:\s+([A-Za-z0-9_-]{20,64}))?$/',
                $text,
                $matches,
            )) {
                return;
            }

            $plainToken = $matches[1] ?? '';
            if ($plainToken === '') {
                return;
            }

            $this->accountLinker->link(
                $plainToken,
                $telegramUserId,
                $telegramChatId,
                data_get($message, 'from.username'),
                data_get($message, 'from.language_code'),
            );
        });

        return response()->noContent();
    }
}
