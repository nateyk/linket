<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ClickQuotaExhausted extends Notification
{
    use Queueable;

    public function via(): array
    {
        return ['mail', 'database'];
    }

    public function toMail(): MailMessage
    {
        return (new MailMessage)
            ->line(__('You have exhausted your link click quota for this month.'))
            ->line(__('You can increase it by upgrading your plan.'))
            ->action('View plan options', url('/pricing'));
    }

    public function toArray(): array
    {
        return [
            'mainAction' => [
                'Label' => 'View plan options',
                'action' => url('/pricing'),
            ],
            'lines' => [
                [
                    'content' => __('You have exhausted your link click quota for this month.'),
                ],
                [
                    'content' => __('You can increase it by upgrading your plan.'),
                ],
            ],
        ];
    }
}
