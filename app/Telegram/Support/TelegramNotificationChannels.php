<?php

namespace App\Telegram\Support;

final class TelegramNotificationChannels
{
    /**
     * @param  array<int, string>  $channels
     * @return array<int, string>
     */
    public static function append(
        object $notifiable,
        array $channels,
        ?string $preferenceKey = null,
    ): array {
        if (! self::isAvailableFor($notifiable, $preferenceKey)) {
            return $channels;
        }

        if (! in_array('telegram', $channels, true)) {
            $channels[] = 'telegram';
        }

        return $channels;
    }

    public static function isAvailableFor(
        object $notifiable,
        ?string $preferenceKey = null,
    ): bool {
        if (
            ! config('services.telegram.enabled') ||
            blank(config('services.telegram.token')) ||
            ! method_exists($notifiable, 'routeNotificationForTelegram')
        ) {
            return false;
        }

        if (blank($notifiable->routeNotificationForTelegram())) {
            return false;
        }

        if ($preferenceKey === null) {
            return true;
        }

        if (! method_exists($notifiable, 'telegramConnection')) {
            return false;
        }

        $connection = $notifiable->telegramConnection()->first();

        return $connection !== null
            && $connection->notifications_enabled
            && TelegramNotificationPreferences::enabled(
                $connection->notification_preferences,
                $preferenceKey,
            );
    }
}
