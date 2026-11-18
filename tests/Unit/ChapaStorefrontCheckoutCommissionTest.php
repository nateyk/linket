<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Commission\CommissionPolicy;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\AccountMonetizationStatus;
use App\Storefront\Services\ChapaStorefrontCheckout;
use App\Storefront\Services\StorefrontPaymentReferenceGenerator;
use Common\Billing\Models\Product;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ChapaStorefrontCheckoutCommissionTest extends TestCase
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
            $table->unsignedBigInteger('commission_plan_id')->nullable();
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

    public function testPlatformOrderSnapshotsProCommissionPolicy(): void
    {
        Http::fake([
            'https://api.chapa.co/v1/transaction/initialize' => Http::response([
                'status' => 'success',
                'data' => ['checkout_url' => 'https://checkout.chapa.co/checkout/payment/test1234'],
            ]),
        ]);
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('isEnabled')->willReturn(true);
        $manager->method('platformSecret')->willReturn('sec-test-commission');

        $plan = new Product(['id' => 99]);
        $commissionPolicy = new CommissionPolicy(
            bpsResolver: fn (User $u) => 300,
            planResolver: fn (User $u) => $plan,
        );

        $checkout = (new ChapaStorefrontCheckout(
            chapaManager: $manager,
            referenceGenerator: new StorefrontPaymentReferenceGenerator(fn (): bool => false),
            commissionPolicy: $commissionPolicy,
            monetizationStatus: new AccountMonetizationStatus(),
        ))->withProChecker(fn (User $u): bool => true);

        $creator = new User(['id' => 10, 'name' => 'Pro Creator']);
        $product = new DigitalProduct([
            'id' => 101,
            'user_id' => $creator->id,
            'workspace_id' => 1,
            'title' => 'Pro Course',
            'price_cents' => 15000,
            'currency' => 'ETB',
        ]);

        $order = $checkout->createPlatformOrder(
            $product,
            null,
            ['name' => 'Buyer', 'email' => 'buyer@example.com'],
            $creator
        );

        $this->assertSame(300, $order->commission_bps);
        $this->assertSame(99, $order->commission_plan_id);
        $this->assertSame(3.0, (float) $order->platform_fee_percent);
        $this->assertSame(450, (int) $order->platform_fee_cents);
        $this->assertSame(14550, (int) $order->creator_earnings_cents);
        $this->assertSame(15000, (int) $order->gross_amount_cents);
        $this->assertSame(15000, (int) ($order->platform_fee_cents + $order->creator_earnings_cents));
    }

    public function testPlatformOrderSnapshotsFreeCreatorCommission(): void
    {
        Http::fake([
            'https://api.chapa.co/v1/transaction/initialize' => Http::response([
                'status' => 'success',
                'data' => ['checkout_url' => 'https://checkout.chapa.co/checkout/payment/test1234'],
            ]),
        ]);
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('isEnabled')->willReturn(true);
        $manager->method('platformSecret')->willReturn('sec-test-commission');

        $commissionPolicy = new CommissionPolicy(
            bpsResolver: fn (User $u) => 1000,
            planResolver: fn (User $u) => null,
        );

        $checkout = (new ChapaStorefrontCheckout(
            chapaManager: $manager,
            referenceGenerator: new StorefrontPaymentReferenceGenerator(fn (): bool => false),
            commissionPolicy: $commissionPolicy,
            monetizationStatus: new AccountMonetizationStatus(),
        ))->withProChecker(fn (User $u): bool => false);

        $creator = new User(['id' => 20, 'name' => 'Free Creator']);
        $product = new DigitalProduct([
            'id' => 102,
            'user_id' => $creator->id,
            'workspace_id' => 1,
            'title' => 'Ebook',
            'price_cents' => 999,
            'currency' => 'ETB',
        ]);

        $order = $checkout->createPlatformOrder(
            $product,
            null,
            ['name' => 'Buyer', 'email' => 'buyer@example.com'],
            $creator
        );

        $this->assertSame(1000, $order->commission_bps);
        $this->assertNull($order->commission_plan_id);
        $this->assertSame(10.0, (float) $order->platform_fee_percent);
        $this->assertSame(100, (int) $order->platform_fee_cents);
        $this->assertSame(899, (int) $order->creator_earnings_cents);
        $this->assertSame(999, (int) $order->gross_amount_cents);
        $this->assertSame(999, (int) ($order->platform_fee_cents + $order->creator_earnings_cents));
    }
}
