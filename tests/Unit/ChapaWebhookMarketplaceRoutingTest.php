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

    private function createOrderAndAttempt(string $ref, string $orderStatus, string $attemptStatus): StorefrontOrder
    {
        $order = StorefrontOrder::query()->create([
            'uuid' => 'order-uuid-'.$ref,
            'status' => $orderStatus,
            'chapa_tx_ref' => $ref,
        ]);

        StorefrontPaymentAttempt::query()->create([
            'order_id' => $order->id,
            'merchant_reference' => $ref,
            'idempotency_key' => 'idemp-'.$ref,
            'amount_cents' => 15000,
            'currency' => 'ETB',
            'status' => $attemptStatus,
        ]);

        return $order;
    }

    #[DataProvider('rejectionCases')]
    public function testWebhookRejections(bool $validSig, array $payload, int $expectedStatus): void
    {
        $this->mockChapaGateway($validSig);
        $this->mockDeliveryLogger();

        $controller = new ChapaWebhookController();
        $request = Request::create('/billing/chapa/webhook', 'POST', $payload);

        $response = $controller->handle($request);
        $this->assertSame($expectedStatus, $response->getStatusCode());
    }

    public static function rejectionCases(): array
    {
        return [
            'invalid signature' => [false, ['tx_ref' => 'lk-test'], 403],
            'missing tx_ref' => [true, [], 422],
            'unknown tx_ref' => [true, ['tx_ref' => 'lk-unknown123'], 404],
        ];
    }

    public function testMarketplacePaymentWebhookProcessesSuccessfully(): void
    {
        $this->mockChapaGateway(true);
        $this->mockDeliveryLogger();

        $ref = 'lk-marketplace123';
        $order = $this->createOrderAndAttempt($ref, 'pending_payment', StorefrontPaymentAttempt::STATUS_PENDING);

        $verifier = $this->createMock(StorefrontPaymentVerificationService::class);
        $verifier->expects($this->once())
            ->method('verifyAndFulfill')
            ->with($ref)
            ->willReturn($order);
        $this->app->instance(StorefrontPaymentVerificationService::class, $verifier);

        $controller = new ChapaWebhookController();
        $request = Request::create('/billing/chapa/webhook', 'POST', ['tx_ref' => $ref]);

        $response = $controller->handle($request);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('Payment processed.', $response->getData()->message);
    }

    public function testMarketplacePaymentWebhookDuplicateReturnsAlreadyProcessed(): void
    {
        $this->mockChapaGateway(true);
        $this->mockDeliveryLogger();

        $ref = 'lk-duplicate123';
        $this->createOrderAndAttempt($ref, 'paid', StorefrontPaymentAttempt::STATUS_SUCCESSFUL);

        $verifier = $this->createMock(StorefrontPaymentVerificationService::class);
        $verifier->expects($this->never())->method('verifyAndFulfill');
        $this->app->instance(StorefrontPaymentVerificationService::class, $verifier);

        $controller = new ChapaWebhookController();
        $request = Request::create('/billing/chapa/webhook', 'POST', ['tx_ref' => $ref]);

        $response = $controller->handle($request);
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('Already processed.', $response->getData()->message);
    }

    #[DataProvider('returnOutcomeCases')]
    public function testMarketplaceReturnOutcomes(bool $throwsException): void
    {
        $ref = 'lk-return-'.($throwsException ? 'fail' : 'ok');
        $order = $this->createOrderAndAttempt($ref, 'pending_payment', StorefrontPaymentAttempt::STATUS_PENDING);

        $verifier = $this->createMock(StorefrontPaymentVerificationService::class);
        $expectation = $verifier->expects($this->once())->method('verifyAndFulfill')->with($ref);

        if ($throwsException) {
            $expectation->willThrowException(new RuntimeException('Still pending'));
        } else {
            $expectation->willReturn($order);
        }
        $this->app->instance(StorefrontPaymentVerificationService::class, $verifier);

        $controller = new ChapaStorefrontReturnController();
        $response = $controller->handle($ref);

        $this->assertSame(204, $response->getStatusCode());
    }

    public static function returnOutcomeCases(): array
    {
        return [
            'successful verification' => [false],
            'pending exception tolerated' => [true],
        ];
    }
}
