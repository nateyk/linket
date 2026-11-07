<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\ChapaGateway;
use App\Payments\Models\PaymentTransaction;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class ChapaV2GatewayTest extends TestCase
{
    use DatabaseTransactions;

    public function testPlatformCheckoutCreatesAV2HostedPayment(): void
    {
        config(['services.chapa.secret' => 'platform-secret']);
        Http::fake([
            'https://api.chapa.global/v2/payments/hosted' => Http::response([
                'status' => 'success',
                'data' => ['checkout_url' => 'https://checkout.chapa.global/CHPLATFORM1'],
            ]),
        ]);
        $subscription = $this->subscription();

        $transaction = app(ChapaGateway::class)->createTransaction(
            $subscription,
            'subscription_initial',
            '100.00',
            'https://linket.test/return?tx_ref={tx_ref}',
            'Plan subscription',
            ['name' => 'Abebe Kebede', 'email' => 'abebe@example.test', 'phone' => '251911000000'],
        );

        $this->assertLessThanOrEqual(20, strlen($transaction->tx_ref));
        $this->assertSame('https://checkout.chapa.global/CHPLATFORM1', $transaction->checkout_url);
        Http::assertSent(function ($request) use ($transaction): bool {
            return $request->url() === 'https://api.chapa.global/v2/payments/hosted'
                && $request->hasHeader('Authorization', 'Bearer platform-secret')
                && $request->hasHeader('Idempotency-Key', $transaction->uuid)
                && $request['amount'] === 10000
                && $request['currency'] === 'ETB'
                && $request['merchant_reference'] === $transaction->tx_ref
                && $request['return_url'] === 'https://linket.test/return?tx_ref='.$transaction->tx_ref
                && $request['customer']['email'] === 'abebe@example.test';
        });
    }

    public function testVerifyNormalizesAV2SuccessForExistingFulfillmentChecks(): void
    {
        config(['services.chapa.secret' => 'platform-secret']);
        $subscription = $this->subscription();
        $transaction = PaymentTransaction::query()->create([
            'uuid' => (string) Str::uuid(),
            'payable_type' => Subscription::class,
            'payable_id' => $subscription->id,
            'purpose' => 'subscription_initial',
            'tx_ref' => 'refplatform01',
            'amount' => '100.00',
            'currency' => 'ETB',
        ]);
        Http::fake([
            'https://api.chapa.global/v2/payments/refplatform01/verify' => Http::response([
                'status' => 'success',
                'data' => [
                    'chapa_reference' => 'CHPLATFORM1',
                    'merchant_reference' => 'refplatform01',
                    'amount' => 10000,
                    'currency' => 'ETB',
                    'status' => 'SUCCESS',
                    'customer' => [
                        'email' => 'abebe@example.test',
                        'first_name' => 'Abebe',
                        'last_name' => 'Kebede',
                    ],
                ],
            ]),
        ]);

        $gateway = app(ChapaGateway::class);
        $data = $gateway->verifiedData($gateway->verify($transaction));

        $this->assertTrue($gateway->isSuccessful($data));
        $this->assertSame('100.00', number_format((float) $data['amount'], 2, '.', ''));
        $this->assertSame('refplatform01', $data['tx_ref']);
        $this->assertSame('CHPLATFORM1', $data['id']);
        $this->assertSame('abebe@example.test', $data['email']);
    }

    public function testV2WebhookFulfillsASubscriptionFromTheMerchantReference(): void
    {
        config([
            'services.chapa.secret' => 'platform-secret',
            'services.chapa.webhook_secret' => 'webhook-secret',
        ]);
        $subscription = $this->subscription();
        $subscription->price->update(['currency' => 'ETB', 'interval' => 'month', 'interval_count' => 1]);
        PaymentTransaction::query()->create([
            'uuid' => (string) Str::uuid(),
            'payable_type' => Subscription::class,
            'payable_id' => $subscription->id,
            'purpose' => 'subscription_initial',
            'tx_ref' => 'refplatform01',
            'amount' => '100.00',
            'currency' => 'ETB',
            'status' => 'pending',
        ]);
        Http::fake([
            'https://api.chapa.global/v2/payments/refplatform01/verify' => Http::response([
                'status' => 'success',
                'data' => [
                    'chapa_reference' => 'CHPLATFORM1',
                    'merchant_reference' => 'refplatform01',
                    'amount' => 10000,
                    'currency' => 'ETB',
                    'status' => 'SUCCESS',
                ],
            ]),
        ]);

        $this->postSignedWebhook([
            'webhook_type' => 'payment',
            'event' => 'payment.success',
            'status' => 'success',
            'merchant_reference' => 'refplatform01',
            'chapa_reference' => 'CHPLATFORM1',
            'amount' => '10000',
            'currency' => 'ETB',
        ])->assertOk();

        $this->assertSame('paid', PaymentTransaction::query()->where('tx_ref', 'refplatform01')->value('status'));
        $this->assertSame('active', $subscription->fresh()->gateway_status);
    }

    public function testV1WebhookStillFulfillsFromTheLegacyReference(): void
    {
        config([
            'services.chapa.secret' => 'platform-secret',
            'services.chapa.webhook_secret' => 'webhook-secret',
        ]);
        $subscription = $this->subscription();
        $subscription->price->update(['currency' => 'ETB', 'interval' => 'month', 'interval_count' => 1]);
        PaymentTransaction::query()->create([
            'uuid' => (string) Str::uuid(),
            'payable_type' => Subscription::class,
            'payable_id' => $subscription->id,
            'purpose' => 'subscription_initial',
            'tx_ref' => 'legacyref01',
            'amount' => '100.00',
            'currency' => 'ETB',
            'status' => 'pending',
        ]);
        Http::fake([
            'https://api.chapa.global/v2/payments/legacyref01/verify' => Http::response([
                'status' => 'success',
                'data' => [
                    'tx_ref' => 'legacyref01',
                    'id' => 'CHLEGACY1',
                    'amount' => '100.00',
                    'currency' => 'ETB',
                    'status' => 'success',
                ],
            ]),
        ]);

        $this->postSignedWebhook([
            'event' => 'charge.success',
            'tx_ref' => 'legacyref01',
            'status' => 'success',
            'amount' => '100.00',
            'currency' => 'ETB',
        ])->assertOk();

        $this->assertSame('paid', PaymentTransaction::query()->where('tx_ref', 'legacyref01')->value('status'));
    }

    /** @param array<string, mixed> $body */
    private function postSignedWebhook(array $body): \Illuminate\Testing\TestResponse
    {
        $payload = json_encode($body);

        return $this->call('POST', '/billing/chapa/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_CHAPA_SIGNATURE' => hash_hmac('sha256', $payload, 'webhook-secret'),
        ], $payload);
    }

    private function subscription(): Subscription
    {
        $user = User::factory()->create();
        $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
        $price = Price::query()->where('product_id', $plan->id)->firstOrFail();

        return Subscription::query()->create([
            'user_id' => $user->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'gateway_name' => 'chapa',
            'gateway_status' => 'pending',
        ]);
    }
}
