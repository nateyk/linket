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
use App\Storefront\Services\StorefrontPaymentVerificationService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
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
    protected function setUp(): void
    {
        parent::setUp();

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
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('storefront_payment_attempts');
        Schema::dropIfExists('storefront_orders');
        Schema::dropIfExists('payment_transactions');
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
            'uuid' => 'order-uuid-'.$ref,
            'status' => $case->orderStatus,
            'chapa_tx_ref' => $ref,
        ]);

        StorefrontPaymentAttempt::query()->create([
            'order_id' => $order->id,
            'merchant_reference' => $ref,
            'idempotency_key' => 'idemp-'.$ref,
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
            'uuid' => 'order-uuid-'.$ref,
            'status' => 'pending_payment',
            'chapa_tx_ref' => $ref,
        ]);

        StorefrontPaymentAttempt::query()->create([
            'order_id' => $order->id,
            'merchant_reference' => $ref,
            'idempotency_key' => 'idemp-'.$ref,
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
        $order = StorefrontOrder::query()->create([
            'uuid' => 'order-uuid-redirect',
            'status' => 'pending_payment',
            'chapa_tx_ref' => $ref,
        ]);

        StorefrontPaymentAttempt::query()->create([
            'order_id' => $order->id,
            'merchant_reference' => $ref,
            'idempotency_key' => 'idemp-'.$ref,
            'amount_cents' => 15000,
            'currency' => 'ETB',
            'status' => StorefrontPaymentAttempt::STATUS_PENDING,
        ]);

        $verifier = $this->createMock(StorefrontPaymentVerificationService::class);
        $verifier->expects($this->once())->method('verifyAndFulfill')->with($ref)->willReturn($order);
        $this->app->instance(StorefrontPaymentVerificationService::class, $verifier);

        $this->get('/storefront/chapa/return/'.$ref)
            ->assertRedirect('/find-my-purchase/orders?highlight=order-uuid-redirect');
    }

    public static function returnOutcomeCases(): array
    {
        return [
            'successful verification' => [false],
            'pending exception tolerated' => [true],
        ];
    }
}
