<?php

namespace App\Storefront\Notifications;

use App\Storefront\Models\DigitalProduct;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

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
        return ['mail', 'database'];
    }

    public function viaQueues(): array
    {
        return [
            'mail' => 'mail',
            'database' => 'default',
        ];
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        return DigitalProduct::whereKey($this->productId)->exists();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $product = $this->product();

        $mail = (new MailMessage())
            ->subject($this->subject())
            ->greeting(__('Hello, :name', ['name' => $notifiable->name]))
            ->line($this->summary($product));

        if ($this->isRejection() && $this->reason) {
            $mail->line(__('Reason: :reason', ['reason' => $this->reason]));
        }

        return $mail->action($this->actionLabel(), url($this->actionPath($product)));
    }

    public function toDatabase(object $notifiable): array
    {
        $product = $this->product();

        $lines = [
            ['content' => e($this->summary($product)), 'type' => 'primary'],
        ];

        if ($this->isRejection() && $this->reason) {
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

    private function product(): DigitalProduct
    {
        return DigitalProduct::query()->with('cover')->findOrFail($this->productId);
    }

    private function isRejection(): bool
    {
        return in_array($this->event, ['rejected', 'update_rejected'], true);
    }

    private function subject(): string
    {
        return match ($this->event) {
            'approved' => __('Your product is live'),
            'update_approved' => __('Your product update is live'),
            'rejected' => __('Your product needs changes'),
            'update_rejected' => __('Your product update needs changes'),
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
            ? "/dashboard/my-products/{$product->id}/course"
            : "/dashboard/my-products/{$product->id}/edit";
    }
}
