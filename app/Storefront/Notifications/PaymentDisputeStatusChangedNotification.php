<?php

namespace App\Storefront\Notifications;

use App\Storefront\Models\StorefrontPaymentDispute;
use App\Storefront\Services\CreatePaymentDispute;
use App\Telegram\Support\TelegramNotificationChannels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Telegram\TelegramMessage;

class PaymentDisputeStatusChangedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        public int $disputeId,
        public string $fromStatus,
        public string $toStatus,
        public string $audience,
        public ?string $note = null,
    ) {
        $this->onQueue('default');
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        $channels = ['mail', 'database'];

        return $this->audience === 'creator'
            ? TelegramNotificationChannels::append($notifiable, $channels)
            : $channels;
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
        return StorefrontPaymentDispute::query()->whereKey($this->disputeId)->exists();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $dispute = $this->dispute();
        $label = $dispute
            ? (CreatePaymentDispute::REASON_LABELS[$dispute->reason] ?? $dispute->reason)
            : __('Payment dispute');

        return (new MailMessage())
            ->subject($this->subject($label))
            ->greeting(__('Hello, :name', ['name' => $notifiable->name ?? __('there')]))
            ->line($this->summary($label))
            ->when($this->note, fn (MailMessage $mail) => $mail->line(__('Note: :note', ['note' => $this->note])))
            ->action(__('Open Linket'), url($this->actionPath($dispute)));
    }

    public function toTelegram(object $notifiable): TelegramMessage
    {
        $dispute = $this->dispute();
        $label = $dispute
            ? (CreatePaymentDispute::REASON_LABELS[$dispute->reason] ?? $dispute->reason)
            : __('Payment dispute');

        return TelegramMessage::create()
            ->normal()
            ->content($this->subject($label))
            ->line($this->summary($label))
            ->button(__('Open Linket'), url($this->actionPath($dispute)));
    }

    public function toDatabase(object $notifiable): array
    {
        $dispute = $this->dispute();
        $label = $dispute
            ? (CreatePaymentDispute::REASON_LABELS[$dispute->reason] ?? $dispute->reason)
            : __('Payment dispute');

        $lines = [
            ['content' => e($this->summary($label)), 'type' => 'primary'],
        ];

        if ($this->note) {
            $lines[] = [
                'content' => e(__('Note: :note', ['note' => $this->note])),
                'type' => 'secondary',
            ];
        }

        return [
            'mainAction' => [
                'label' => __('Open Linket'),
                'action' => url($this->actionPath($dispute)),
            ],
            'lines' => $lines,
        ];
    }

    private function dispute(): ?StorefrontPaymentDispute
    {
        return StorefrontPaymentDispute::query()
            ->with('order')
            ->find($this->disputeId);
    }

    private function subject(string $label): string
    {
        return match ($this->toStatus) {
            StorefrontPaymentDispute::STATUS_OPEN => __('New payment dispute: :label', ['label' => $label]),
            StorefrontPaymentDispute::STATUS_INVESTIGATING => __('Dispute under investigation: :label', ['label' => $label]),
            StorefrontPaymentDispute::STATUS_RESOLVED => __('Dispute resolved: :label', ['label' => $label]),
            StorefrontPaymentDispute::STATUS_CLOSED => __('Dispute closed: :label', ['label' => $label]),
            default => __('Payment dispute update: :label', ['label' => $label]),
        };
    }

    private function summary(string $label): string
    {
        return match ($this->toStatus) {
            StorefrontPaymentDispute::STATUS_OPEN => __('A payment dispute was opened for :label.', ['label' => $label]),
            StorefrontPaymentDispute::STATUS_INVESTIGATING => __('The dispute for :label is now being investigated.', ['label' => $label]),
            StorefrontPaymentDispute::STATUS_RESOLVED => __('The dispute for :label was marked resolved.', ['label' => $label]),
            StorefrontPaymentDispute::STATUS_CLOSED => __('The dispute for :label was closed.', ['label' => $label]),
            default => __('The dispute for :label was updated.', ['label' => $label]),
        };
    }

    private function actionPath(?StorefrontPaymentDispute $dispute): string
    {
        return match ($this->audience) {
            'creator' => $dispute?->order
                ? "/dashboard/direct-billing?order={$dispute->order->uuid}"
                : '/dashboard/direct-billing',
            'admin' => '/admin/tickets',
            default => '/my-portal/orders',
        };
    }
}
