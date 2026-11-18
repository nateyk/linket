<?php

namespace Tests\Unit\Mail;

use App\Conversations\Agent\Notifications\Ticketing\BaseConversationNotification;
use App\Conversations\Agent\Notifications\TriggerEmailNotification;
use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use App\Models\User;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ConversationReactEmailTest extends TestCase
{
    #[Test]
    public function agent_conversation_mail_uses_react_email(): void
    {
        $this->stubRenderer();
        $agent = new User(['name' => 'Ada', 'email' => 'ada@example.test']);
        $notification = new class extends BaseConversationNotification
        {
            protected function mainAction(): array
            {
                return ['label' => 'View conversation', 'action' => 'https://example.test/agent/conversations/1'];
            }

            protected function image(): ?string
            {
                return null;
            }

            protected function lines(User $notifiable): array
            {
                return ['**Ada** started a conversation', 'Subject: Help'];
            }
        };

        $mailable = $notification->toMail($agent);

        $this->assertInstanceOf(ReactEmailMailable::class, $mailable);
        $mailable->assertHasSubject('Ada started a conversation');
        $mailable->assertSeeInHtml('Subject: Help');
        $mailable->assertHasTo('ada@example.test');
    }

    #[Test]
    public function trigger_email_uses_react_email(): void
    {
        $this->stubRenderer();
        $customer = new User(['name' => 'Ada', 'email' => 'ada@example.test']);
        $notification = new TriggerEmailNotification([
            'subject' => 'We received your note',
            'message' => 'Thanks for writing in.',
            'conversation' => ['id' => 9],
        ]);

        $mailable = $notification->toMail($customer);

        $this->assertInstanceOf(ReactEmailMailable::class, $mailable);
        $mailable->assertHasSubject('We received your note');
        $mailable->assertSeeInHtml('Thanks for writing in.');
        $mailable->assertHasTo('ada@example.test');
    }

    private function stubRenderer(): void
    {
        $this->app->instance(ReactEmailRenderer::class, new class
        {
            public function render(string $template, array $props): array
            {
                return [
                    'html' => '<p>'.implode(' ', $props['lines']).'</p>',
                    'text' => implode("\n", $props['lines']),
                ];
            }
        });
    }
}
