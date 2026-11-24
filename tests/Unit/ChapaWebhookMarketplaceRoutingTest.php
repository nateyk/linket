<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Payments\ChapaGateway;
use App\Payments\ChapaWebhookDeliveryLogger;
use App\Payments\Controllers\ChapaWebhookController;
use App\Payments\Models\PaymentTransaction;
use App\Storefront\Controllers\ChapaStorefrontReturnController;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\StorefrontPaymentVerificationService;
use App\Storefront\Services\StorefrontPayoutProcessingService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

final readonly class WebhookRejectionCase
{
    /** @param array<string, mixed> $payload */
    public function __construct(
        public bool $validSig,
        public array $payload,
        public int $expectedStatus,
    ) {
    }
}

final readonly class WebhookFulfillmentCase
{
    public function __construct(
        public string $orderStatus,
        public string $attemptStatus,
        public bool $shouldVerify,
        public string $expectedMessage,
    ) {
    }
}

class ChapaWebhookMarketplaceRoutingTest extends TestCase
{
    private ?string $originalConnection = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->originalConnection = config('database.default');
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');

        Schema::create('payment_transactions', function (Blueprint $table): void {
            $table->id();
            $table->string('tx_ref', 64)->unique();
            $table->string('status', 32)->default('pending');
            $table->timestamps();
        });

