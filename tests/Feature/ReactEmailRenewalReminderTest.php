<?php

namespace Tests\Feature;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use App\Models\User;
use App\Payments\Notifications\DirectRenewalReminder;
use Common\Billing\Subscription;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReactEmailRenewalReminderTest extends TestCase
{
    #[Test]
    public function direct_renewal_reminder_uses_renewal_reminder_react_email(): void
    {
        $this->app->instance(ReactEmailRenderer::class, new class
        {
            public function render(string $template, array $props): array
            {
                \PHPUnit\Framework\Assert::assertSame('renewal-reminder', $template);
                \PHPUnit\Framework\Assert::assertSame(7, $props['daysBefore'] ?? null);
                \PHPUnit\Framework\Assert::assertSame('Pro', $props['planName'] ?? null);

                return ['html' => '<p>renewal</p>', 'text' => 'renewal'];
            }
        });

        $user = User::factory()->create([
            'name' => 'Creator',
        ]);
        $subscription = new Subscription();
        $notification = new DirectRenewalReminder($subscription, 7);
        $mailable = $notification->toMail($user);

        $this->assertInstanceOf(ReactEmailMailable::class, $mailable);
        $mailable->assertSeeInHtml('renewal');
        $mailable->assertHasTo($user->email);
    }
}
