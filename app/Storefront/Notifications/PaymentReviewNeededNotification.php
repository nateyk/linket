<?php

namespace App\Storefront\Notifications;

use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\StorefrontOrder;
use App\Telegram\Support\TelegramNotificationChannels;
use App\Telegram\Support\TelegramNotificationPreferences;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\Telegram\TelegramMessage;

final class PaymentReviewNeededNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        public int $orderId,
        public int $verificationId,
    ) {
        $this->onQueue('default');
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return TelegramNotificationChannels::append(
            $notifiable, [], TelegramNotificationPreferences::PAYMENT_REVIEW,
        );
    }

    public function viaQueues(): array
    {
        return ['telegram' => 'default'];
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        if ($channel !== 'telegram'
            || ! TelegramNotificationChannels::isAvailableFor(
                $notifiable, TelegramNotificationPreferences::PAYMENT_REVIEW,
            )) {
            return false;
        }

        return StorefrontOrder::query()
            ->whereKey($this->orderId)
            ->where('creator_id', $notifiable->getKey())
            ->where('payment_gateway', 'verify_et')
            ->where('status', 'manual_review')
            ->exists()
            && DirectPaymentVerification::query()
                ->whereKey($this->verificationId)
                ->where('payable_type', StorefrontOrder::class)
                ->where('payable_id', $this->orderId)
                ->where('status', 'manual_review')
                ->exists();
    }

    public function toTelegram(object $notifiable): TelegramMessage
    {
        $uuid = StorefrontOrder::query()->whereKey($this->orderId)
            ->where('creator_id', $notifiable->getKey())
            ->value('uuid');

        return TelegramMessage::create()
            ->normal()
            ->content(__('Buyer payment needs review'))
            ->line(__('A submitted payment could not be verified automatically.'))
            ->line(__('Open the order in Linket for its review status. A review request is not proof of payment.'))
            ->button(__('View order'), $uuid
                ? url('/dashboard/direct-billing?order='.$uuid)
                : url('/dashboard/direct-billing'));
    }
}
