<?php

namespace App\Storefront\Notifications;

use App\Storefront\Models\CreatorPaymentMethod;
use App\Telegram\Support\TelegramNotificationChannels;
use App\Telegram\Support\TelegramNotificationPreferences;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\Telegram\TelegramMessage;

final class ReceivingAccountStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(public int $accountId, public string $event)
    {
        $this->onQueue('default');
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return TelegramNotificationChannels::append(
            $notifiable,
            [],
            TelegramNotificationPreferences::RECEIVING_ACCOUNTS,
        );
    }

    public function viaQueues(): array
    {
        return ['telegram' => 'default'];
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        $account = CreatorPaymentMethod::query()
            ->whereKey($this->accountId)
            ->where('user_id', $notifiable->getKey())
            ->first();

        return $account !== null
            && TelegramNotificationChannels::isAvailableFor(
                $notifiable,
                TelegramNotificationPreferences::RECEIVING_ACCOUNTS,
            )
            && match ($this->event) {
                'approved', 'provider_registered' => $account->status === 'approved',
                'rejected' => $account->status === 'rejected',
                'suspended' => (bool) $account->is_suspended,
                'restored' => ! (bool) $account->is_suspended,
                default => false,
            };
    }

    public function toTelegram(object $notifiable): TelegramMessage
    {
        $account = CreatorPaymentMethod::query()
            ->whereKey($this->accountId)
            ->where('user_id', $notifiable->getKey())
            ->first();

        $description = match ($this->event) {
            'approved' => __('Receiving account ownership approved'),
            'rejected' => __('Receiving account needs changes'),
            'provider_registered' => __('Receiving account registered with verification provider'),
            'suspended' => __('Receiving account temporarily suspended'),
            'restored' => __('Receiving account suspension lifted'),
            default => __('Receiving account status changed'),
        };

        $message = TelegramMessage::create()
            ->normal()
            ->content($description);

        if ($account) {
            $message->line(__(':provider account ending :ending', [
                'provider' => strtoupper($account->provider),
                'ending' => substr((string) $account->account_number, -4),
            ]));
        }

        return $message->button(
            __('View receiving accounts'),
            url('/account-settings/receiving-accounts'),
        );
    }
}
