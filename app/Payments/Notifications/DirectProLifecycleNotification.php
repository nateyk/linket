<?php

namespace App\Payments\Notifications;

use App\Payments\Models\ProSubscriptionPayment;
use App\Telegram\Support\TelegramNotificationChannels;
use App\Telegram\Support\TelegramNotificationPreferences;
use Common\Billing\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\Telegram\TelegramMessage;

final class DirectProLifecycleNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        public int $subscriptionId,
        public string $event,
        public ?int $paymentId = null,
    ) {
        $this->onQueue('default');
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return TelegramNotificationChannels::append(
            $notifiable, [], TelegramNotificationPreferences::PRO_BILLING,
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
                $notifiable, TelegramNotificationPreferences::PRO_BILLING,
            )) {
            return false;
        }

        $subscription = Subscription::query()
            ->whereKey($this->subscriptionId)
            ->where('user_id', $notifiable->getKey())
            ->where('gateway_name', 'verify_et')
            ->first();

        if (! $subscription) {
            return false;
        }

        if (in_array($this->event, ['activated', 'renewed'], true)) {
            return $this->paymentId !== null
                && $subscription->gateway_status === 'active'
                && $subscription->ends_at === null
                && ProSubscriptionPayment::query()
                    ->whereKey($this->paymentId)
                    ->where('creator_id', $notifiable->getKey())
                    ->where('status', 'paid')
                    ->exists();
        }

        return match ($this->event) {
            'past_due' => $subscription->gateway_status === 'past_due'
                && $subscription->ends_at === null
                && $subscription->renews_at?->isPast() === true,
            'expired' => $subscription->gateway_status === 'expired'
                && $subscription->ends_at !== null,
            default => false,
        };
    }

    public function toTelegram(object $notifiable): TelegramMessage
    {
        $heading = match ($this->event) {
            'activated' => __('Linket Pro activated'),
            'renewed' => __('Linket Pro renewed'),
            'past_due' => __('Linket Pro renewal overdue'),
            'expired' => __('Linket Pro expired'),
            default => __('Linket Pro status updated'),
        };

        $detail = match ($this->event) {
            'activated' => __('Your verified payment activated your Pro subscription.'),
            'renewed' => __('Your verified renewal payment extended your Pro subscription.'),
            'past_due' => __('Your Pro renewal date has passed. Check Billing to avoid interruption.'),
            'expired' => __('Your Pro subscription has expired. Renew from Linket Billing to restore Pro features.'),
            default => __('Open Billing to review your subscription status.'),
        };

        return TelegramMessage::create()
            ->normal()
            ->content($heading)
            ->line($detail)
            ->button(__('View Billing'), url('/account-settings/billing'));
    }
}
