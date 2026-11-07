<?php

namespace App\Telegram\Support;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class TelegramSettings
{
    /** @return array<string, mixed> */
    public static function stored(): array
    {
        $encrypted = DB::table('telegram_integration_settings')->where('id', 1)->value('encrypted_config');

        if ($encrypted === null) {
            throw new \RuntimeException('Telegram configuration record is missing.');
        }

        $decoded = json_decode(Crypt::decryptString($encrypted), true, 512, JSON_THROW_ON_ERROR);

        if (! is_array($decoded)) {
            throw new \UnexpectedValueException('Telegram configuration is invalid.');
        }

        return $decoded;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $saved = self::stored();

        return array_key_exists($key, $saved)
            ? $saved[$key]
            : config("services.telegram.{$key}", $default);
    }

    public static function isOperational(): bool
    {
        if ((bool) self::get('enabled') && filled(self::get('token'))) {
            return true;
        }

        return filled(self::get('token'))
            && filled(self::get('webhook_secret'))
            && ltrim((string) self::get('bot_username'), '@') !== '';
    }

    /** @param array<string, mixed> $data */
    public static function update(array $data): void
    {
        DB::transaction(function () use ($data): void {
            $record = DB::table('telegram_integration_settings')->where('id', 1)->lockForUpdate()->first();
            if (! $record) {
                throw new \RuntimeException('Telegram configuration record is missing.');
            }

            $saved = json_decode(Crypt::decryptString($record->encrypted_config), true, 512, JSON_THROW_ON_ERROR);
            if (! is_array($saved)) {
                throw new \UnexpectedValueException('Telegram configuration is invalid.');
            }
            $next = [...$saved, ...$data];

            if ((bool) ($next['enabled'] ?? config('services.telegram.enabled', false))) {
                $errors = [];
                foreach (['token', 'bot_username', 'webhook_secret'] as $key) {
                    if (! filled($next[$key] ?? config("services.telegram.{$key}"))) {
                        $errors[$key] = __('Configure this field before enabling Telegram.');
                    }
                }
                if ($errors !== []) {
                    throw ValidationException::withMessages($errors);
                }
            }

            DB::table('telegram_integration_settings')->where('id', 1)->update([
                'encrypted_config' => Crypt::encryptString(json_encode($next, JSON_THROW_ON_ERROR)),
                'updated_at' => now(),
            ]);
        });
    }
}
