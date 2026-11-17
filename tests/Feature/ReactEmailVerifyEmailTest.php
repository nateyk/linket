<?php

namespace Tests\Feature;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use Common\Auth\Notifications\VerifyEmailWithOtp;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReactEmailVerifyEmailTest extends TestCase
{
    #[Test]
    public function verify_email_notification_uses_react_email_mailable(): void
    {
        $this->app->instance(ReactEmailRenderer::class, new class
        {
            public function render(string $template, array $props): array
            {
                \PHPUnit\Framework\Assert::assertSame('verify-email', $template);
                \PHPUnit\Framework\Assert::assertSame('123456', $props['otp'] ?? null);
                \PHPUnit\Framework\Assert::assertSame(30, $props['expiresInMinutes'] ?? null);

                return ['html' => '<p>123456</p>', 'text' => '123456'];
            }
        });

        $notifiable = new class
        {
            public string $email = 'user@example.test';

            public string $name = 'Test User';
        };

        $notification = new VerifyEmailWithOtp('123456');
        $mailable = $notification->toMail($notifiable);

        $this->assertInstanceOf(ReactEmailMailable::class, $mailable);
        $mailable->assertSeeInHtml('123456');
    }
}