<?php

namespace Tests\Unit\Mail;

use App\Mail\ReactEmailRenderer;
use App\Models\User;
use App\Payments\Notifications\ChapaProActivatedNotification;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ChapaProActivatedNotificationTest extends TestCase
{
    #[Test]
    public function activated_mail_names_the_plan_and_renewal(): void
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
        $mailable = (new ChapaProActivatedNotification('activated', 'Pro', 'December 1'))->toMail($user);

        $mailable->assertHasSubject('Your Linket Pro subscription is active');
        $mailable->assertSeeInHtml('activated Linket Pro');
        $mailable->assertSeeInHtml('December 1');
        $mailable->assertHasTo('ada@example.test');
    }

    #[Test]
    public function renewed_mail_uses_the_renewal_subject(): void
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
        $mailable = (new ChapaProActivatedNotification('renewed', 'Pro', 'January 1'))->toMail($user);

        $mailable->assertHasSubject('Your Linket Pro subscription was renewed');
        $mailable->assertSeeInHtml('renewed Linket Pro');
    }
}
