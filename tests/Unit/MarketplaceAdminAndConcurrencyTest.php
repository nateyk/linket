<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Controllers\AdminDigitalProductRefundsController;
use App\Storefront\Controllers\AdminMarketplaceFinanceController;
use App\Storefront\Jobs\SendStorefrontReceipt;
use App\Storefront\Ledger\BalanceQuery;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Ledger\JournalPostingService;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\Services\StorefrontPaymentVerificationService;
use App\Storefront\StorefrontWebhookHandler;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;
use Tests\Unit\Support\MarketplaceMockConfig;
use Tests\Unit\Support\MarketplaceTestDatabaseTrait;

class MarketplaceAdminAndConcurrencyTest extends TestCase
{
    use MarketplaceTestDatabaseTrait;

    private CreatorLedgerService $creatorLedger;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('store.payout_hold_days', 7);
        Queue::fake([SendStorefrontReceipt::class]);
        Mail::fake();
        Notification::fake();

        $this->createCoreTables();
        $this->createStorefrontTables();
        $this->createLedgerTables();

        $this->creatorLedger = new CreatorLedgerService(new JournalPostingService());
        $this->app->instance(CreatorLedgerService::class, $this->creatorLedger);
    }

    protected function tearDown(): void
    {
        $this->dropAllTables();
        parent::tearDown();
    }

    public function testAdminOrderRefundEndpointExecutesRefund(): void
    {
        $admin = $this->seedUser(new User(['id' => 11, 'email' => 'finance_admin@test.com', 'name' => 'Finance Admin']));
        $this->actingAs($admin);
        Gate::define('admin.access', fn () => true);

        $this->bindMockChapaClient(MarketplaceMockConfig::forRefund('REF-ADMIN-555'));

        $creator = $this->seedUser(new User(['id' => 12, 'email' => 'seller_admin_test@test.com', 'name' => 'Seller']));
        $order = $this->seedPlatformOrder($creator, $this->creatorLedger);

        $refundController = new AdminDigitalProductRefundsController();
        $refundRequest = Request::create(
            "/api/v1/admin/storefront-orders/{$order->id}/refunds",
            'POST',
            ['amount_cents' => 50000, 'reason' => 'Admin discretionary refund', 'external_reference' => 'admin_ref_777']
        );
        $refundRequest->setUserResolver(fn () => $admin);

        $refundResponse = $refundController->storePlatformOrder($refundRequest, $order);
        $this->assertSame(50000, $refundResponse['data']['amount_cents']);
        $this->assertSame('admin_ref_777', $refundResponse['data']['external_reference']);
    }

    public function testAdminFinancialSummaryProvidesAuditAndPendingCounts(): void
    {
        $admin = $this->seedUser(new User(['id' => 13, 'email' => 'finance_summary_admin@test.com', 'name' => 'Finance Admin']));
        $this->actingAs($admin);
        Gate::define('admin.access', fn () => true);

        $financeController = new AdminMarketplaceFinanceController();
        $summaryRequest = Request::create('/api/v1/admin/marketplace/financial-summary', 'GET');
        $summaryRequest->setUserResolver(fn () => $admin);

        $summary = $financeController->summary($summaryRequest);
        $this->assertTrue($summary['data']['ledger_audit']['is_balanced']);
        $this->assertSame(0, $summary['data']['ledger_audit']['issues_count']);
    }

    public function testAdminReconcileEndpointExecutesReconciliation(): void
    {
        $admin = $this->seedUser(new User(['id' => 14, 'email' => 'finance_reconcile_admin@test.com', 'name' => 'Finance Admin']));
        $this->actingAs($admin);
        Gate::define('admin.access', fn () => true);

        $financeController = new AdminMarketplaceFinanceController();
        $reconcileRequest = Request::create('/api/v1/admin/marketplace/reconcile', 'POST', ['dry_run' => false]);
        $reconcileRequest->setUserResolver(fn () => $admin);

        $reconcileResponse = $financeController->reconcile($reconcileRequest);
        $this->assertTrue($reconcileResponse['data']['is_healthy']);
        $this->assertTrue($reconcileResponse['data']['ledger_audit']['is_balanced']);
    }

    public function testDuplicateWebhookDeliveryCompletesIdempotentlyWithoutDuplicateFulfillment(): void
    {
        $creator = $this->seedUser(new User(['id' => 15, 'email' => 'seller_concurrent@test.com', 'name' => 'Seller']));
        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'monetization_policy' => 'marketplace_v2',
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA,
            'digital_product_id' => 1,
            'creator_id' => $creator->id,
            'currency' => 'ETB',
            'gross_amount_cents' => 50000,
            'commission_bps' => 500,
            'platform_fee_cents' => 2500,
            'creator_earnings_cents' => 47500,
            'status' => 'pending_payment',
            'payment_gateway' => 'chapa',
            'chapa_tx_ref' => 'chp_tx_conc_123',
        ]);

        StorefrontPaymentAttempt::query()->create([
            'order_id' => $order->id,
            'merchant_reference' => 'chp_tx_conc_123',
            'idempotency_key' => (string) Str::uuid(),
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'status' => StorefrontPaymentAttempt::STATUS_PENDING,
        ]);

        $this->bindMockChapaClient(MarketplaceMockConfig::forPayment('chp_tx_conc_123', 50000));

        $verificationService = new StorefrontPaymentVerificationService(
            app(LinketChapaManager::class),
            new StorefrontWebhookHandler(),
        );

        $result1 = $verificationService->verifyAndFulfill('chp_tx_conc_123');
        $result2 = $verificationService->verifyAndFulfill('chp_tx_conc_123');

        $this->assertSame($result1->id, $result2->id);
        $this->assertSame('paid', $result1->status);

        $saleEntries = $order->journalEntries()->where('event_type', 'sale_settled')->count();
        $this->assertSame(1, $saleEntries);

        $balances = $this->creatorLedger->getBalances(BalanceQuery::for($creator->id, 'ETB', 1));
        $this->assertSame(47500, $balances['held']);
        $this->assertSame(0, $balances['available']);
    }
}
