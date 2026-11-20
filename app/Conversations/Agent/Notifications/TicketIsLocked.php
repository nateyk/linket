<?php

namespace App\Conversations\Agent\Notifications;

use App\Conversations\Models\Conversation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
use Illuminate\Notifications\Notification;

class TicketIsLocked extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Conversation $conversation) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): ReactEmailMailable
    {
        $subject = __('Ticket is locked');

        return ReactEmailMessage::toNotifiable(
            $notifiable,
            $subject,
            $subject,
            $subject,
            [
                __(
                    "Ticket you replied to ({$this->conversation->id}) was locked due to inactivity. Please create a new ticket on our support site.",
                ),
            ],
            __('Create Ticket'),
            url('/hc/tickets/new'),
        );
    }
}
