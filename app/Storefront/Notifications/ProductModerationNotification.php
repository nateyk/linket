<?php

namespace App\Storefront\Notifications;

use App\Storefront\Models\DigitalProduct;
use App\Telegram\Support\TelegramNotificationChannels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Telegram\TelegramMessage;

class ProductModerationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        public int $productId,
        public string $event,
        public ?string $reason = null,
    ) {
        $this->onQueue('default');
    }

    public function via(object $notifiable): array
    {
        return TelegramNotificationChannels::append(
            $notifiable,
            ['mail', 'database'],
        );
    }

    public function viaQueues(): array
    {
        return [
            'mail' => 'mail',
            'database' => 'default',
            'telegram' => 'default',
        ];
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        return DigitalProduct::whereKey($this->productId)->exists();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $product = $this->product();

        if (!$product) {
            return (new MailMessage())
                ->subject(__('Product update'))
                ->greeting(__('Hello, :name', ['name' => $notifiable->name]))
                ->line(__('Your product catalog changed. Open your dashboard for the latest.'))
                ->action(__('Open dashboard'), url('/dashboard/items'));
        }

        $mail = (new MailMessage())
            ->subject($this->subject())
            ->greeting(__('Hello, :name', ['name' => $notifiable->name]))
            ->line($this->summary($product));

        if ($this->includesReason() && $this->reason) {
            $mail->line(__('Reason: :reason', ['reason' => $this->reason]));
        }

        return $mail->action($this->actionLabel(), url($this->actionPath($product)));
    }

    public function toTelegram(object $notifiable): TelegramMessage
    {
        $product = $this->product();
        $message = TelegramMessage::create()->normal();

        if (! $product) {
            return $message
                ->content(__('Product update'))
                ->line(__('Your product catalog changed. Open Linket for the latest.'))
                ->button(__('Open dashboard'), url('/dashboard/items'));
        }

        $message
            ->content($this->subject())
            ->line($this->summary($product));

        if ($this->includesReason() && $this->reason) {
            $message->line(__('Reason: :reason', ['reason' => $this->reason]));
        }

        return $message->button(
            $this->actionLabel(),
            url($this->actionPath($product)),
        );
    }

    public function toDatabase(object $notifiable): array
    {
        $product = $this->product();

        if (!$product) {
            return [
                'mainAction' => ['label' => __('Open dashboard'), 'action' => url('/dashboard/items')],
                'lines' => [[
                    'content' => e(__('Your product catalog changed. Open your dashboard for the latest.')),
                    'type' => 'primary',
                ]],
            ];
        }

        $lines = [
            ['content' => e($this->summary($product)), 'type' => 'primary'],
        ];

        if ($this->includesReason() && $this->reason) {
            $lines[] = [
                'content' => e(__('Reason: :reason', ['reason' => $this->reason])),
                'type' => 'secondary',
            ];
        }

        return [
            'mainAction' => [
                'label' => $this->actionLabel(),
                'action' => url($this->actionPath($product)),
            ],
            'lines' => $lines,
        ];
    }

    private function product(): ?DigitalProduct
    {
        return DigitalProduct::query()->find($this->productId);
    }

    private function isRejection(): bool
    {
        return in_array($this->event, ['rejected', 'update_rejected', 'update_reverted'], true);
    }

    private function includesReason(): bool
    {
        return $this->isRejection() || $this->event === 're_review';
    }

    private function subject(): string
    {
        return match ($this->event) {
            'approved' => __('Your product is live'),
            'update_approved' => __('Your product update is live'),
            'rejected' => __('Your product needs changes'),
            'update_rejected' => __('Your product update needs changes'),
            'update_reverted' => __('Your product update was rejected'),
            're_review' => __('Your product was sent back for review'),
            default => __('Product update'),
        };
    }

    private function summary(DigitalProduct $product): string
    {
        return match ($this->event) {
            'approved' => __('Your product ":title" is now live.', ['title' => $product->title]),
            'update_approved' => __('Your update to ":title" is now live.', ['title' => $product->title]),
            'rejected' => __('Your product ":title" needs changes.', ['title' => $product->title]),
            'update_rejected' => __('Your update to ":title" needs changes.', ['title' => $product->title]),
            'update_reverted' => __('Your update to ":title" was rejected. Your previous version is still live.', ['title' => $product->title]),
            're_review' => __('Your product ":title" was taken off the storefront for another review.', ['title' => $product->title]),
            default => __('Your product ":title" was updated.', ['title' => $product->title]),
        };
    }

    private function actionLabel(): string
    {
        return $this->isRejection()
            ? __('Fix and resubmit')
            : __('Open product');
    }

    private function actionPath(DigitalProduct $product): string
    {
        return $product->isCourse()
            ? "/dashboard/items/{$product->id}/course"
            : "/dashboard/items/{$product->id}/edit";
    }
}
