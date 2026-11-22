<?php

namespace App\Mail;

use Illuminate\Support\Facades\Mail;

final class OpsAlertMail
{
    public static function send(string $email, string $subject, string $body, ?string $note = null): void
    {
        $siteName = (string) (settings('branding.site_name') ?: config('app.name', 'Linket'));
        $rendered = app(ReactEmailRenderer::class)->render('ops-alert', [
            'preview' => $subject,
            'heading' => $subject,
            'body' => $body,
            'note' => $note,
            'siteName' => $siteName,
        ]);

        Mail::to($email)->send(new ReactEmailMailable(
            html: $rendered['html'],
            text: $rendered['text'],
            subjectLine: $subject,
        ));
    }
}
