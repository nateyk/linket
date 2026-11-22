<?php

namespace Tests\Feature;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use App\Storefront\Jobs\SendDigitalProductOrderRecoveryLink;
use App\Storefront\Models\DigitalProductOrderRecovery;
use App\Storefront\Models\DigitalProductOrderRecoveryDelivery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReactEmailPortalSignInTest extends TestCase
{
    #[Test]
    public function portal_recovery_email_uses_portal_sign_in_template(): void
    {
        Mail::fake();

        $this->app->instance(ReactEmailRenderer::class, new class
        {
            public function render(string $template, array $props): array
            {
                \PHPUnit\Framework\Assert::assertSame('portal-sign-in', $template);
                \PHPUnit\Framework\Assert::assertSame('482913', $props['otp'] ?? null);
                \PHPUnit\Framework\Assert::assertSame(10, $props['expiresInMinutes'] ?? null);

                return ['html' => '<p>482913</p>', 'text' => '482913'];
            }
        });

        $emailHash = hash('sha256', 'buyer@example.test');
        $recovery = DigitalProductOrderRecovery::query()->create([
            'uuid' => (string) Str::uuid(),
            'email' => 'buyer@example.test',
            'email_hash' => $emailHash,
            'token_hash' => hash('sha256', $emailHash.'.482913.'.Str::uuid()),
            'expires_at' => now()->addMinutes(10),
        ]);
        $delivery = DigitalProductOrderRecoveryDelivery::query()->create([
            'digital_product_order_recovery_id' => $recovery->id,
            'email_hash' => $emailHash,
            'masked_email' => 'b***@example.test',
            'event' => 'otp_email',
            'status' => 'queued',
        ]);

        (new SendDigitalProductOrderRecoveryLink($recovery->id, '482913', $delivery->id))->handle();

        Mail::assertSent(ReactEmailMailable::class, function (ReactEmailMailable $mail) {
            return $mail->hasTo('buyer@example.test')
                && str_contains((string) $mail->subject, 'sign-in code');
        });
    }
}
