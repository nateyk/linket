<?php

namespace Tests\Unit;

use App\Storefront\Controllers\CustomerOrderPortalController;
use App\Storefront\Jobs\SendDigitalProductOrderRecoveryLink;
use App\Storefront\Models\DigitalProductOrderRecovery;
use App\Storefront\Models\DigitalProductOrderRecoveryDelivery;
use App\Storefront\OrderRecoveryService;
use Illuminate\Http\Request;
use Tests\TestCase;

class OrderRecoveryTest extends TestCase
{
    public function testItReturnsTheSameGenericResponseForAnInvalidRecoveryRequest(): void
    {
        $response = (new CustomerOrderPortalController())->requestCode(Request::create('/api/v1/public/my-portal/request-code', 'POST', ['email' => 'not-an-email']));

        $this->assertSame(
            'If paid purchases match that email address, we will send a sign-in code shortly.',
            $response['message'],
        );
    }

    public function testRecoveryRecordsHideSensitiveEmailAndTokenValues(): void
    {
        $recovery = new DigitalProductOrderRecovery([
            'email' => 'buyer@example.test',
            'email_hash' => 'email-hash',
            'token_hash' => 'token-hash',
            'session_token_hash' => 'session-hash',
        ]);

        $this->assertSame('buyer@example.test', $recovery->email);
        $this->assertArrayNotHasKey('email', $recovery->toArray());
        $this->assertArrayNotHasKey('token_hash', $recovery->toArray());
        $this->assertArrayNotHasKey('session_token_hash', $recovery->toArray());

        $delivery = new DigitalProductOrderRecoveryDelivery(['email_hash' => 'email-hash']);
        $this->assertArrayNotHasKey('email_hash', $delivery->toArray());
    }

    public function testRecoveryEmailsUseTheMailQueueAndEmailValuesAreNormalized(): void
    {
        $job = new SendDigitalProductOrderRecoveryLink(1, 'secure-token', 1);
        $service = app(OrderRecoveryService::class);

        $this->assertSame('mail', $job->queue);
        $this->assertSame(3, $job->tries);
        $this->assertSame([60, 300, 900], $job->backoff);
        $this->assertSame($service->emailHash('buyer@example.test'), $service->emailHash(' BUYER@EXAMPLE.TEST '));
        $this->assertSame('b***@example.test', $service->maskEmail('buyer@example.test'));
    }
}
