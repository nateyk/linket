<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\Services\AccountMonetizationStatus;
use App\Storefront\Services\ChapaStorefrontCheckout;
use App\Storefront\Services\CreatorVerificationAllowance;
use App\Storefront\Services\StorefrontPaymentReferenceGenerator;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Nateyk\Chapa\ChapaClient;
use Nateyk\Chapa\Http\RawResponse;
use Nateyk\Chapa\Http\Transport;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ChapaStorefrontCheckoutTest extends TestCase
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

    private function mockChapaClient(string $checkoutUrl = 'https://checkout.chapa.global/test1234'): ChapaClient
    {
        $transport = $this->createMock(Transport::class);
        $transport->method('send')->willReturn(
            new RawResponse(200, (string) json_encode([
                'status' => 'success',
                'data' => [
                    'checkout_url' => $checkoutUrl,
                    'chapa_reference' => 'CHP-TEST-REF-99',
                ],
            ]))
        );

        return new ChapaClient(
            privateKey: 'sec-test-platform',
            webhookSecret: 'wh-secret',
            transport: $transport,
        );
    }

    public function testPlatformChapaCheckoutSucceedsForFreeCreator(): void
    {
        $client = $this->mockChapaClient();
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('isEnabled')->willReturn(true);
        $manager->method('platformClient')->willReturn($client);

        $monetization = new AccountMonetizationStatus();

        $refGen = new StorefrontPaymentReferenceGenerator(fn (): bool => false);

        $checkout = new ChapaStorefrontCheckout(
            $manager,
            null,
            $monetization,
            $refGen,
            fn (User $u): bool => false, // Free creator
        );

        $creator = new User(['id' => 10, 'name' => 'Free Creator']);
        $product = new DigitalProduct([
            'id' => 101,
            'user_id' => 10,
            'workspace_id' => 5,
            'title' => 'Test Ebook',
            'price_cents' => 15000,
            'currency' => 'ETB',
        ]);

        $order = $checkout->createPlatformOrder($product, null, [
            'name' => 'Abebe Bikila',
            'email' => 'abebe@example.com',
        ], $creator);

        $this->assertSame(StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA, $order->collection_owner);
        $this->assertSame(CreatorVerificationAllowance::FREE_POLICY, $order->monetization_policy);
        $this->assertSame('pending_payment', $order->status);
        $this->assertSame('chapa', $order->payment_gateway);
        $this->assertSame('https://checkout.chapa.global/test1234', $order->chapaCheckoutUrl);
        $this->assertSame(15000, $order->gross_amount_cents);
        $this->assertLessThanOrEqual(20, strlen((string) $order->chapa_tx_ref));

        $attempt = StorefrontPaymentAttempt::query()->where('order_id', $order->id)->first();
        $this->assertNotNull($attempt);
        $this->assertSame('pending', $attempt->status);
        $this->assertSame('test1234', $attempt->chapa_reference);
        $this->assertSame(15000, $attempt->amount_cents);
        $this->assertSame('ETB', $attempt->currency);
        $this->assertSame($order->chapa_tx_ref, $attempt->merchant_reference);
    }

    public function testPlatformChapaCheckoutSucceedsForProCreator(): void
    {
        $client = $this->mockChapaClient();
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('isEnabled')->willReturn(true);
        $manager->method('platformClient')->willReturn($client);

        $monetization = new AccountMonetizationStatus();

        $refGen = new StorefrontPaymentReferenceGenerator(fn (): bool => false);

        $checkout = new ChapaStorefrontCheckout(
            $manager,
            null,
            $monetization,
            $refGen,
            fn (User $u): bool => true, // Pro creator
        );

        $creator = new User(['id' => 20, 'name' => 'Pro Creator']);
        $product = new DigitalProduct([
            'id' => 102,
            'user_id' => 20,
            'workspace_id' => 5,
            'title' => 'Pro Course',
            'price_cents' => 50000,
            'currency' => 'ETB',
        ]);

        $order = $checkout->createPlatformOrder($product, null, [
            'name' => 'Almaz Ayana',
            'email' => 'almaz@example.com',
        ], $creator);

        $this->assertSame(StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA, $order->collection_owner);
        $this->assertSame(CreatorVerificationAllowance::PRO_POLICY, $order->monetization_policy);
        $this->assertSame(50000, $order->gross_amount_cents);
    }

    public function testPlatformChapaCheckoutRejectsNonEtbCurrency(): void
    {
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('isEnabled')->willReturn(true);
        $monetization = new AccountMonetizationStatus();
        $refGen = new StorefrontPaymentReferenceGenerator(fn (): bool => false);

        $checkout = new ChapaStorefrontCheckout($manager, null, $monetization, $refGen);

        $creator = new User(['id' => 30]);
        $product = new DigitalProduct([
            'id' => 103,
            'user_id' => 30,
            'price_cents' => 1000,
            'currency' => 'USD',
        ]);

        $this->expectException(HttpException::class);
        $checkout->createPlatformOrder($product, null, ['name' => 'Buyer', 'email' => 'b@example.com'], $creator);
    }

    public function testPlatformChapaCheckoutRejectsPriceBelowOneEtb(): void
    {
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('isEnabled')->willReturn(true);
        $monetization = new AccountMonetizationStatus();
        $refGen = new StorefrontPaymentReferenceGenerator(fn (): bool => false);

        $checkout = new ChapaStorefrontCheckout($manager, null, $monetization, $refGen);

        $creator = new User(['id' => 30]);
        $product = new DigitalProduct([
            'id' => 104,
            'user_id' => 30,
            'price_cents' => 50,
            'currency' => 'ETB',
        ]);

        $this->expectException(HttpException::class);
        $checkout->createPlatformOrder($product, null, ['name' => 'Buyer', 'email' => 'b@example.com'], $creator);
    }
}