        Schema::create('storefront_orders', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid');
            $table->string('status', 32)->default('pending_payment');
            $table->string('payment_gateway', 32)->nullable();
            $table->string('chapa_tx_ref', 64)->nullable();
            $table->timestamps();
        });

        (new (require database_path('migrations/2026_11_14_210000_create_storefront_payment_attempts_table.php')))->up();
        (new (require database_path('migrations/2026_11_14_220000_create_storefront_payout_intents_table.php')))->up();
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('storefront_payout_intents');
        Schema::dropIfExists('storefront_payment_attempts');
        Schema::dropIfExists('storefront_orders');
        Schema::dropIfExists('payment_transactions');

        if ($this->originalConnection !== null) {
            DB::purge('sqlite');
            config()->set('database.default', $this->originalConnection);
        }

        parent::tearDown();
    }

    private function mockChapaGateway(bool $signatureValid): void
    {
        $gateway = $this->createMock(ChapaGateway::class);
        $gateway->method('signatureIsValid')->willReturn($signatureValid);
        $this->app->instance(ChapaGateway::class, $gateway);
    }

    private function mockDeliveryLogger(): void
    {
        $logger = $this->createMock(ChapaWebhookDeliveryLogger::class);
        $this->app->instance(ChapaWebhookDeliveryLogger::class, $logger);
    }

    #[DataProvider('rejectionCases')]
    public function testWebhookRejections(WebhookRejectionCase $case): void
    {
        $this->mockChapaGateway($case->validSig);
        $this->mockDeliveryLogger();

        $controller = new ChapaWebhookController();
        $request = Request::create('/billing/chapa/webhook', 'POST', $case->payload);

        $response = $controller->handle($request);
        $this->assertSame($case->expectedStatus, $response->getStatusCode());
    }

    public static function rejectionCases(): array
    {
        return [
            'invalid signature' => [new WebhookRejectionCase(false, ['tx_ref' => 'lk-test'], 403)],
            'missing tx_ref' => [new WebhookRejectionCase(true, [], 422)],
            'unknown tx_ref' => [new WebhookRejectionCase(true, ['tx_ref' => 'lk-unknown123'], 404)],
        ];
    }

    #[DataProvider('webhookFulfillmentCases')]
    public function testMarketplaceWebhookFulfillment(WebhookFulfillmentCase $case): void
    {
        $this->mockChapaGateway(true);
        $this->mockDeliveryLogger();

        $ref = 'lk-webhook-test';
        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'status' => $case->orderStatus,
            'chapa_tx_ref' => $ref,
        ]);

        StorefrontPaymentAttempt::query()->create([
            'order_id' => $order->id,
            'merchant_reference' => $ref,
            'idempotency_key' => (string) Str::uuid(),
            'amount_cents' => 15000,
            'currency' => 'ETB',
            'status' => $case->attemptStatus,
        ]);

        $verifier = $this->createMock(StorefrontPaymentVerificationService::class);
        $expectation = $case->shouldVerify ? $verifier->expects($this->once()) : $verifier->expects($this->never());
        $expectation->method('verifyAndFulfill')->with($ref)->willReturn($order);
        $this->app->instance(StorefrontPaymentVerificationService::class, $verifier);

        $controller = new ChapaWebhookController();
        $request = Request::create('/billing/chapa/webhook', 'POST', ['tx_ref' => $ref]);

        $response = $controller->handle($request);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame($case->expectedMessage, $response->getData()->message);
    }

    public static function webhookFulfillmentCases(): array
    {
        return [
            'initial pending attempt fulfills' => [
                new WebhookFulfillmentCase(
                    'pending_payment',
                    StorefrontPaymentAttempt::STATUS_PENDING,
                    true,
                    'Payment processed.',
                ),
            ],
            'duplicate attempt already processed' => [
                new WebhookFulfillmentCase(
                    'paid',
                    StorefrontPaymentAttempt::STATUS_SUCCESSFUL,
                    false,
                    'Already processed.',
                ),
            ],
        ];
    }

    #[DataProvider('returnOutcomeCases')]
    public function testMarketplaceReturnOutcomes(bool $throwsException): void
    {
        $ref = 'lk-return-'.($throwsException ? 'fail' : 'ok');
        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'status' => 'pending_payment',
            'chapa_tx_ref' => $ref,
        ]);

        StorefrontPaymentAttempt::query()->create([
            'order_id' => $order->id,
            'merchant_reference' => $ref,
            'idempotency_key' => (string) Str::uuid(),
            'amount_cents' => 15000,
            'currency' => 'ETB',
            'status' => StorefrontPaymentAttempt::STATUS_PENDING,
        ]);

        $verifier = $this->createMock(StorefrontPaymentVerificationService::class);
        $expectation = $verifier->expects($this->once())->method('verifyAndFulfill')->with($ref);

        if ($throwsException) {
            $expectation->willThrowException(new RuntimeException('Still pending'));
        } else {
            $expectation->willReturn($order);
        }
        $this->app->instance(StorefrontPaymentVerificationService::class, $verifier);

        $this->post('/storefront/chapa/return/'.$ref)->assertNoContent();
    }

    public function testMarketplaceReturnRedirectsBuyersAfterPayment(): void
    {
        $ref = 'lk-return-redirect';
        $orderUuid = (string) Str::uuid();
        $order = StorefrontOrder::query()->create([
            'uuid' => $orderUuid,
            'status' => 'pending_payment',
            'chapa_tx_ref' => $ref,
        ]);

        StorefrontPaymentAttempt::query()->create([
            'order_id' => $order->id,
            'merchant_reference' => $ref,
            'idempotency_key' => (string) Str::uuid(),
            'amount_cents' => 15000,
            'currency' => 'ETB',
            'status' => StorefrontPaymentAttempt::STATUS_PENDING,
        ]);

        $verifier = $this->createMock(StorefrontPaymentVerificationService::class);
        $verifier->expects($this->once())->method('verifyAndFulfill')->with($ref)->willReturn($order);
        $this->app->instance(StorefrontPaymentVerificationService::class, $verifier);

        $this->get('/storefront/chapa/return/'.$ref)
            ->assertRedirect('/find-my-purchase/orders?highlight='.$orderUuid);
    }

    public static function returnOutcomeCases(): array
    {
        return [
            'successful verification' => [false],
            'pending exception tolerated' => [true],
        ];
    }

    public function testPayoutWebhookFulfillment(): void
    {
        $this->mockChapaGateway(true);
        $this->mockDeliveryLogger();

        $ref = 'lk-po-wbh123';
        $intent = StorefrontPayoutIntent::query()->create([
            'payout_request_id' => 1,
            'merchant_reference' => $ref,
            'idempotency_key' => (string) Str::uuid(),
            'withdrawal_code' => 'bank_transfer',
            'destination_snapshot' => '183285319',
            'amount_cents' => 200,
            'currency' => 'ETB',
            'status' => StorefrontPayoutIntent::STATUS_PROVIDER_PENDING,
        ]);

        $mockService = new class {
            public function verifyPayout(StorefrontPayoutIntent $intent): StorefrontPayoutIntent {
                $intent->update(['status' => StorefrontPayoutIntent::STATUS_SUCCESSFUL]);
                return $intent;
            }
        };
        $this->app->instance(StorefrontPayoutProcessingService::class, $mockService);

        $controller = new ChapaWebhookController();
        $request = Request::create('/billing/chapa/webhook', 'POST', ['tx_ref' => $ref]);

        $response = $controller->handle($request);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['message' => 'Payout processed.', 'status' => 'successful'], $response->getData(true));
    }

    public function testPayoutWebhookDuplicateIgnored(): void
    {
        $this->mockChapaGateway(true);
        $this->mockDeliveryLogger();

        $ref = 'lk-po-wbh999';
        StorefrontPayoutIntent::query()->create([
            'payout_request_id' => 1,
            'merchant_reference' => $ref,
            'idempotency_key' => (string) Str::uuid(),
            'withdrawal_code' => 'bank_transfer',
            'destination_snapshot' => '183285319',
            'amount_cents' => 200,
            'currency' => 'ETB',
            'status' => StorefrontPayoutIntent::STATUS_SUCCESSFUL,
        ]);

        $controller = new ChapaWebhookController();
        $request = Request::create('/billing/chapa/webhook', 'POST', ['tx_ref' => $ref]);

        $response = $controller->handle($request);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(['message' => 'Already processed.'], $response->getData(true));
    }
}
