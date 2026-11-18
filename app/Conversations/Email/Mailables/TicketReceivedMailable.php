<?php

namespace App\Conversations\Email\Mailables;

use App\Conversations\Email\TicketEmailCopy;
use App\Conversations\Email\TicketReferenceHash;
use App\Mail\ReactEmailRenderer;
use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationItem;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;

class TicketReceivedMailable extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public string $reference;

    public function __construct(
        public Conversation $conversation,
        public ConversationItem $reply,
    ) {
        $this->reference = (new TicketReferenceHash())->makeEmbedForEmail(
            $reply,
        );
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            to: $this->conversation->user->routeNotificationForMail(),
            subject: __('We’ve received your enquiry: #:ticketId', [
                'ticketId' => $this->conversation->id,
            ]),
        );
    }

    public function headers(): Headers
    {
        // Add ticket reference hash as in Message-ID header
        $messageId = (new TicketReferenceHash())->makeMessageIdForEmail(
            $this->reply,
        );

        $textHeaders = [
            'X-Ticket-Reference' => $this->reply->uuid,
        ];

        return new Headers(messageId: $messageId, text: $textHeaders);
    }

    public function content(): Content
    {
        $subject = __('We’ve received your enquiry: #:ticketId', [
            'ticketId' => $this->conversation->id,
        ]);
        $body = TicketEmailCopy::plain($this->reply->body);
        $rendered = app(ReactEmailRenderer::class)->render('message', [
            'preview' => $subject,
            'heading' => $subject,
            'lines' => array_values(array_filter([
                __('Subject: :subject', ['subject' => $this->conversation->subject]),
                $body,
            ])),
            'actionLabel' => __('View ticket'),
            'actionUrl' => url('/hc/tickets/'.$this->conversation->id),
            'note' => $this->reference,
        ]);

        return new Content(
            htmlString: $rendered['html'],
            text: 'emails.react-email-plain',
            with: ['body' => $rendered['text']],
        );
    }
}
