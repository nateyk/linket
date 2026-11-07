<?php

namespace App\Telegram\Notifications;

use App\Telegram\Models\TelegramConnection;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\Telegram\TelegramMessage;

final class TelegramConnectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(public int $chatId)
    {
        $this->onQueue('default');
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        // A one-time acknowledgement of the creator's explicit /start action.
        return ['telegram'];
    }

    public function viaQueues(): array
    {
        return ['telegram' => 'default'];
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        return $channel === 'telegram'
            && \App\Telegram\Support\TelegramSettings::isOperational()
            && method_exists($notifiable, 'getKey')
            && TelegramConnection::query()
                ->where('user_id', $notifiable->getKey())
                ->where('telegram_chat_id', $this->chatId)
                ->exists();
    }

    public function toTelegram(object $notifiable): TelegramMessage
    {
        return TelegramMessage::create()
            ->to($this->chatId)
            ->normal()
            ->content(__('Welcome to Linket'))
            ->line(__('This chat is connected. Choose which notifications you receive in Account Settings.'))
            ->line(__('Manage notification preferences in Account Settings.'))
            ->button(__('Notification settings'), url('/account-settings/integrations'));
    }
}
