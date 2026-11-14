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
use PHPUnit\Framework\Attributes\DataProvider;
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

    private function mockChapaClient(): ChapaClient
    {
        $transport = $this->createMock(Transport::class);
        $transport->method('send')->willReturn(
            new RawResponse(200, (string) json_encode([
                'status' => 'success',
                'data' => [
                    'checkout_url' => 'https://checkout.chapa.global/test1234',
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

    #[DataProvider('creatorPlanCases')]
    public function testPlatformChapaCheckoutSucceedsForCreators(bool $isPro, string $expectedPolicy): void
    {
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('isEnabled')->willReturn(true);
        $manager->method('platformClient')->willReturn($this->mockChapaClient());

        $checkout = new ChapaStorefrontCheckout(
            $manager,
            null,
            new AccountMonetizationStatus(),
            new StorefrontPaymentReferenceGenerator(fn (): bool => false),
            fn (User $u): bool => $isPro,
        );

        $creator = new User(['id' => $isPro ? 20 : 10, 'name' => 'Creator']);
        $product = new DigitalProduct([
            'id' => 101,
            'user_id' => $creator->id,
            'workspace_id' => 5,
            'title' => 'Test Product',
            'price_cents' => 15000,
            'currency' => 'ETB',
        ]);

        $order = $checkout->createPlatformOrder($product, null, [
            'name' => 'Buyer Name',
            'email' => 'buyer@example.com',
        ], $creator);

        $this->assertSame(StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA, $order->collection_owner);
        $this->assertSame($expectedPolicy, $order->monetization_policy);
        $this->assertSame('pending_payment', $order->status);
        $this->assertSame('chapa', $order->payment_gateway);
        $this->assertSame('https://checkout.chapa.global/test1234', $order->chapaCheckoutUrl);
        $this->assertSame(15000, $order->gross_amount_cents);

        $attempt = StorefrontPaymentAttempt::query()->where('order_id', $order->id)->first();
        $this->assertNotNull($attempt);
        $this->assertSame('pending', $attempt->status);
        $this->assertSame('test1234', $attempt->chapa_reference);
    }

    public static function creatorPlanCases(): array
    {
        return [
            'free creator' => [false, CreatorVerificationAllowance::FREE_POLICY],
            'pro creator' => [true, CreatorVerificationAllowance::PRO_POLICY],
        ];
    }

    #[DataProvider('invalidProductCases')]
    public function testPlatformChapaCheckoutRejectsInvalidProducts(int $priceCents, string $currency): void
    {
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('isEnabled')->willReturn(true);
        $checkout = new ChapaStorefrontCheckout($manager, null, new AccountMonetizationStatus());

        $creator = new User(['id' => 30]);
        $product = new DigitalProduct([
            'id' => 103,
            'user_id' => 30,
            'price_cents' => $priceCents,
            'currency' => $currency,
        ]);

        $this->expectException(HttpException::class);
        $checkout->createPlatformOrder($product, null, ['name' => 'Buyer', 'email' => 'b@example.com'], $creator);
    }

    public static function invalidProductCases(): array
    {
        return [
            'non-ETB currency' => [1000, 'USD'],
            'price below 1 ETB' => [50, 'ETB'],
        ];
    }
}
