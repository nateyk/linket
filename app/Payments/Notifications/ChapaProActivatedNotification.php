<?php

namespace App\Payments\Notifications;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

final class ChapaProActivatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        public string $event,
        public string $planName,
        public string $renewsAtLabel,
    ) {
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

    public function toMail(object $notifiable): ReactEmailMailable
    {
        $name = is_string($notifiable->name ?? null) && $notifiable->name !== ''
            ? $notifiable->name
            : __('there');
        $subject = $this->event === 'renewed'
            ? __('Your Linket Pro subscription was renewed')
            : __('Your Linket Pro subscription is active');
        $line = $this->event === 'renewed'
            ? __('Your :plan payment renewed Linket Pro.', ['plan' => $this->planName])
            : __('Your :plan payment activated Linket Pro.', ['plan' => $this->planName]);

        return ReactEmailMessage::toNotifiable(
            $notifiable,
            $subject,
            $subject,
            __('Hello, :name', ['name' => $name]),
            [
                $line,
                __('Next renewal: :date', ['date' => $this->renewsAtLabel]),
            ],
            __('Open Billing'),
            url('/billing'),
        );
    }
}
