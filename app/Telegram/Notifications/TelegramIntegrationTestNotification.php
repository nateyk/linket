<?php

namespace App\Telegram\Notifications;

use Illuminate\Notifications\Notification;
use NotificationChannels\Telegram\TelegramMessage;

final class TelegramIntegrationTestNotification extends Notification
{
    public function via(object $notifiable): array
    {
        return ['telegram'];
    }

    public function toTelegram(object $notifiable): TelegramMessage
    {
        return TelegramMessage::create()
            ->normal()
            ->content(__('Linket Telegram test'))
            ->line(__('Your Telegram integration is connected and ready to receive creator notifications.'))
            ->button(__('Open Linket'), url('/account-settings/integrations'));
    }
}
