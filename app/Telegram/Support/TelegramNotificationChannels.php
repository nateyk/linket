<?php

namespace App\Telegram\Support;

final class TelegramNotificationChannels
{
    /**
     * @param  array<int, string>  $channels
     * @return array<int, string>
     */
    public static function append(object $notifiable, array $channels): array
    {
        if (! self::isAvailableFor($notifiable)) {
            return $channels;
        }

        if (! in_array('telegram', $channels, true)) {
            $channels[] = 'telegram';
        }

        return $channels;
    }

    public static function isAvailableFor(object $notifiable): bool
    {
        if (
            ! config('services.telegram.enabled') ||
            blank(config('services.telegram.token')) ||
            ! method_exists($notifiable, 'routeNotificationForTelegram')
        ) {
            return false;
        }

        return filled($notifiable->routeNotificationForTelegram());
    }
}
