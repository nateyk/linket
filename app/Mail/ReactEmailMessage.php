<?php

namespace App\Mail;

final class ReactEmailMessage
{
    /**
     * Build a ReactEmailMailable instance.
     *
     * Supports positional arguments:
     *   make($subject, $preview, $heading, $lines, $actionLabel = null, $actionUrl = null, $note = null)
     * Or named arguments matching those parameters.
     */
    public static function make(mixed ...$args): ReactEmailMailable
    {
        $params = self::parseMessageArguments($args);

        $rendered = app(ReactEmailRenderer::class)->render('message', [
            'preview' => $params['preview'],
            'heading' => $params['heading'],
            'lines' => $params['lines'],
            'actionLabel' => $params['actionLabel'],
            'actionUrl' => $params['actionUrl'],
            'note' => $params['note'],
        ]);

        return new ReactEmailMailable(
            html: $rendered['html'],
            text: $rendered['text'],
            subjectLine: $params['subject'],
        );
    }

    /**
     * Build a ReactEmailMailable instance addressed to the given notifiable.
     *
     * Supports positional arguments:
     *   toNotifiable($notifiable, $subject, $preview, $heading, $lines, $actionLabel = null, $actionUrl = null, $note = null)
     * Or named arguments matching those parameters.
     */
    public static function toNotifiable(object $notifiable, mixed ...$args): ReactEmailMailable
    {
        $mailable = self::make(...$args);

        $address = self::resolveRecipientAddress($notifiable);
        if ($address !== null) {
            $mailable->to($address);
        }

        return $mailable;
    }

    /**
     * @param  array<int|string, mixed>  $args
     * @return array{
     *   subject: string,
     *   preview: string,
     *   heading: string,
     *   lines: list<string>,
     *   actionLabel: ?string,
     *   actionUrl: ?string,
     *   note: ?string,
     * }
     */
    private static function parseMessageArguments(array $args): array
    {
        $subject = (string) ($args['subject'] ?? $args[0] ?? '');
        $preview = (string) ($args['preview'] ?? $args[1] ?? $subject);
        $heading = (string) ($args['heading'] ?? $args[2] ?? $subject);

        $rawLines = $args['lines'] ?? $args[3] ?? [];
        $lines = is_array($rawLines)
            ? array_values(array_map('strval', $rawLines))
            : [];

        $actionLabel = isset($args['actionLabel'])
            ? (string) $args['actionLabel']
            : (isset($args[4]) && is_string($args[4]) ? $args[4] : null);

        $actionUrl = isset($args['actionUrl'])
            ? (string) $args['actionUrl']
            : (isset($args[5]) && is_string($args[5]) ? $args[5] : null);

        $note = isset($args['note'])
            ? (string) $args['note']
            : (isset($args[6]) && is_string($args[6]) ? $args[6] : null);

        return [
            'subject' => $subject,
            'preview' => $preview,
            'heading' => $heading,
            'lines' => $lines,
            'actionLabel' => $actionLabel,
            'actionUrl' => $actionUrl,
            'note' => $note,
        ];
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
