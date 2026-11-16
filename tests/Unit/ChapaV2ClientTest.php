<?php

namespace Tests\Unit;

use App\Payments\Chapa\ChapaV2Client;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class ChapaV2ClientTest extends TestCase
{
    public function testItCreatesAHostedPaymentInMajorCurrency(): void
    {
        Http::fake([
            'https://api.chapa.co/v1/transaction/initialize' => Http::response([
                'status' => 'success',
                'message' => 'Hosted Link',
                'data' => [
                    'checkout_url' => 'https://checkout.chapa.co/checkout/payment/CH0Vn2VASWCi',
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

        $this->assertSame('https://checkout.chapa.co/checkout/payment/CH0Vn2VASWCi', $result['checkout_url']);
        $this->assertSame('CH0Vn2VASWCi', $result['chapa_reference']);

        Http::assertSent(function ($request): bool {
            return $request->url() === 'https://api.chapa.co/v1/transaction/initialize'
                && $request->hasHeader('Authorization', 'Bearer seller-secret')
                && !$request->hasHeader('Idempotency-Key')
                && $request['amount'] === '100.00'
                && $request['currency'] === 'ETB'
                && $request['tx_ref'] === 'ref-1791192600'
                && $request['email'] === 'buyer@example.com'
                && $request['first_name'] === 'Abebe';
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
            'https://api.chapa.co/v1/transaction/verify/CH0Vn2VASWCi' => Http::response([
                'status' => 'success',
                'message' => 'Payment details',
                'data' => [
                    'reference' => 'CH0Vn2VASWCi',
                    'tx_ref' => 'ref-1791192600',
                    'amount' => 100,
                    'currency' => 'ETB',
                    'status' => 'success',
                ],
            ]),
        ]);

        $data = (new ChapaV2Client())->verifyPayment('platform-secret', 'CH0Vn2VASWCi');

        $this->assertSame('success', $data['status']);
        $this->assertSame('100.00', $data['amount']);
        $this->assertSame('ref-1791192600', $data['merchant_reference']);
        $this->assertSame('CH0Vn2VASWCi', $data['chapa_reference']);
        Http::assertSent(fn ($request): bool => $request->url() === 'https://api.chapa.co/v1/transaction/verify/CH0Vn2VASWCi'
            && $request->hasHeader('Authorization', 'Bearer platform-secret'));
    }

    public function testItAuthenticatesASecretWithTheBanksEndpoint(): void
    {
        Http::fake([
            'https://api.chapa.co/v1/banks' => Http::sequence()
                ->push(['status' => 'success', 'data' => [['id' => 855, 'slug' => 'telebirr']]])
                ->push(['status' => 'error', 'message' => 'Invalid API key'], 401),
        ]);

        $client = new ChapaV2Client();

        $this->assertTrue($client->secretAuthenticates('CHASECK_TEST-good'));
        $this->assertFalse($client->secretAuthenticates('CHASECK_TEST-bad'));
    }

    public function testItReportsAChapaEnvironmentMismatch(): void
    {
        Http::fake([
            'https://api.chapa.co/v1/banks' => Http::response([
                'status' => 'error',
                'error' => ['code' => 'INVALID_VALUE'],
            ], 403),
        ]);

        $this->assertSame('environment_mismatch', (new ChapaV2Client())->secretStatus('CHAPA_LIVE_examplesecret'));
    }

    public function testItConvertsMajorCurrencyAmountsToIntegerCents(): void
    {
        $this->assertSame(10000, ChapaV2Client::centsFromMajor('100.00'));
        $this->assertSame(100, ChapaV2Client::centsFromMajor('1'));
    }
}
