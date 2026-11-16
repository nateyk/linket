<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Payments\Chapa\ChapaV2Client;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\Services\MarketplaceReconciliationService;
use App\Storefront\Services\StorefrontPaymentVerificationService;
use App\Storefront\StorefrontWebhookHandler;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class StorefrontPaymentVerificationServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');

        Schema::create('storefront_orders', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid');
            $table->string('monetization_policy')->nullable();
            $table->string('collection_owner')->nullable();
            $table->unsignedBigInteger('digital_product_id')->nullable();
            $table->unsignedBigInteger('biolink_id')->nullable();
            $table->unsignedBigInteger('creator_id')->nullable();
            $table->unsignedBigInteger('buyer_user_id')->nullable();
            $table->string('buyer_name')->nullable();
            $table->string('buyer_email')->nullable();
            $table->string('currency', 12)->default('ETB');
            $table->unsignedBigInteger('gross_amount_cents')->default(0);
            $table->integer('commission_bps')->default(0);
            $table->float('platform_fee_percent')->default(0);
            $table->unsignedBigInteger('platform_fee_cents')->default(0);
            $table->unsignedBigInteger('creator_earnings_cents')->default(0);
            $table->string('status', 32)->default('pending_payment');
            $table->string('payment_gateway', 32)->nullable();
            $table->string('chapa_tx_ref', 64)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->string('buyer_country', 8)->nullable();
            $table->string('buyer_referrer')->nullable();
            $table->timestamps();
        });

        Schema::create('storefront_order_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('storefront_order_id');
            $table->unsignedBigInteger('digital_product_id')->nullable();
            $table->string('title')->nullable();
            $table->unsignedBigInteger('unit_amount_cents')->default(0);
            $table->timestamps();
        });

        (new (require database_path('migrations/2026_11_14_210000_create_storefront_payment_attempts_table.php')))->up();
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('storefront_payment_attempts');
        Schema::dropIfExists('storefront_order_items');
        Schema::dropIfExists('storefront_orders');
        parent::tearDown();
    }

    private function fakeChapaVerification(
        string $status = 'success',
        int $amountCents = 15000,
        string $currency = 'ETB',
        string $ref = 'lk-validref12345',
    ): void {
        Http::fake([
            'https://api.chapa.co/v1/transaction/verify/*' => Http::response(
                $this->verificationPayload($status, $amountCents, $currency, $ref),
            ),
        ]);
    }

    /** @return array<string, mixed> */
    private function verificationPayload(
        string $status,
        int $amountCents,
        string $currency,
        string $ref,
    ): array {
        return [
            'status' => 'success',
            'data' => [
                'status' => strtolower($status),
                'amount' => ChapaV2Client::majorFromCents($amountCents),
                'currency' => $currency,
                'tx_ref' => $ref,
                'reference' => 'CHP-VERIFIED-99',
                'email' => 'buyer@test.com',
            ],
        ];
    }

    private function createOrderAndAttempt(
        int $amountCents = 15000,
        string $currency = 'ETB',
        string $ref = 'lk-validref12345',
    ): array {
        $order = StorefrontOrder::query()->create([
            'uuid' => 'order-uuid-1',
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA,
            'currency' => $currency,
            'gross_amount_cents' => $amountCents,
            'status' => 'pending_payment',
            'payment_gateway' => 'chapa',
            'chapa_tx_ref' => $ref,
            'buyer_email' => 'buyer@test.com',
        ]);

        $attempt = StorefrontPaymentAttempt::query()->create([
            'order_id' => $order->id,
            'merchant_reference' => $ref,
            'idempotency_key' => 'idemp-1',
            'amount_cents' => $amountCents,
            'currency' => $currency,
            'status' => StorefrontPaymentAttempt::STATUS_PENDING,
        ]);

        return [$order, $attempt];
    }

    public function testSuccessfulVerificationFulfillsOrderAndUpdatesAttempt(): void
    {
        $ref = 'lk-validref12345';
        [$order, $attempt] = $this->createOrderAndAttempt(15000, 'ETB', $ref);

        $this->fakeChapaVerification('success', 15000, 'ETB', $ref);
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('platformSecret')->willReturn('platform-secret');

        $handler = $this->createMock(StorefrontWebhookHandler::class);
        $handler->expects($this->once())
            ->method('fulfill')
            ->with(
                $this->callback(fn (StorefrontOrder $o): bool => $o->id === $order->id),
                'buyer@test.com',
                $this->callback(fn (array $attrs): bool => $attrs['payment_gateway'] === 'chapa' && $attrs['chapa_tx_ref'] === $ref),
            );

        $service = new StorefrontPaymentVerificationService($manager, $handler);
        $result = $service->verifyAndFulfill($ref);

        $this->assertSame($order->id, $result->id);

        $freshAttempt = $attempt->fresh();
        $this->assertSame(StorefrontPaymentAttempt::STATUS_SUCCESSFUL, $freshAttempt->status);
        $this->assertSame('CHP-VERIFIED-99', $freshAttempt->chapa_reference);
        $this->assertNotNull($freshAttempt->verified_at);
        $this->assertIsArray($freshAttempt->verification_data);
    }

    #[DataProvider('mismatchCases')]
    public function testVerificationRejectsMismatchesAndMarksAttemptFailed(
        string $status,
        int $amount,
        string $currency,
    ): void {
        $ref = 'lk-validref12345';
        [$order, $attempt] = $this->createOrderAndAttempt(15000, 'ETB', $ref);

        $this->fakeChapaVerification($status, $amount, $currency, $ref);
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('platformSecret')->willReturn('platform-secret');

        $handler = $this->createMock(StorefrontWebhookHandler::class);
        $handler->expects($this->never())->method('fulfill');

        $service = new StorefrontPaymentVerificationService($manager, $handler);

        $this->expectException(RuntimeException::class);

        try {
            $service->verifyAndFulfill($ref);
        } finally {
            $freshAttempt = $attempt->fresh();
            $this->assertSame(StorefrontPaymentAttempt::STATUS_FAILED, $freshAttempt->status);
            $this->assertSame('pending_payment', $order->fresh()->status);
        }
    }

    public static function mismatchCases(): array
    {
        return [
            'amount mismatch' => ['SUCCESS', 5000, 'ETB'],
            'currency mismatch' => ['SUCCESS', 15000, 'USD'],
            'status failed' => ['FAILED', 15000, 'ETB'],
            'status reversed' => ['REVERSED', 15000, 'ETB'],
        ];
    }

    public function testPendingVerificationCanBeFulfilledByScheduledReconciliation(): void
    {
        $ref = 'lk-validref12345';
        [$order, $attempt] = $this->createOrderAndAttempt(ref: $ref);
        Http::fake([
            'https://api.chapa.co/v1/transaction/verify/*' => Http::sequence()
                ->push($this->verificationPayload('pending', 15000, 'ETB', $ref))
                ->push($this->verificationPayload('success', 15000, 'ETB', $ref))
                ->push($this->verificationPayload('success', 15000, 'ETB', $ref)),
        ]);
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('platformSecret')->willReturn('platform-secret');
        $handler = $this->createMock(StorefrontWebhookHandler::class);
        $handler->expects($this->once())->method('fulfill')
            ->willReturnCallback(static function (StorefrontOrder $paidOrder): void {
                $paidOrder->update(['status' => StorefrontOrder::STATUS_COMPLETED, 'paid_at' => now()]);
            });
        $verification = new StorefrontPaymentVerificationService($manager, $handler);

        try {
            $verification->verifyAndFulfill($ref);
            $this->fail('Pending verification must not report fulfillment.');
        } catch (RuntimeException) {
            $this->assertSame(StorefrontOrder::STATUS_PENDING, $order->fresh()->status);
            $this->assertSame(StorefrontPaymentAttempt::STATUS_PENDING, $attempt->fresh()->status);
        }

        $reconciliation = new MarketplaceReconciliationService($manager, $verification);
        $this->assertSame(1, $reconciliation->reconcilePendingPaymentAttempts(staleMinutes: 0));
        $this->assertSame(StorefrontOrder::STATUS_COMPLETED, $order->fresh()->status);
        $this->assertSame(StorefrontPaymentAttempt::STATUS_SUCCESSFUL, $attempt->fresh()->status);
    }

    public function testScheduledReconciliationRecoversPreviouslyMisclassifiedPendingVerification(): void
    {
        $ref = 'lk-validref12345';
        [, $attempt] = $this->createOrderAndAttempt(ref: $ref);
        $attempt->update([
            'status' => StorefrontPaymentAttempt::STATUS_FAILED,
            'verification_data' => ['status' => 'PENDING'],
            'error_message' => 'Verification mismatch: status=PENDING, amount=15000, currency=ETB',
        ]);
        Http::fake([
            'https://api.chapa.co/v1/transaction/verify/*' => Http::sequence()
                ->push($this->verificationPayload('success', 15000, 'ETB', $ref))
                ->push($this->verificationPayload('success', 15000, 'ETB', $ref)),
        ]);
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('platformSecret')->willReturn('platform-secret');
        $handler = $this->createMock(StorefrontWebhookHandler::class);
        $handler->expects($this->once())->method('fulfill');
        $verification = new StorefrontPaymentVerificationService($manager, $handler);
        $reconciliation = new MarketplaceReconciliationService($manager, $verification);

        $this->assertSame(1, $reconciliation->reconcilePendingPaymentAttempts(staleMinutes: 0));
        $this->assertSame(StorefrontPaymentAttempt::STATUS_SUCCESSFUL, $attempt->fresh()->status);
        $this->assertNull($attempt->fresh()->error_message);
    }

    public function testIdempotentWhenAlreadyFulfilled(): void
    {
        $ref = 'lk-validref12345';
        [$order, $attempt] = $this->createOrderAndAttempt(15000, 'ETB', $ref);

        $order->update(['status' => 'paid', 'paid_at' => now()]);
        $attempt->update(['status' => StorefrontPaymentAttempt::STATUS_SUCCESSFUL, 'verified_at' => now()]);

        $manager = $this->createMock(LinketChapaManager::class);
        $manager->expects($this->never())->method('platformSecret');

        $handler = $this->createMock(StorefrontWebhookHandler::class);
        $handler->expects($this->never())->method('fulfill');

        $service = new StorefrontPaymentVerificationService($manager, $handler);
        $result = $service->verifyAndFulfill($ref);

        $this->assertSame($order->id, $result->id);
    }
}
