<?php

namespace App\Payments\Notifications;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

final class ChapaSubscriptionStatusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(public string $event)
    {
        $this->onQueue('mail');
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

    public function toMail(object $notifiable): ReactEmailMailable
    {
        $name = is_string($notifiable->name ?? null) && $notifiable->name !== ''
            ? $notifiable->name
            : __('there');
        $subject = $this->event === 'expired'
            ? __('Your Linket Pro subscription has expired')
            : __('Your Linket Pro renewal is past due');
        $line = $this->event === 'expired'
            ? __('Your Pro subscription has expired. Renew from Billing to restore Pro features.')
            : __('Your Pro renewal date has passed. Pay in Billing to keep Pro active.');

        return ReactEmailMessage::toNotifiable(
            $notifiable,
            $subject,
            $subject,
            __('Hello, :name', ['name' => $name]),
            [$line],
            __('Open Billing'),
            url('/billing'),
        );
    }

    public function toArray(object $notifiable): array
    {
        $subject = $this->event === 'expired'
            ? __('Your Linket Pro subscription has expired')
            : __('Your Linket Pro renewal is past due');

        return [
            'lines' => [
                ['content' => $subject],
            ],
            'buttonActions' => [
                [
                    'label' => __('Open Billing'),
                    'action' => url('/billing'),
                ],
            ],
        ];
    }
}
