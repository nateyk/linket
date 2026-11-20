<?php

namespace Common\Notifications;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailMessage;
use Common\Settings\Settings;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ContactPageMessage extends Notification
{
    use Queueable;

    public function __construct(public $message)
    {
    }

    /**
     * Get the notification's delivery channels.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable): ReactEmailMailable
    {
        $siteName = app(Settings::class)->get('branding.site_name');
        $userEmail = $this->message['email'];
        $subject = __('New message via :siteName contact page.', [
            'siteName' => $siteName,
        ]);

        return ReactEmailMessage::toNotifiable(
            $notifiable,
            $subject,
            $subject,
            __("New message via :siteName contact page from ':userEmail'", [
                'siteName' => $siteName,
                'userEmail' => $userEmail,
            ]),
            [(string) $this->message['message']],
        )
            ->from(config('mail.from.address'), config('mail.from.name'))
            ->replyTo($userEmail, $this->message['name']);
    }

    /**
     * Get the array representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return array
     */
    public function toArray($notifiable)
    {
        return [
                //
            ];
    }
}
