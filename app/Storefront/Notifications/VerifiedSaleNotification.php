<?php

namespace App\Storefront\Notifications;

use App\Storefront\Models\StorefrontOrder;
use App\Telegram\Support\TelegramNotificationChannels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\Telegram\TelegramMessage;

final class VerifiedSaleNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(public int $orderId)
    {
        $this->onQueue('default');
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return TelegramNotificationChannels::append($notifiable, []);
    }

    public function viaQueues(): array
    {
        return ['telegram' => 'default'];
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        return StorefrontOrder::query()
            ->whereKey($this->orderId)
            ->where('creator_id', $notifiable->getKey())
            ->where('status', 'paid')
            ->where('payment_gateway', 'verify_et')
            ->exists();
    }

    public function toTelegram(object $notifiable): TelegramMessage
    {
        $order = $this->order();
        $message = TelegramMessage::create()->normal();

        if (! $order) {
            return $message
                ->content(__('New verified sale'))
                ->line(__('A verified sale was completed.'))
                ->button(__('Open orders'), url('/dashboard/direct-billing'));
        }

        $message
            ->content(__('New verified sale'))
            ->line($order->product?->title ?? __('Digital product'))
            ->line(__(':amount :currency verified', [
                'amount' => number_format($order->gross_amount_cents / 100, 2),
                'currency' => strtoupper($order->currency),
            ]));

        $bankCode = $order->latestDirectPaymentVerification?->bank_code;
        if ($bankCode) {
            $message->line(__('Payment method: :method', [
                'method' => strtoupper(str_replace('_', ' ', $bankCode)),
            ]));
        }

        return $message->button(
            __('View order'),
            url("/dashboard/direct-billing?order={$order->uuid}"),
        );
    }

    private function order(): ?StorefrontOrder
    {
        return StorefrontOrder::query()
            ->with(['product', 'latestDirectPaymentVerification'])
            ->find($this->orderId);
    }
}
