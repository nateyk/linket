<?php

namespace App\Mail;

final class ReactEmailMessage
{
    /**
     * @param  list<string>  $lines
     */
    public static function make(
        string $subject,
        string $preview,
        string $heading,
        array $lines,
        ?string $actionLabel = null,
        ?string $actionUrl = null,
        ?string $note = null,
    ): ReactEmailMailable {
        $rendered = app(ReactEmailRenderer::class)->render('message', [
            'preview' => $preview,
            'heading' => $heading,
            'lines' => array_values($lines),
            'actionLabel' => $actionLabel,
            'actionUrl' => $actionUrl,
            'note' => $note,
        ]);

        return new ReactEmailMailable(
            html: $rendered['html'],
            text: $rendered['text'],
            subjectLine: $subject,
        );
    }

    /**
     * @param  list<string>  $lines
     */
    public static function toNotifiable(
        object $notifiable,
        string $subject,
        string $preview,
        string $heading,
        array $lines,
        ?string $actionLabel = null,
        ?string $actionUrl = null,
        ?string $note = null,
    ): ReactEmailMailable {
        $mailable = self::make($subject, $preview, $heading, $lines, $actionLabel, $actionUrl, $note);

        $address = self::resolveRecipientAddress($notifiable);
        if ($address !== null) {
            $mailable->to($address);
        }

        return $mailable;
    }

    private static function resolveRecipientAddress(object $notifiable): ?string
    {
        if (method_exists($notifiable, 'routeNotificationFor')) {
            $address = $notifiable->routeNotificationFor('mail');
            if (is_string($address) && $address !== '') {
                return $address;
            }
        }

        $email = $notifiable->email ?? null;
        if (is_string($email) && $email !== '') {
            return $email;
        }

        return null;
    }
}
