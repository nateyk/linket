<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

final class ReactEmailMailable extends Mailable
{
    use Queueable, SerializesModels;

    private string $renderedHtml;

    private string $renderedText;

    public function __construct(
        string $html,
        string $text,
        public string $subjectLine,
    ) {
        $this->renderedHtml = $html;
        $this->renderedText = $text;
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->renderedHtml,
            text: 'emails.react-email-plain',
            with: ['body' => $this->renderedText],
        );
    }
}