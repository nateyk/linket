<?php

namespace App\Telegram\Listeners;

use App\Telegram\Models\TelegramConnection;
use Illuminate\Notifications\Events\NotificationFailed;
use Illuminate\Notifications\Events\NotificationSent;

final class TelegramDeliveryMonitor
{
    public function sent(NotificationSent $event): void
    {
        if ($event->channel !== 'telegram' || ! method_exists($event->notifiable, 'getKey')) {
            return;
        }

        TelegramConnection::query()
            ->where('user_id', $event->notifiable->getKey())
            ->update([
                'last_delivery_at' => now(),
                'consecutive_failures' => 0,
                'delivery_status' => 'healthy',
            ]);
    }

    public function failed(NotificationFailed $event): void
    {
        if ($event->channel !== 'telegram' || ! method_exists($event->notifiable, 'getKey')) {
            return;
        }

        $recipient = $event->data['to'] ?? null;
        if (! is_int($recipient) && ! is_string($recipient)) {
            return;
        }

        $connection = TelegramConnection::query()
            ->where('user_id', $event->notifiable->getKey())
            ->where('telegram_chat_id', $recipient)
            ->first();

        if (! $connection) {
            return;
        }

        $connection->forceFill([
            'last_failed_at' => now(),
            'consecutive_failures' => min(65535, $connection->consecutive_failures + 1),
            'delivery_status' => 'attention_required',
        ])->save();
    }
}
