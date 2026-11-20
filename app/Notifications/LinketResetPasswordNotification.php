<?php

namespace App\Notifications;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use Illuminate\Notifications\Notification;

final class LinketResetPasswordNotification extends Notification
{
    /** Reset link validity in minutes (Laravel default when no `auth.passwords.*.expire` override). */
    private const EXPIRES_IN_MINUTES = 60;

    public function __construct(public string $token)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): ReactEmailMailable
    {
        $resetUrl = url('password/reset/'.$this->token);
        $name = is_string($notifiable->name ?? null) && $notifiable->name !== ''
            ? $notifiable->name
            : __('there');

        $rendered = app(ReactEmailRenderer::class)->render('password-reset', [
            'name' => $name,
            'resetUrl' => $resetUrl,
            'expiresInMinutes' => self::EXPIRES_IN_MINUTES,
            'siteName' => config('app.name'),
        ]);

        return (new ReactEmailMailable(
            html: $rendered['html'],
            text: $rendered['text'],
            subjectLine: __('Reset Password Notification'),
        ))->to($notifiable->routeNotificationFor('mail', $this));
    }
}