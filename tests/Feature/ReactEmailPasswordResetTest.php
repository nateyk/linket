<?php

namespace Tests\Feature;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use App\Models\User;
use App\Notifications\LinketResetPasswordNotification;
use Illuminate\Support\Facades\Notification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReactEmailPasswordResetTest extends TestCase
{
    #[Test]
    public function password_reset_uses_linket_react_email_notification(): void
    {
        Notification::fake();

        $this->app->instance(ReactEmailRenderer::class, new class
        {
            public function render(string $template, array $props): array
            {
                \PHPUnit\Framework\Assert::assertSame('password-reset', $template);

                return ['html' => '<p>Reset</p>', 'text' => 'Reset'];
            }
        });

        $user = User::factory()->make(['name' => 'Ada']);
        $user->sendPasswordResetNotification('demo-token');

        Notification::assertSentTo(
            $user,
            LinketResetPasswordNotification::class,
            function (LinketResetPasswordNotification $notification) use ($user) {
                $mailable = $notification->toMail($user);

                if (! $mailable instanceof ReactEmailMailable) {
                    return false;
                }

                $mailable->assertSeeInHtml('Reset');

                return true;
            },
        );
    }
}