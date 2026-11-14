<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Payments\Chapa\ChapaV2Client;
use App\Payments\Chapa\LinketChapaManager;
use Common\Settings\Settings;
use Nateyk\Chapa\ChapaClient;
use Nateyk\Chapa\Http\RawResponse;
use Nateyk\Chapa\Http\Transport;
use RuntimeException;
use Tests\TestCase;

class ChapaSdkAdapterTest extends TestCase
{
    public function testItResolvesPlatformCredentialsFromSettingsWithEnvFallback(): void
    {
        config(['services.chapa.secret' => 'env-platform-secret']);
        config(['services.chapa.webhook_secret' => 'env-webhook-secret']);

        $settings = $this->createMock(Settings::class);
        $settings->method('get')->willReturnMap([
            ['billing.chapa.secret_key', null],
            ['billing.chapa.webhook_secret', null],
            ['billing.chapa.enable', true],
        ]);

        $manager = new LinketChapaManager($settings);
        $this->assertSame('env-platform-secret', $manager->platformSecret());
        $this->assertSame('env-webhook-secret', $manager->webhookSecret());
        $this->assertTrue($manager->isEnabled());

        // Now with explicit admin settings overriding env
        $settingsWithOverride = $this->createMock(Settings::class);
        $settingsWithOverride->method('get')->willReturnMap([
            ['billing.chapa.secret_key', 'admin-db-secret'],
            ['billing.chapa.webhook_secret', 'admin-db-webhook-secret'],
            ['billing.chapa.enable', true],
        ]);

        $managerOverride = new LinketChapaManager($settingsWithOverride);
        $this->assertSame('admin-db-secret', $managerOverride->platformSecret());
        $this->assertSame('admin-db-webhook-secret', $managerOverride->webhookSecret());
    }

    public function testItThrowsWhenPlatformSecretIsMissing(): void
    {
        config(['services.chapa.secret' => '']);
        $settings = $this->createMock(Settings::class);
        $settings->method('get')->willReturn(null);

        $manager = new LinketChapaManager($settings);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Linket platform Chapa merchant secret is not configured.');
        $manager->platformClient();
    }

    public function testItVerifiesWebhookSignaturesUsingTheSdk(): void
    {
        $payload = json_encode(['event' => 'charge.complete', 'reference' => 'lk1234567890123456'], JSON_THROW_ON_ERROR);
        $webhookSecret = 'test-signing-secret';
        $validSignature = hash_hmac('sha256', $payload, $webhookSecret);

        $client = new ChapaClient(
            privateKey: 'dummy-key',
            webhookSecret: $webhookSecret,
        );

        $this->assertTrue($client->webhooks()->verify($payload, $validSignature));
        $this->assertFalse($client->webhooks()->verify($payload, 'invalid-signature-hex-length-64-must-be-provided-00000000000000000000'));
        $this->assertFalse($client->webhooks()->verify($payload . 'tampered', $validSignature));
    }

    public function testItConvertsMinorAndMajorUnitsWithoutBcmath(): void
    {
        $this->assertSame(10000, ChapaV2Client::centsFromMajor('100'));
        $this->assertSame(10000, ChapaV2Client::centsFromMajor('100.00'));
        $this->assertSame(10050, ChapaV2Client::centsFromMajor('100.5'));
        $this->assertSame(10050, ChapaV2Client::centsFromMajor('100.50'));
        $this->assertSame(75, ChapaV2Client::centsFromMajor('0.75'));
        $this->assertSame(5, ChapaV2Client::centsFromMajor('0.05'));

        $this->assertSame('100.00', ChapaV2Client::majorFromCents(10000));
        $this->assertSame('100.50', ChapaV2Client::majorFromCents(10050));
        $this->assertSame('0.75', ChapaV2Client::majorFromCents(75));
        $this->assertSame('0.05', ChapaV2Client::majorFromCents(5));
    }

    public function testSdkHostedCheckoutAndVerificationContracts(): void
    {
        $transport = new class implements Transport {
            public int $requestCount = 0;
            public array $lastHeaders = [];

            public function send(string $method, string $url, array $headers, ?string $body, int $timeout): RawResponse
            {
                $this->requestCount++;
                $this->lastHeaders = $headers;

                if (str_ends_with($url, '/v2/payments/hosted')) {
                    return new RawResponse(200, json_encode([
                        'status' => 'success',
                        'data' => [
                            'checkout_url' => 'https://checkout.chapa.global/test-checkout-123',
                            'chapa_reference' => 'CP-TEST-123',
                        ],
                    ], JSON_THROW_ON_ERROR));
                }

                if (str_contains($url, '/v2/payments/ref-123/verify')) {
                    return new RawResponse(200, json_encode([
                        'status' => 'success',
                        'data' => [
                            'status' => 'SUCCESS',
                            'amount' => 10000,
                            'currency' => 'ETB',
                            'merchant_reference' => 'ref-123',
                            'chapa_reference' => 'CP-TEST-123',
                        ],
                    ], JSON_THROW_ON_ERROR));
                }

                if (str_contains($url, '/v2/payouts/tx-payout-1/verify')) {
                    return new RawResponse(200, json_encode([
                        'status' => 'success',
                        'data' => [
                            'status' => 'PENDING',
                            'amount' => 5000,
                            'currency' => 'ETB',
                            'merchant_reference' => 'tx-payout-1',
                            'chapa_reference' => 'CP-PO-1',
                        ],
                    ], JSON_THROW_ON_ERROR));
                }

                throw new RuntimeException("Unhandled URL in test transport: {$url}");
            }
        };

        $client = new ChapaClient(
            privateKey: 'test-private-key',
            webhookSecret: 'test-webhook-secret',
            transport: $transport,
            baseUrl: 'https://api.chapa.global',
        );

        // 1. Hosted checkout typed contract
        $hosted = $client->payments()->hostedTyped([
            'amount' => 10000,
            'currency' => 'ETB',
            'merchant_reference' => 'ref-123',
        ], 'idempotency-key-uuid-1');

        $this->assertSame('https://checkout.chapa.global/test-checkout-123', $hosted->checkoutUrl);
        $this->assertSame('test-checkout-123', $hosted->chapaReference);
        $this->assertSame('idempotency-key-uuid-1', $transport->lastHeaders['Idempotency-Key'] ?? null);

        // 2. Payment verification typed contract
        $verifiedPayment = $client->payments()->verifyTyped('ref-123');
        $this->assertTrue($verifiedPayment->succeeded());
        $this->assertTrue($verifiedPayment->matchesPayment(10000, 'ETB', 'ref-123'));
        $this->assertFalse($verifiedPayment->matchesPayment(9999, 'ETB', 'ref-123')); // Mismatched amount
        $this->assertFalse($verifiedPayment->matchesPayment(10000, 'USD', 'ref-123')); // Mismatched currency

        // 3. Payout verification typed contract
        $verifiedPayout = $client->payouts()->verifyTyped('tx-payout-1');
        $this->assertFalse($verifiedPayout->succeeded()); // PENDING is NOT succeeded!
        $this->assertSame('PENDING', $verifiedPayout->status);
        $this->assertFalse($verifiedPayout->matchesPayout(5000, 'ETB', 'tx-payout-1')); // PENDING cannot match payout
    }
}
