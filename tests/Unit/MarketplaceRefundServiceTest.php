<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
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
use App\Storefront\Services\MarketplaceReconciliationService;
use App\Storefront\Services\PlatformOrderRefundRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;
use Tests\Unit\Support\MarketplaceMockConfig;
use Tests\Unit\Support\MarketplaceTestDatabaseTrait;

class MarketplaceRefundServiceTest extends TestCase
{
    use MarketplaceTestDatabaseTrait;

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
        $order = $this->seedPlatformOrder($creator, $this->creatorLedger);
        $this->createEntitlement($order);

        $this->bindMockChapaClient(MarketplaceMockConfig::forRefund('REF-CHAPA-123'));
        $request = PlatformOrderRefundRequest::forOrder($order, 100000, 'Customer dissatisfied', $admin->id);
        $refund = $this->refundService->refundPlatformOrder($request);

        $this->assertSame(100000, $refund->amount_cents);
        $this->assertSame(95000, $refund->creator_earnings_reversal_cents);
        $this->assertSame('REF-CHAPA-123', $refund->chapa_refund_reference);

        $order->refresh();
        $this->assertSame('refunded', $order->status);
        $this->assertNotNull(DownloadEntitlement::query()->where('storefront_order_id', $order->id)->first()->revoked_at);

        $balances = $this->creatorLedger->getBalances(BalanceQuery::for($creator->id, 'ETB', 1));
        $this->assertSame(0, $balances['held'] + $balances['available'] + $balances['deficit']);
        $this->assertTrue(app(MarketplaceReconciliationService::class)->auditLedgerIntegrity()->isBalanced);
    }

    public function testPartialRefundKeepsOrderStatusPaidAndPreservesAccess(): void
    {
        $creator = $this->seedUser(new User(['id' => 3, 'email' => 'seller_partial@test.com', 'name' => 'Seller']));
        $admin = $this->seedUser(new User(['id' => 4, 'email' => 'admin_partial@test.com', 'name' => 'Admin']));
        $order = $this->seedPlatformOrder($creator, $this->creatorLedger);
        $this->createEntitlement($order);

        $this->bindMockChapaClient(MarketplaceMockConfig::forRefund('REF-PARTIAL-999'));
        $request = PlatformOrderRefundRequest::forOrder($order, 40000, 'Partial adjustment', $admin->id);
        $refund = $this->refundService->refundPlatformOrder($request);

        $this->assertSame(40000, $refund->amount_cents);
        $this->assertSame(38000, $refund->creator_earnings_reversal_cents);

        $order->refresh();
        $this->assertSame('paid', $order->status);
        $this->assertNull(DownloadEntitlement::query()->where('storefront_order_id', $order->id)->first()->revoked_at);

        $balances = $this->creatorLedger->getBalances(BalanceQuery::for($creator->id, 'ETB', 1));
        $this->assertSame(57000, $balances['held']);
        $this->assertSame(0, $balances['deficit']);
        $this->assertTrue(app(MarketplaceReconciliationService::class)->auditLedgerIntegrity()->isBalanced);
    }

    public function testRefundAfterPayoutDisbursementRoutesToDeficitReceivable(): void
    {
        $creator = $this->seedUser(new User(['id' => 5, 'email' => 'seller_disbursed@test.com', 'name' => 'Seller']));
        $admin = $this->seedUser(new User(['id' => 6, 'email' => 'admin_disbursed@test.com', 'name' => 'Admin']));
        $order = $this->seedPlatformOrder($creator, $this->creatorLedger);

        $this->creatorLedger->releaseHeldToAvailable($order);
        $this->disburseEarnings($creator, $this->creatorLedger, 95000);

        $request = PlatformOrderRefundRequest::forOrder($order, 100000, 'Dispute', $admin->id)->withoutProviderCall();
        $this->refundService->refundPlatformOrder($request);

        $balances = $this->creatorLedger->getBalances(BalanceQuery::for($creator->id, 'ETB', 1));
        $this->assertSame(95000, $balances['deficit']);
        $this->assertSame(0, $this->creatorLedger->getWithdrawableBalance(BalanceQuery::for($creator->id, 'ETB', 1)));

        $newPayout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => $creator->id,
            'amount_cents' => 5000,
            'status' => 'requested',
        ]);
        $this->expectException(InsufficientBalanceException::class);
        $this->creatorLedger->reserveForPayout($newPayout);
    }

    public function testEscrowMaturationAutomaticallySettlesCreatorDeficits(): void
    {
        $creator = $this->seedUser(new User(['id' => 7, 'email' => 'seller_recovery@test.com', 'name' => 'Seller']));
        $admin = $this->seedUser(new User(['id' => 8, 'email' => 'admin_recovery@test.com', 'name' => 'Admin']));

        $order1 = $this->seedPlatformOrder($creator, $this->creatorLedger);
        $this->creatorLedger->releaseHeldToAvailable($order1);
        $this->disburseEarnings($creator, $this->creatorLedger, 95000);

        $this->refundService->refundPlatformOrder(
            PlatformOrderRefundRequest::forOrder($order1, 100000, 'Chargeback', $admin->id)->withoutProviderCall()
        );
        $this->seedPlatformOrder($creator, $this->creatorLedger, Carbon::now()->subDays(8));

        $reconcile = app(MarketplaceReconciliationService::class);
        $this->assertSame(1, $reconcile->releaseMaturedEscrow());

        $balances = $this->creatorLedger->getBalances(BalanceQuery::for($creator->id, 'ETB', 1));
        $this->assertSame(0, $balances['deficit'] + $balances['available'] + $balances['held']);
        $this->assertTrue($reconcile->auditLedgerIntegrity()->isBalanced);
    }

    public function testDuplicateRefundCallIsStrictlyIdempotent(): void
    {
        $creator = $this->seedUser(new User(['id' => 9, 'email' => 'seller_idemp@test.com', 'name' => 'Seller']));
        $admin = $this->seedUser(new User(['id' => 10, 'email' => 'admin_idemp@test.com', 'name' => 'Admin']));
        $order = $this->seedPlatformOrder($creator, $this->creatorLedger);

        $request = PlatformOrderRefundRequest::forOrder($order, 100000, 'Duplicate', $admin->id)
            ->withExternalReference('ext_ref_12345')
            ->withoutProviderCall();

        $refund1 = $this->refundService->refundPlatformOrder($request);
        $refund2 = $this->refundService->refundPlatformOrder($request);

        $this->assertSame($refund1->id, $refund2->id);
        $this->assertSame(1, DigitalProductPaymentRefund::query()->where('external_reference', 'ext_ref_12345')->count());
        $this->assertSame(1, StorefrontJournalLine::query()->where('account_code', AccountCodes::PLATFORM_COMMISSION)->where('debit_cents', 5000)->count());
    }
}
