<?php

namespace Common\Auth\Notifications;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use Illuminate\Notifications\Notification;

class VerifyEmailWithOtp extends Notification
{
    public function __construct(public string $otp)
    {
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable): ReactEmailMailable
    {
        $rendered = app(ReactEmailRenderer::class)->render('verify-email', [
            'otp' => $this->otp,
            'expiresInMinutes' => 30,
            'accountSettingsUrl' => url('account-settings'),
            'siteName' => config('app.name'),
        ]);

        return (new ReactEmailMailable(
            html: $rendered['html'],
            text: $rendered['text'],
            subjectLine: __('Your :site security code is :code', [
                'site' => config('app.name'),
                'code' => $this->otp,
            ]),
        ))->to($notifiable->routeNotificationFor('mail', $this));
    }
}