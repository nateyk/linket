<?php

namespace Tests\Unit\Mail;

use App\Auth\Listeners\SendWelcomeEmail;
use App\Auth\Notifications\WelcomeToLinketNotification;
use App\Mail\ReactEmailRenderer;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class WelcomeToLinketNotificationTest extends TestCase
{
    #[Test]
    public function welcome_mail_uses_the_account_ready_copy(): void
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

        $user = new User(['name' => 'Ada', 'email' => 'ada@example.test']);
        $mailable = (new WelcomeToLinketNotification())->toMail($user);

        $mailable->assertHasSubject('Welcome to Linket');
        $mailable->assertSeeInHtml('Ada, your Linket account is ready');
        $mailable->assertSeeInHtml('Publish a page, list a product, and sell it from the same link.');
        $mailable->assertHasTo('ada@example.test');
    }

    #[Test]
    public function registering_sends_the_welcome_email(): void
    {
        Notification::fake();
        $user = new User(['name' => 'Ada', 'email' => 'ada@example.test']);
        $user->id = 4;

        (new SendWelcomeEmail())->handle(new Registered($user));

        Notification::assertSentTo($user, WelcomeToLinketNotification::class);
    }
}
