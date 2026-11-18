<?php

namespace App\Auth\Notifications;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

final class WelcomeToLinketNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct()
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

    public function toMail(object $notifiable): ReactEmailMailable
    {
        $name = is_string($notifiable->name ?? null) && $notifiable->name !== ''
            ? $notifiable->name
            : __('there');
        $subject = __('Welcome to Linket');

        return ReactEmailMessage::toNotifiable(
            $notifiable,
            $subject,
            __('Your Linket account is ready'),
            $subject,
            [
                __('Hi :name, your Linket account is ready.', ['name' => $name]),
                __('Publish a page, list a product, and sell it from the same link.'),
            ],
            __('Open your dashboard'),
            url('/dashboard'),
        );
    }
}
