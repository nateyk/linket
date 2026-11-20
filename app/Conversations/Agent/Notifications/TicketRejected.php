<?php

namespace App\Conversations\Agent\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
use Illuminate\Notifications\Notification;

class TicketRejected extends Notification implements ShouldQueue
{
    use Queueable;

    public function via(mixed $notifiable)
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable)
    {
        $siteName = config('app.name');
        $subject = __(':siteName support', ['siteName' => $siteName]);

        return ReactEmailMessage::toNotifiable(
            $notifiable,
            $subject,
            $subject,
            $subject,
            [__('Please create new tickets via our support site.')],
            __('Create Ticket'),
            url('/hc/tickets/new'),
        );
    }
}
