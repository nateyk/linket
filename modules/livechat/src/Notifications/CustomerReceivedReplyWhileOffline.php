<?php

namespace Livechat\Notifications;

use App\Conversations\Email\TicketEmailCopy;
use App\Conversations\Models\ConversationItem;
use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class CustomerReceivedReplyWhileOffline extends Notification implements
    ShouldQueue
{
    use Queueable;

    public function __construct(
        public User $agent,
        public ConversationItem $message,
        public string $lastUrl,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $customer): ReactEmailMailable
    {
        $siteName = config('app.name');
        $separator = parse_url($this->lastUrl, PHP_URL_QUERY) ? '&' : '?';
        $url = $this->lastUrl.$separator.'beConversationId='.$this->message->conversation_id;
        $subject = __(':agent replied to your chat on :siteName', [
            'agent' => $this->agent->name,
            'siteName' => $siteName,
        ]);
        $name = is_string($customer->name ?? null) && $customer->name !== ''
            ? $customer->name
            : __('there');

        return ReactEmailMessage::toNotifiable(
            $customer,
            $subject,
            $subject,
            __('Hello, :name', ['name' => $name]),
            array_values(array_filter([
                $subject,
                TicketEmailCopy::plain($this->message->body),
            ])),
            __('View chat'),
            $url,
        );
    }

    public function toArray(object $notifiable): array
    {
        return [];
    }
}
