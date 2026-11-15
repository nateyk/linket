<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Controllers\AdminDigitalProductRefundsController;
use App\Storefront\Controllers\AdminMarketplaceFinanceController;
use App\Storefront\DigitalProductRefundService;
use App\Storefront\Jobs\SendStorefrontReceipt;
use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Ledger\BalanceQuery;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Ledger\Exceptions\InsufficientBalanceException;
use App\Storefront\Ledger\JournalPostingService;
use App\Storefront\Models\DigitalProductPaymentRefund;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontJournalLine;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\MarketplaceReconciliationService;
use App\Storefront\Services\PlatformOrderRefundRequest;
use App\Storefront\Services\StorefrontPaymentVerificationService;
use App\Storefront\StorefrontWebhookHandler;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Nateyk\Chapa\ChapaClient;
use Nateyk\Chapa\Http\RawResponse;
use Nateyk\Chapa\Http\Transport;
use Tests\TestCase;

class MarketplaceRefundAndHardeningTest extends TestCase
{
    private CreatorLedgerService $creatorLedger;
    private DigitalProductRefundService $refundService;

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
        $this->refundService = new DigitalProductRefundService();
        $this->app->instance(CreatorLedgerService::class, $this->creatorLedger);
        $this->app->instance(DigitalProductRefundService::class, $this->refundService);
    }

    protected function tearDown(): void
    {
        $this->dropAllTables();
        parent::tearDown();
    }

    public function testFullRefundReversesCommissionAndHeldLiabilityWithCustomerRevocation(): void
    {
        $creator = $this->seedUser(new User(['id' => 1, 'email' => 'seller_full@test.com', 'name' => 'Seller']));
        $admin = $this->seedUser(new User(['id' => 2, 'email' => 'admin_full@test.com', 'name' => 'Admin']));
        $order = $this->seedPlatformOrder($creator);
        $this->createEntitlement($order);

        $this->bindMockChapaClient(RefundHardeningMockConfig::forRefund('REF-CHAPA-123'));

        $request = PlatformOrderRefundRequest::forOrder($order, 100000, 'Customer dissatisfied', $admin->id);
        $refund = $this->refundService->refundPlatformOrder($request);

        $this->assertSame(100000, $refund->amount_cents);
        $this->assertSame(95000, $refund->creator_earnings_reversal_cents);
        $this->assertSame(5000, $refund->platform_fee_reversal_cents);
        $this->assertSame('REF-CHAPA-123', $refund->chapa_refund_reference);

        $order->refresh();
        $this->assertSame('refunded', $order->status);

        $entitlement = DownloadEntitlement::query()->where('storefront_order_id', $order->id)->first();
        $this->assertNotNull($entitlement->revoked_at);

        $balances = $this->creatorLedger->getBalances(BalanceQuery::for($creator->id, 'ETB', 1));
        $this->assertSame(0, $balances['held']);
        $this->assertSame(0, $balances['available']);
        $this->assertSame(0, $balances['deficit']);

        $audit = app(MarketplaceReconciliationService::class)->auditLedgerIntegrity();
        $this->assertTrue($audit->isBalanced);
        $this->assertEmpty($audit->issues);
    }

    public function testPartialRefundKeepsOrderStatusPaidAndPreservesAccess(): void
    {
        $creator = $this->seedUser(new User(['id' => 3, 'email' => 'seller_partial@test.com', 'name' => 'Seller']));
        $admin = $this->seedUser(new User(['id' => 4, 'email' => 'admin_partial@test.com', 'name' => 'Admin']));
        $order = $this->seedPlatformOrder($creator);
        $this->createEntitlement($order);

        $this->bindMockChapaClient(RefundHardeningMockConfig::forRefund('REF-PARTIAL-999'));

        $request = PlatformOrderRefundRequest::forOrder($order, 40000, 'Partial adjustment', $admin->id);
        $refund = $this->refundService->refundPlatformOrder($request);

        $this->assertSame(40000, $refund->amount_cents);
        $this->assertSame(38000, $refund->creator_earnings_reversal_cents);
        $this->assertSame(2000, $refund->platform_fee_reversal_cents);

        $order->refresh();
        $this->assertSame('paid', $order->status);

        $entitlement = DownloadEntitlement::query()->where('storefront_order_id', $order->id)->first();
        $this->assertNull($entitlement->revoked_at);

        $balances = $this->creatorLedger->getBalances(BalanceQuery::for($creator->id, 'ETB', 1));
        $this->assertSame(57000, $balances['held']);
        $this->assertSame(0, $balances['deficit']);

        $audit = app(MarketplaceReconciliationService::class)->auditLedgerIntegrity();
        $this->assertTrue($audit->isBalanced);
    }

    public function testRefundAfterPayoutDisbursementRoutesToDeficitReceivable(): void
    {
        $creator = $this->seedUser(new User(['id' => 5, 'email' => 'seller_disbursed@test.com', 'name' => 'Seller']));
        $admin = $this->seedUser(new User(['id' => 6, 'email' => 'admin_disbursed@test.com', 'name' => 'Admin']));
        $order = $this->seedPlatformOrder($creator);

        $this->creatorLedger->releaseHeldToAvailable($order);

        $payout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => $creator->id,
            'amount_cents' => 95000,
            'currency' => 'ETB',
            'status' => 'paid',
        ]);
        $this->creatorLedger->reserveForPayout($payout);
        $this->creatorLedger->disbursePayout($payout);

        $balancesBeforeRefund = $this->creatorLedger->getBalances(BalanceQuery::for($creator->id, 'ETB', 1));
        $this->assertSame(0, $balancesBeforeRefund['held']);
        $this->assertSame(0, $balancesBeforeRefund['available']);
        $this->assertSame(0, $balancesBeforeRefund['reserved']);
        $this->assertSame(0, $balancesBeforeRefund['deficit']);

        $request = PlatformOrderRefundRequest::forOrder($order, 100000, 'Dispute', $admin->id)->withoutProviderCall();
        $this->refundService->refundPlatformOrder($request);

        $balancesAfterRefund = $this->creatorLedger->getBalances(BalanceQuery::for($creator->id, 'ETB', 1));
        $this->assertSame(0, $balancesAfterRefund['held']);
        $this->assertSame(0, $balancesAfterRefund['available']);
        $this->assertSame(95000, $balancesAfterRefund['deficit']);

        $withdrawable = $this->creatorLedger->getWithdrawableBalance(BalanceQuery::for($creator->id, 'ETB', 1));
        $this->assertSame(0, $withdrawable);

        $newPayout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => $creator->id,
            'amount_cents' => 5000,
            'currency' => 'ETB',
            'status' => 'requested',
        ]);

        $this->expectException(InsufficientBalanceException::class);
        $this->creatorLedger->reserveForPayout($newPayout);
    }

    public function testEscrowMaturationAutomaticallySettlesCreatorDeficits(): void
    {
        $creator = $this->seedUser(new User(['id' => 7, 'email' => 'seller_recovery@test.com', 'name' => 'Seller']));
        $admin = $this->seedUser(new User(['id' => 8, 'email' => 'admin_recovery@test.com', 'name' => 'Admin']));

        $order1 = $this->seedPlatformOrder($creator);
        $this->creatorLedger->releaseHeldToAvailable($order1);
        $payout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => $creator->id,
            'amount_cents' => 95000,
            'currency' => 'ETB',
            'status' => 'paid',
        ]);
        $this->creatorLedger->reserveForPayout($payout);
        $this->creatorLedger->disbursePayout($payout);

        $this->refundService->refundPlatformOrder(
            PlatformOrderRefundRequest::forOrder($order1, 100000, 'Chargeback', $admin->id)->withoutProviderCall()
        );

        $this->assertSame(95000, $this->creatorLedger->getBalances(BalanceQuery::for($creator->id, 'ETB', 1))['deficit']);

        $order2 = $this->seedPlatformOrder($creator, Carbon::now()->subDays(8));

        $reconciliationService = app(MarketplaceReconciliationService::class);
        $matured = $reconciliationService->releaseMaturedEscrow();

        $this->assertSame(1, $matured);

        $balancesAfter = $this->creatorLedger->getBalances(BalanceQuery::for($creator->id, 'ETB', 1));
        $this->assertSame(0, $balancesAfter['deficit']);
        $this->assertSame(0, $balancesAfter['available']);
        $this->assertSame(0, $balancesAfter['held']);

        $audit = $reconciliationService->auditLedgerIntegrity();
        $this->assertTrue($audit->isBalanced);
        $this->assertEmpty($audit->issues);
    }

    public function testDuplicateRefundCallIsStrictlyIdempotent(): void
    {
        $creator = $this->seedUser(new User(['id' => 9, 'email' => 'seller_idemp@test.com', 'name' => 'Seller']));
        $admin = $this->seedUser(new User(['id' => 10, 'email' => 'admin_idemp@test.com', 'name' => 'Admin']));
        $order = $this->seedPlatformOrder($creator);

        $request = PlatformOrderRefundRequest::forOrder($order, 100000, 'Accidental duplicate', $admin->id)
            ->withExternalReference('ext_ref_12345')
            ->withoutProviderCall();

        $refund1 = $this->refundService->refundPlatformOrder($request);
        $refund2 = $this->refundService->refundPlatformOrder($request);

        $this->assertSame($refund1->id, $refund2->id);
        $this->assertSame(1, DigitalProductPaymentRefund::query()->where('external_reference', 'ext_ref_12345')->count());
        $this->assertSame(1, StorefrontJournalLine::query()->where('account_code', AccountCodes::PLATFORM_COMMISSION)->where('debit_cents', 5000)->count());
    }

    public function testAdminOrderRefundEndpointExecutesRefund(): void
    {
        $admin = $this->seedUser(new User(['id' => 11, 'email' => 'finance_admin@test.com', 'name' => 'Finance Admin']));
        $this->actingAs($admin);
        Gate::define('admin.access', fn () => true);

        $this->bindMockChapaClient(RefundHardeningMockConfig::forRefund('REF-ADMIN-555'));

        $creator = $this->seedUser(new User(['id' => 12, 'email' => 'seller_admin_test@test.com', 'name' => 'Seller']));
        $order = $this->seedPlatformOrder($creator);

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

        $this->bindMockChapaClient(RefundHardeningMockConfig::forPayment('chp_tx_conc_123', 50000));

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

    private function createCoreTables(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->default('Creator');
            $table->string('email')->unique();
            $table->timestamps();
        });

        Schema::create('user_sessions', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->timestamps();
        });

        Schema::create('digital_products', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('workspace_id')->default(1);
            $table->unsignedBigInteger('user_id')->default(1);
            $table->string('name')->default('Digital Asset');
            $table->string('type', 32)->default('digital');
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('file_entries', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->default('File');
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('digital_product_files', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('digital_product_id');
            $table->unsignedBigInteger('file_entry_id');
            $table->timestamps();
        });

        DB::table('digital_products')->insert([
            'id' => 1,
            'workspace_id' => 1,
            'user_id' => 1,
            'name' => 'Digital Asset',
            'type' => 'digital',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createStorefrontTables(): void
    {
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
            $table->timestamp('receipt_sent_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });

        Schema::create('download_entitlements', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('storefront_order_id');
            $table->unsignedBigInteger('file_entry_id')->default(1);
            $table->uuid('token');
            $table->unsignedInteger('download_limit')->default(5);
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
        });

        Schema::create('reviews', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('storefront_order_id');
            $table->timestamps();
        });
    }

    private function createLedgerTables(): void
    {
        Schema::create('digital_product_earnings_ledger', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->nullable();
            $table->string('source_key')->nullable();
            $table->unsignedBigInteger('workspace_id')->nullable();
            $table->unsignedBigInteger('creator_id')->nullable();
            $table->unsignedBigInteger('storefront_order_id')->nullable();
            $table->unsignedBigInteger('payout_request_id')->nullable();
            $table->string('entry_type');
            $table->bigInteger('amount_cents');
            $table->string('currency', 12);
            $table->timestamp('available_at')->nullable();
            $table->string('description')->nullable();
            $table->text('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('digital_product_payment_refunds', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('payment_transaction_id')->nullable();
            $table->unsignedBigInteger('storefront_order_id');
            $table->unsignedInteger('recorded_by');
            $table->unsignedBigInteger('amount_cents');
            $table->unsignedBigInteger('creator_earnings_reversal_cents');
            $table->unsignedBigInteger('platform_fee_reversal_cents');
            $table->string('currency', 12);
            $table->string('external_reference')->nullable();
            $table->string('chapa_refund_reference', 190)->nullable();
            $table->string('status', 32)->default('completed');
            $table->text('reason');
            $table->timestamp('refunded_at');
            $table->timestamps();
        });

        Schema::create('payout_requests', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('workspace_id')->default(1);
            $table->unsignedBigInteger('creator_id');
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency', 12)->default('ETB');
            $table->string('status', 32)->default('requested');
            $table->text('payout_destination')->nullable();
            $table->string('transfer_reference', 64)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });

        (new (require database_path('migrations/2026_11_14_200000_create_storefront_journal_tables.php')))->up();
        (new (require database_path('migrations/2026_11_14_210000_create_storefront_payment_attempts_table.php')))->up();
        (new (require database_path('migrations/2026_11_14_220000_create_storefront_payout_intents_table.php')))->up();
    }

    private function dropAllTables(): void
    {
        Schema::dropIfExists('storefront_payout_intents');
        Schema::dropIfExists('storefront_payment_attempts');
        Schema::dropIfExists('storefront_journal_lines');
        Schema::dropIfExists('storefront_journal_entries');
        Schema::dropIfExists('payout_requests');
        Schema::dropIfExists('digital_product_payment_refunds');
        Schema::dropIfExists('digital_product_earnings_ledger');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('download_entitlements');
        Schema::dropIfExists('digital_product_files');
        Schema::dropIfExists('file_entries');
        Schema::dropIfExists('digital_products');
        Schema::dropIfExists('storefront_orders');
        Schema::dropIfExists('user_sessions');
        Schema::dropIfExists('users');
    }

    private function seedUser(User $user): User
    {
        DB::table('users')->insert([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ]);

        return $user;
    }

    private function seedPlatformOrder(User $creator, ?Carbon $paidAt = null): StorefrontOrder
    {
        $gross = 100000;
        $fee = 5000;

        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'monetization_policy' => 'marketplace_v2',
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA,
            'digital_product_id' => 1,
            'creator_id' => $creator->id,
            'currency' => 'ETB',
            'gross_amount_cents' => $gross,
            'commission_bps' => 500,
            'platform_fee_cents' => $fee,
            'creator_earnings_cents' => $gross - $fee,
            'status' => 'paid',
            'payment_gateway' => 'chapa',
            'chapa_tx_ref' => 'chp_tx_' . Str::random(12),
            'paid_at' => $paidAt ?? Carbon::now(),
        ]);

        StorefrontPaymentAttempt::query()->create([
            'order_id' => $order->id,
            'merchant_reference' => $order->chapa_tx_ref,
            'chapa_reference' => 'chapa_ref_' . Str::random(10),
            'idempotency_key' => (string) Str::uuid(),
            'amount_cents' => $gross,
            'currency' => 'ETB',
            'status' => StorefrontPaymentAttempt::STATUS_SUCCESSFUL,
        ]);

        $this->creatorLedger->recordPlatformSale($order);

        return $order;
    }

    private function createEntitlement(StorefrontOrder $order): DownloadEntitlement
    {
        return DownloadEntitlement::query()->create([
            'storefront_order_id' => $order->id,
            'file_entry_id' => 1,
            'token' => (string) Str::uuid(),
        ]);
    }

    private function bindMockChapaClient(RefundHardeningMockConfig $config): void
    {
        $mockClient = $this->createMockChapaClient($config);
        $manager = new LinketChapaManager();
        $manager->swapClient($mockClient);
        $this->app->instance(LinketChapaManager::class, $manager);
    }

    private function createMockChapaClient(RefundHardeningMockConfig $config): ChapaClient
    {
        $transport = $this->createMock(Transport::class);
        $transport->method('send')->willReturnCallback(function () use ($config) {
            $data = [
                'reference' => $config->reference,
                'chapa_reference' => $config->reference,
                'status' => $config->status,
                'amount' => $config->amount,
                'currency' => 'ETB',
            ];
            if (!$config->isRefund) {
                $data['merchant_reference'] = $config->reference;
                $data['email'] = 'buyer@test.com';
            }

            return new RawResponse(200, (string) json_encode(['status' => 'success', 'data' => $data]));
        });

        return new ChapaClient(privateKey: 'chapa-test-mock-secret', transport: $transport);
    }
}

final class RefundHardeningMockConfig
{
    public string $status = 'SUCCESS';
    public string $reference = 'ref';
    public int $amount = 100000;
    public bool $isRefund = true;

    public static function forRefund(string $ref): self
    {
        $cfg = new self();
        $cfg->reference = $ref;
        $cfg->isRefund = true;

        return $cfg;
    }

    public static function forPayment(string $ref, int $amount): self
    {
        $cfg = new self();
        $cfg->reference = $ref;
        $cfg->amount = $amount;
        $cfg->isRefund = false;

        return $cfg;
    }
}
