<?php

namespace App\Storefront\Notifications;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

final class ChapaCreatorSaleNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(public int $orderId)
    {
        $this->onQueue('mail');
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function viaQueues(): array
    {
        return ['mail' => 'mail'];
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        return $this->order($notifiable) !== null;
    }

    public function toMail(object $notifiable): ReactEmailMailable
    {
        $order = $this->order($notifiable);
        $name = is_string($notifiable->name ?? null) && $notifiable->name !== ''
            ? $notifiable->name
            : __('there');
        $product = $order?->product?->title ?? __('your product');
        $amount = $order
            ? number_format($order->gross_amount_cents / 100, 2).' '.strtoupper((string) $order->currency)
            : '';
        $subject = __('You made a sale on Linket');

        return ReactEmailMessage::toNotifiable(
            $notifiable,
            $subject,
            $subject,
            __('Hello, :name', ['name' => $name]),
            [
                __('A buyer paid for :product.', ['product' => $product]),
                __('Amount: :amount', ['amount' => $amount]),
                __('Order: :order', ['order' => $order?->uuid ?? '']),
            ],
            __('View orders'),
            url('/dashboard/direct-billing'),
        );
    }

    private function order(object $notifiable): ?StorefrontOrder
    {
        return StorefrontOrder::query()
            ->with('product')
            ->whereKey($this->orderId)
            ->where('creator_id', $notifiable->getKey())
            ->where('status', 'paid')
            ->where('payment_gateway', 'chapa')
            ->first();
    }
}
