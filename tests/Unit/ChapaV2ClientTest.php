<?php

namespace Tests\Unit;

use App\Payments\Chapa\ChapaV2Client;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class ChapaV2ClientTest extends TestCase
{
    public function testItCreatesAHostedPaymentInIntegerCents(): void
    {
        Http::fake([
            'https://api.chapa.global/v2/payments/hosted' => Http::response([
                'status' => 'success',
                'message' => 'Payment initiated successfully',
                'data' => [
                    'checkout_url' => 'https://checkout.chapa.global/CH0Vn2VASWCi',
                ],
            ]),
        ]);

        $result = (new ChapaV2Client())->createHostedPayment('seller-secret', [
            'amount_cents' => 10000,
            'currency' => 'ETB',
            'merchant_reference' => 'ref-1791192600',
            'idempotency_key' => 'idem-1',
            'callback_url' => 'https://linket.test/billing/chapa/callback/ref-1791192600',
            'return_url' => 'https://linket.test/return',
            'customer' => [
                'email' => 'buyer@example.com',
                'first_name' => 'Abebe',
                'last_name' => 'Kebede',
            ],
        ]);

        $this->assertSame('https://checkout.chapa.global/CH0Vn2VASWCi', $result['checkout_url']);
        $this->assertSame('CH0Vn2VASWCi', $result['chapa_reference']);

        Http::assertSent(function ($request): bool {
            return $request->url() === 'https://api.chapa.global/v2/payments/hosted'
                && $request->hasHeader('Authorization', 'Bearer seller-secret')
                && $request->hasHeader('Idempotency-Key', 'idem-1')
                && $request['amount'] === 10000
                && $request['currency'] === 'ETB'
                && $request['merchant_reference'] === 'ref-1791192600';
        });
    }

    public function testItRejectsAMerchantReferenceLongerThanTwentyCharacters(): void
    {
        Http::fake();

        try {
            (new ChapaV2Client())->createHostedPayment('seller-secret', [
                'amount_cents' => 10000,
                'currency' => 'ETB',
                'merchant_reference' => 'linket_this_reference_is_too_long',
                'idempotency_key' => 'idem-2',
            ]);
            $this->fail('A long merchant reference must be rejected.');
        } catch (RuntimeException) {
            Http::assertNothingSent();
        }
    }

    public function testItVerifiesAPaymentByReference(): void
    {
        Http::fake([
            'https://api.chapa.global/v2/payments/CH0Vn2VASWCi/verify' => Http::response([
                'status' => 'success',
                'message' => 'Payment verification result',
                'data' => [
                    'chapa_reference' => 'CH0Vn2VASWCi',
                    'merchant_reference' => 'ref-1791192600',
                    'amount' => 10000,
                    'currency' => 'ETB',
                    'status' => 'SUCCESS',
                ],
            ]),
        ]);

        $data = (new ChapaV2Client())->verifyPayment('platform-secret', 'CH0Vn2VASWCi');

        $this->assertSame('SUCCESS', $data['status']);
        $this->assertSame(10000, $data['amount']);
        $this->assertSame('ref-1791192600', $data['merchant_reference']);
        Http::assertSent(fn ($request): bool => $request->hasHeader('Authorization', 'Bearer platform-secret'));
    }

    public function testItAuthenticatesASecretWithThePaymentMethodsEndpoint(): void
    {
        Http::fake([
            'https://api.chapa.global/v2/payments/methods' => Http::sequence()
                ->push(['status' => 'success', 'data' => [['slug' => 'telebirr']]])
                ->push(['status' => 'error', 'message' => 'Invalid API key'], 401),
        ]);

        $client = new ChapaV2Client();

        $this->assertTrue($client->secretAuthenticates('good-secret'));
        $this->assertFalse($client->secretAuthenticates('bad-secret'));
    }

    public function testItConvertsMajorCurrencyAmountsToIntegerCents(): void
    {
        $this->assertSame(10000, ChapaV2Client::centsFromMajor('100.00'));
        $this->assertSame(100, ChapaV2Client::centsFromMajor('1'));
    }
}
