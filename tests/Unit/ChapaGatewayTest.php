<?php

namespace Tests\Unit;

use App\Payments\ChapaGateway;
use App\Payments\PaymentVerificationException;
use Common\Settings\Settings;
use Illuminate\Http\Request;
use Tests\TestCase;

class ChapaGatewayTest extends TestCase
{
    public function testItValidatesChapaWebhookSignatureAgainstTheRawPayload(): void
    {
        config([
            'services.chapa.secret' => 'CHAPA-SECK-test',
            'services.chapa.webhook_secret' => 'webhook-secret',
        ]);
        $payload = json_encode(['tx_ref' => 'linket_123']);
        $request = Request::create('/billing/chapa/webhook', 'POST', [], [], [], [], $payload);
        $request->headers->set('x-chapa-signature', hash_hmac('sha256', $payload, 'webhook-secret'));

        $this->assertTrue(app(ChapaGateway::class)->signatureIsValid($request));

        $request->headers->set('x-chapa-signature', 'invalid');
        $this->assertFalse(app(ChapaGateway::class)->signatureIsValid($request));
    }

    public function testItReadsChapaVerificationDataAndSuccessState(): void
    {
        $gateway = app(ChapaGateway::class);
        $data = $gateway->verifiedData([
            'data' => ['status' => 'success', 'amount' => '125.00', 'currency' => 'ETB'],
        ]);

        $this->assertSame('125.00', $data['amount']);
        $this->assertTrue($gateway->isSuccessful($data));
    }

    public function testItPrefersTheEncryptedSettingForWebhookValidation(): void
    {
        config(['services.chapa.webhook_secret' => 'environment-secret']);
        app(Settings::class)->set('billing.chapa.webhook_secret', 'stored-secret');

        $payload = json_encode(['tx_ref' => 'linket_456']);
        $request = Request::create('/billing/chapa/webhook', 'POST', [], [], [], [], $payload);
        $request->headers->set('x-chapa-signature', hash_hmac('sha256', $payload, 'stored-secret'));

        $this->assertTrue(app(ChapaGateway::class)->signatureIsValid($request));
    }

    public function testItClassifiesPermanentPaymentVerificationFailures(): void
    {
        $exception = new PaymentVerificationException('amount_mismatch', true);

        $this->assertSame('amount_mismatch', $exception->reason);
        $this->assertTrue($exception->shouldMarkFailed);
    }
}
