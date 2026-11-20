<?php

namespace App\Conversations\Agent\Notifications;

use App\Core\UrlGenerator;
use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
use Common\Core\Prerender\Actions\ReplacePlaceholders;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/** @package App\Conversations\Agent\Notifications */
class TriggerEmailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public string $message;

    public function __construct(public $data)
    {
        $this->message = app(ReplacePlaceholders::class)->execute(
            $data['message'],
            $data,
        );
    }

    public function via(mixed $notifiable)
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): ReactEmailMailable
    {
        $url = app(UrlGenerator::class)->conversation(
            $this->data['conversation'],
        );
        $subject = (string) $this->data['subject'];

        return ReactEmailMessage::toNotifiable(
            $notifiable,
            $subject,
            $subject,
            $subject,
            [trim(strip_tags($this->message))],
            __('View conversation'),
            $url,
        );
    }
}
