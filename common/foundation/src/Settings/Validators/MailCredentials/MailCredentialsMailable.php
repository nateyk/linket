<?php

namespace Common\Settings\Validators\MailCredentials;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Queue\ShouldQueue;

class MailCredentialsMailable extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @return void
     */
    public function __construct()
    {
        //
    }

    /**
     * Build the message.
     *
     * @return $this
     */
    public function build()
    {
        $subject = config('app.name').' Mail Set Up Successfully!';
        $rendered = app(\App\Mail\ReactEmailRenderer::class)->render('message', [
            'preview' => $subject,
            'heading' => __('Mail set up successfully'),
            'lines' => [
                __('This email was sent to test your new mail credentials for :site.', [
                    'site' => config('app.name'),
                ]),
                __('Because you received this email, mail has been set up properly and this email can be ignored.'),
            ],
        ]);

        return $this
            ->subject($subject)
            ->html($rendered['html'])
            ->text('emails.react-email-plain')
            ->with(['body' => $rendered['text']]);
    }
}
