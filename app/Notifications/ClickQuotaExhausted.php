<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
use Illuminate\Notifications\Notification;

class ClickQuotaExhausted extends Notification
{
    use Queueable;

    public function via(): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): ReactEmailMailable
    {
        $subject = __('You have exhausted your link click quota for this month.');

        return ReactEmailMessage::toNotifiable(
            $notifiable,
            $subject,
            $subject,
            $subject,
            [__('You can increase it by upgrading your plan.')],
            __('View plan options'),
            url('/pricing'),
        );
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
