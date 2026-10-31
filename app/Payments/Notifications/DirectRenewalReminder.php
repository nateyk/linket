<?php

namespace App\Payments\Notifications;

use App\Models\User;
use Common\Billing\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DirectRenewalReminder extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(public Subscription $subscription, public int $daysBefore)
    {
    }

    public function via(mixed $notifiable): array
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

    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage())
            ->subject(__('Your Linket Pro renewal is coming up'))
            ->greeting(__('Hello, :name', ['name' => $notifiable->name]))
            ->line(__('Your :plan subscription renews in :days day(s).', [
                'plan' => $this->subscription->product?->name ?? 'Pro',
                'days' => $this->daysBefore,
            ]))
            ->line(__('Pay by direct transfer in Billing to keep Pro active without interruption.'))
            ->action(__('Renew Pro'), url('/account-settings/billing'));
    }

    public function toArray(mixed $notifiable): array
    {
        return [
            'lines' => [[
                'content' => __('Your Pro subscription renews in :days day(s).', ['days' => $this->daysBefore]),
            ]],
            'buttonActions' => [[
                'label' => __('Renew Pro'),
                'action' => url('/account-settings/billing'),
            ]],
        ];
    }
}
