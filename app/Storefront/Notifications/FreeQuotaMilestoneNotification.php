<?php

namespace App\Storefront\Notifications;

use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\CreatorVerificationAllowance;
use App\Telegram\Support\TelegramNotificationChannels;
use App\Telegram\Support\TelegramNotificationPreferences;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\Telegram\TelegramMessage;

final class FreeQuotaMilestoneNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        public int $orderId,
        public int $consumed,
        public int $limit,
    ) {
        $this->onQueue('default');
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return TelegramNotificationChannels::append(
            $notifiable, [], TelegramNotificationPreferences::FREE_SALES_QUOTA,
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
                $notifiable, TelegramNotificationPreferences::FREE_SALES_QUOTA,
            )
            || app(CreatorVerificationAllowance::class)->isPro($notifiable)) {
            return false;
        }

        return StorefrontOrder::query()
            ->whereKey($this->orderId)
            ->where('creator_id', $notifiable->getKey())
            ->where('status', 'paid')
            ->where('payment_gateway', 'verify_et')
            ->where('monetization_policy', CreatorVerificationAllowance::FREE_POLICY)
            ->whereHas('directPaymentVerifications', fn ($query) => $query
                ->where('status', 'success')
                ->whereNotNull('verified_at')
                ->whereNotNull('canonical_transaction_identity'))
            ->exists();
    }

    public function toTelegram(object $notifiable): TelegramMessage
    {
        return TelegramMessage::create()
            ->normal()
            ->content($this->consumed >= $this->limit
                ? __('Free verified-sale allowance reached')
                : __('Your free verified-sale allowance is nearly used'))
            ->line(__(':used of :limit lifetime free verified sales used.', [
                'used' => $this->consumed,
                'limit' => $this->limit,
            ]))
            ->line(__('Upgrade to Linket Pro for unlimited verified sales.'))
            ->button(__('View Pro plans'), url('/account-settings/billing'));
    }
}
