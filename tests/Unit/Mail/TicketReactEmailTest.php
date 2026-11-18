<?php

namespace Tests\Unit\Mail;

use App\Conversations\Email\Mailables\TicketReceivedMailable;
use App\Conversations\Email\Mailables\TicketReplyMailable;
use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationItem;
use App\Mail\ReactEmailRenderer;
use App\Models\User;
use Illuminate\Support\Collection;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class TicketReactEmailTest extends TestCase
{
    #[Test]
    public function ticket_received_email_keeps_the_reply_reference(): void
    {
        $this->stubRenderer();
        $mailable = new TicketReceivedMailable(
            $this->conversation(),
            $this->reply('<p>Hello from the buyer</p>'),
        );

        $content = $mailable->content();

        $this->assertStringContainsString('Hello from the buyer', (string) $content->htmlString);
        $this->assertStringContainsString('|reference=reply-uuid|', (string) $content->htmlString);
    }

    #[Test]
    public function ticket_reply_email_keeps_the_reply_reference(): void
    {
        $this->stubRenderer();
        $conversation = $this->conversation();
        $conversation->setRelation('latestMessages', new Collection());
        $reply = $this->reply('<p>We fixed it</p>');
        $reply->setRelation('attachments', new Collection());

        $mailable = new TicketReplyMailable($conversation, $reply);
        $mailable->build();

        $this->assertSame('RE: Need help', $mailable->subject);
        $mailable->assertSeeInHtml('We fixed it');
        $mailable->assertSeeInHtml('|reference=reply-uuid|');
    }

    private function stubRenderer(): void
    {
        $this->app->instance(ReactEmailRenderer::class, new class
        {
            public function render(string $template, array $props): array
            {
                $text = implode("\n", $props['lines']).' '.$props['note'];

                return ['html' => '<p>'.$text.'</p>', 'text' => $text];
            }
        });
    }

    private function conversation(): Conversation
    {
        $conversation = new Conversation([
            'subject' => 'Need help',
        ]);
        $conversation->id = 42;
        $conversation->setRelation('user', new User([
            'name' => 'Ada',
            'email' => 'ada@example.test',
        ]));

        return $conversation;
    }

    private function reply(string $body): ConversationItem
    {
        $reply = new ConversationItem([
            'uuid' => 'reply-uuid',
            'body' => $body,
            'type' => 'message',
        ]);
        $reply->id = 7;

        return $reply;
    }
}
