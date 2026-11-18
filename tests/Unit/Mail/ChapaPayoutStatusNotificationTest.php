<?php

namespace Tests\Unit\Mail;

use App\Mail\ReactEmailRenderer;
use App\Models\User;
use App\Storefront\Notifications\ChapaPayoutStatusNotification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ChapaPayoutStatusNotificationTest extends TestCase
{
    #[Test]
    public function sent_mail_names_the_amount_and_reference(): void
    {
        $this->stubRenderer();

        $user = new User(['name' => 'Ada', 'email' => 'ada@example.test']);
        $mailable = (new ChapaPayoutStatusNotification('sent', '500.00 ETB', 'lk-po-1'))->toMail($user);

        $mailable->assertHasSubject('Your Linket payout was sent');
        $mailable->assertSeeInHtml('500.00 ETB');
        $mailable->assertSeeInHtml('lk-po-1');
        $mailable->assertHasTo('ada@example.test');
    }

    #[Test]
    public function failed_mail_includes_the_reason(): void
    {
        $this->stubRenderer();

        $user = new User(['name' => 'Ada', 'email' => 'ada@example.test']);
        $mailable = (new ChapaPayoutStatusNotification(
            'failed',
            '500.00 ETB',
            'lk-po-2',
            'Transfer failed at Chapa settlement.',
        ))->toMail($user);

        $mailable->assertHasSubject('Your Linket payout could not be sent');
        $mailable->assertSeeInHtml('could not send 500.00 ETB');
        $mailable->assertSeeInHtml('Transfer failed at Chapa settlement.');
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
