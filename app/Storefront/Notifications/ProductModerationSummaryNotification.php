<?php

namespace App\Storefront\Notifications;

use App\Telegram\Support\TelegramNotificationChannels;
use App\Telegram\Support\TelegramNotificationPreferences;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use NotificationChannels\Telegram\TelegramMessage;

class ProductModerationSummaryNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    /**
     * @param  array<int, string>  $titles
     */
    public function __construct(
        public string $event,
        public array $titles,
        public ?string $reason = null,
    ) {
        $this->onQueue('default');
    }

    public function via(object $notifiable): array
    {
        return TelegramNotificationChannels::append(
            $notifiable,
            ['mail', 'database'],
            TelegramNotificationPreferences::PRODUCT_MODERATION,
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
        return count($this->titles) > 0;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage())
            ->subject($this->subject())
            ->greeting(__('Hello, :name', ['name' => $notifiable->name]))
            ->line($this->summary());

        if ($this->showsReason() && $this->reason) {
            $mail->line(__('Reason: :reason', ['reason' => $this->reason]));
        }

        return $mail->action($this->actionLabel(), url('/dashboard/items'));
    }

    public function toTelegram(object $notifiable): TelegramMessage
    {
        $message = TelegramMessage::create()
            ->normal()
            ->content($this->subject())
            ->line($this->summary());

        if ($this->showsReason() && $this->reason) {
            $message->line(__('Reason: :reason', ['reason' => $this->reason]));
        }

        return $message->button(
            $this->actionLabel(),
            url('/dashboard/items'),
        );
    }

    public function toDatabase(object $notifiable): array
    {
        $lines = [
            ['content' => e($this->summary()), 'type' => 'primary'],
        ];

        if ($this->showsReason() && $this->reason) {
            $lines[] = [
                'content' => e(__('Reason: :reason', ['reason' => $this->reason])),
                'type' => 'secondary',
            ];
        }

        return [
            'mainAction' => [
                'label' => $this->actionLabel(),
                'action' => url('/dashboard/items'),
            ],
            'lines' => $lines,
        ];
    }

    private function isRejection(): bool
    {
        return $this->event === 'rejected';
    }

    private function showsReason(): bool
    {
        return $this->isRejection() || $this->event === 'update_reverted';
    }

    private function subject(): string
    {
        if ($this->event === 'update_reverted') {
            return __('Some of your updates were rejected');
        }

        return $this->isRejection()
            ? __('Some of your products need changes')
            : __('Your products were approved');
    }

    private function actionLabel(): string
    {
        return $this->isRejection()
            ? __('Review your products')
            : __('Open your products');
    }

    private function summary(): string
    {
        $count = count($this->titles);
        $names = implode(', ', array_slice($this->titles, 0, 5));

        if ($count > 5) {
            $names .= ' ' . __('and :count more', ['count' => $count - 5]);
        }

        if ($this->isRejection()) {
            return $count === 1
                ? __('Your product ":name" needs changes.', ['name' => $names])
                : __('Your :count products need changes: :names', ['count' => $count, 'names' => $names]);
        }

        if ($this->event === 'update_reverted') {
            return $count === 1
                ? __('Your update to ":name" was rejected. Your previous version is still live.', ['name' => $names])
                : __('Your :count updates were rejected. Your previous versions are still live: :names', ['count' => $count, 'names' => $names]);
        }

        return $count === 1
            ? __('Your product ":name" is now live.', ['name' => $names])
            : __('Your :count products are now live: :names', ['count' => $count, 'names' => $names]);
    }
}
