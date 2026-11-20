<?php

namespace Tests\Unit\Mail;

use App\Conversations\Models\ConversationItem;
use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use App\Models\User;
use Common\Csv\CsvExport;
use Common\Csv\CsvExportReadyNotif;
use Common\Notifications\ContactPageMessage;
use Common\Settings\Settings;
use Livechat\Notifications\CustomerReceivedReplyWhileOffline;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RemainingReactEmailTest extends TestCase
{
    #[Test]
    public function offline_chat_reply_includes_the_message_and_return_link(): void
    {
        $this->stubRenderer();
        config(['app.name' => 'Linket']);

        $agent = new User(['name' => 'Sam']);
        $message = new ConversationItem([
            'type' => 'message',
            'body' => '<p>Hello from chat</p>',
            'conversation_id' => 8,
        ]);
        $customer = new User(['name' => 'Ada', 'email' => 'ada@example.test']);

        $mailable = (new CustomerReceivedReplyWhileOffline(
            $agent,
            $message,
            'https://shop.example/page',
        ))->toMail($customer);

        $this->assertInstanceOf(ReactEmailMailable::class, $mailable);
        $mailable->assertHasSubject('Sam replied to your chat on Linket');
        $mailable->assertSeeInHtml('Hello from chat');
        $mailable->assertSeeInHtml('https://shop.example/page?beConversationId=8');
        $mailable->assertHasTo('ada@example.test');
    }

    #[Test]
    public function contact_page_mail_replies_to_the_sender(): void
    {
        $this->stubRenderer();
        $this->app->instance(Settings::class, new class
        {
            public function get(string $key, mixed $default = null): string
            {
                return 'Linket';
            }
        });

        $mailable = (new ContactPageMessage([
            'name' => 'Ada',
            'email' => 'ada@example.test',
            'message' => 'I need help with my page.',
        ]))->toMail(new User(['email' => 'support@example.test']));

        $this->assertInstanceOf(ReactEmailMailable::class, $mailable);
        $mailable->assertHasSubject('New message via Linket contact page.');
        $mailable->assertSeeInHtml('I need help with my page.');
        $mailable->assertHasReplyTo('ada@example.test', 'Ada');
        $mailable->assertHasTo('support@example.test');
    }

    #[Test]
    public function csv_export_mail_includes_the_download_link(): void
    {
        $this->stubRenderer();
        $export = new class extends CsvExport
        {
            public function downloadLink(): string
            {
                return 'https://example.test/csv/download/15';
            }
        };

        $mailable = (new CsvExportReadyNotif($export, 'customers'))->toMail(
            new User(['name' => 'Ada', 'email' => 'ada@example.test']),
        );

        $this->assertInstanceOf(ReactEmailMailable::class, $mailable);
        $mailable->assertSeeInHtml('Customers');
        $mailable->assertSeeInHtml('https://example.test/csv/download/15');
        $mailable->assertHasTo('ada@example.test');
    }

    #[Test]
    public function payment_dispute_status_changed_notification_uses_react_email(): void
    {
        $this->stubRenderer();
        $notifiable = new User();
        $notifiable->name = 'Ada';
        $notifiable->email = 'ada@example.test';

        $notification = new class(1, 'pending', 'under_review', 'customer', 'Checking records') extends \App\Storefront\Notifications\PaymentDisputeStatusChangedNotification {
            protected function dispute(): ?\App\Storefront\Models\StorefrontPaymentDispute
            {
                return null;
            }
        };

        $mailable = $notification->toMail($notifiable);
        $this->assertInstanceOf(ReactEmailMailable::class, $mailable);
        $this->assertStringContainsString('Payment dispute', $mailable->subjectLine);
        $mailable->assertHasTo('ada@example.test');
    }

    private function stubRenderer(): void
    {
        $this->app->instance(ReactEmailRenderer::class, new class
        {
            public function render(string $template, array $props): array
            {
                $text = implode("\n", $props['lines']);

                return [
                    'html' => '<p>'.$text.' '.($props['actionUrl'] ?? '').'</p>',
                    'text' => $text,
                ];
            }
        });
    }
}
