<?php

namespace App\Telegram\Services;

use App\Telegram\Models\TelegramConnection;
use App\Telegram\Models\TelegramLinkToken;
use Illuminate\Support\Facades\DB;

final class TelegramAccountLinker
{
    public function link(
        string $plainToken,
        int $telegramUserId,
        int $telegramChatId,
        ?string $username,
        ?string $languageCode,
    ): ?TelegramConnection {
        if (
            $plainToken === '' ||
            $telegramUserId <= 0 ||
            $telegramChatId <= 0 ||
            $telegramUserId !== $telegramChatId
        ) {
            return null;
        }

        return DB::transaction(function () use (
            $plainToken,
            $telegramUserId,
            $telegramChatId,
            $username,
            $languageCode,
        ): ?TelegramConnection {
            $token = TelegramLinkToken::query()
                ->where('token_hash', hash('sha256', $plainToken))
                ->lockForUpdate()
                ->first();

            if (! $token?->isUsable()) {
                return null;
            }

            $conflict = TelegramConnection::query()
                ->where('user_id', '!=', $token->user_id)
                ->where(function ($query) use ($telegramUserId, $telegramChatId): void {
                    $query
                        ->where('telegram_user_id', $telegramUserId)
                        ->orWhere('telegram_chat_id', $telegramChatId);
                })
                ->exists();

            if ($conflict) {
                return null;
            }

            $connection = TelegramConnection::query()->updateOrCreate(
                ['user_id' => $token->user_id],
                [
                    'telegram_user_id' => $telegramUserId,
                    'telegram_chat_id' => $telegramChatId,
                    'telegram_username' => $username,
                    'language_code' => $languageCode,
                    'connected_at' => now(),
                    'last_seen_at' => now(),
                ],
            );

            $token->forceFill(['consumed_at' => now()])->save();

            TelegramLinkToken::query()
                ->where('user_id', $token->user_id)
                ->where('id', '!=', $token->getKey())
                ->whereNull('consumed_at')
                ->delete();

            return $connection;
        });
    }
}
