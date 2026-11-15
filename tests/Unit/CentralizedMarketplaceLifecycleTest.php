<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Commission\CommissionPolicy;
use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Ledger\BalanceQuery;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Ledger\JournalPostingService;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontJournalEntry;
use App\Storefront\Models\StorefrontJournalLine;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\StorefrontPaymentReferenceGenerator;
use App\Storefront\Services\StorefrontPaymentVerificationService;
use App\Storefront\Services\StorefrontPayoutProcessingService;
use App\Storefront\StorefrontWebhookHandler;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Nateyk\Chapa\ChapaClient;
use Nateyk\Chapa\Http\RawResponse;
use Nateyk\Chapa\Http\Transport;
use Tests\TestCase;

class CentralizedMarketplaceLifecycleTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');

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

    protected function tearDown(): void
    {
        Schema::dropIfExists('storefront_payout_intents');
        Schema::dropIfExists('storefront_payment_attempts');
        Schema::dropIfExists('storefront_journal_lines');
        Schema::dropIfExists('storefront_journal_entries');
        Schema::dropIfExists('payout_requests');
        Schema::dropIfExists('storefront_order_items');
        Schema::dropIfExists('storefront_orders');
        Schema::dropIfExists('user_sessions');
        Schema::dropIfExists('users');
        parent::tearDown();
    }

    public function testCompleteMarketplaceLifecycleFromSaleToSettledPayout(): void
    {
        $creatorId = 42;
        $workspaceId = 1;
        $grossAmountCents = 150000; // 1,500.00 ETB

        \Illuminate\Support\Facades\DB::table('users')->insert([
            'id' => $creatorId,
            'name' => 'Creator User',
            'email' => 'creator42@test.com',
        ]);
        $creator = new \App\Models\User([
            'id' => $creatorId,
            'name' => 'Creator User',
            'email' => 'creator42@test.com',
        ]);

        // 1. Calculate & snapshot commission (10% platform commission on 1,500 ETB = 150 ETB fee, 1,350 ETB net)
        $commissionPolicy = new CommissionPolicy(
            bpsResolver: fn ($uid) => 1000,
            planResolver: fn ($uid) => new \Common\Billing\Models\Product(['id' => 1, 'name' => 'Free Plan']),
        );
        $snapshot = $commissionPolicy->calculate($creator, $grossAmountCents);
        $this->assertSame(15000, $snapshot->platformFeeCents);
        $this->assertSame(135000, $snapshot->creatorEarningsCents);
        $this->assertSame($grossAmountCents, $snapshot->platformFeeCents + $snapshot->creatorEarningsCents);

        // 2. Create platform Chapa storefront order with snapshot
        $order = StorefrontOrder::create([
            'uuid' => (string) Str::uuid(),
            'monetization_policy' => 'marketplace_v2',
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA,
            'creator_id' => $creatorId,
            'currency' => 'ETB',
            'gross_amount_cents' => $grossAmountCents,
            'commission_bps' => $snapshot->commissionBps,
            'commission_plan_id' => $snapshot->planId,
            'platform_fee_percent' => 10.0,
            'platform_fee_cents' => $snapshot->platformFeeCents,
            'creator_earnings_cents' => $snapshot->creatorEarningsCents,
            'status' => 'pending_payment',
        ]);

        // 3. Prepare payment attempt
        $refGen = new StorefrontPaymentReferenceGenerator();
        $merchantRef = $refGen->generate();
        $idempotencyKey = (string) Str::uuid();

        $attempt = StorefrontPaymentAttempt::create([
            'order_id' => $order->id,
            'merchant_reference' => $merchantRef,
            'idempotency_key' => $idempotencyKey,
            'status' => StorefrontPaymentAttempt::STATUS_PENDING,
            'currency' => 'ETB',
            'amount_cents' => $grossAmountCents,
        ]);
        $this->assertLessThanOrEqual(20, strlen($merchantRef));

        // 4. Verify & Fulfill payment via Chapa API
        $chapaClient = $this->createMockChapaClient(
            new MockChapaConfig(
                verifyPaymentStatus: 'SUCCESS',
                paymentAmount: $grossAmountCents,
                paymentCurrency: 'ETB',
                paymentRef: $merchantRef,
            ),
        );
        $chapaManager = $this->createMock(LinketChapaManager::class);
        $chapaManager->method('platformClient')->willReturn($chapaClient);

        $postingService = new JournalPostingService();
        $ledgerService = new CreatorLedgerService($postingService);
        $webhookHandler = $this->createMock(StorefrontWebhookHandler::class);
        $webhookHandler->expects($this->once())
            ->method('fulfill')
            ->with(
                $this->callback(fn (StorefrontOrder $o): bool => $o->id === $order->id),
                'buyer@test.com',
                $this->callback(fn (array $attrs): bool => $attrs['payment_gateway'] === 'chapa' && $attrs['chapa_tx_ref'] === $merchantRef),
            );

        $verificationService = new StorefrontPaymentVerificationService($chapaManager, $webhookHandler);

        $fulfilledOrder = $verificationService->verifyAndFulfill($merchantRef);
        $this->assertInstanceOf(StorefrontOrder::class, $fulfilledOrder);

        $attempt->refresh();
        $this->assertSame(StorefrontPaymentAttempt::STATUS_SUCCESSFUL, $attempt->status);

        // 5. Record platform sale on ledger & verify double-entry ledger lines balance and custody isolation
        $order->update(['status' => 'paid', 'payment_gateway' => 'chapa', 'chapa_tx_ref' => $merchantRef]);
        $ledgerService->recordPlatformSale($order);

        $journalEntry = StorefrontJournalEntry::where('source_type', 'order')
            ->where('source_id', $order->id)
            ->first();
        $this->assertNotNull($journalEntry);
        $lines = StorefrontJournalLine::where('journal_entry_id', $journalEntry->id)->get();
        $this->assertCount(3, $lines);
        $this->assertSame($lines->sum('debit_cents'), $lines->sum('credit_cents'));

        // 6. Mature held earnings to available balance
        $ledgerService->releaseHeldToAvailable($order);

        $query = BalanceQuery::for($creatorId, 'ETB');
        $balances = $ledgerService->getBalances($query);
        $this->assertSame(135000, $balances['available']);

        // 7. Creator requests withdrawal and reserves available funds
        $payoutRequest = PayoutRequest::create([
            'workspace_id' => $workspaceId,
            'creator_id' => $creatorId,
            'amount_cents' => $balances['available'],
            'currency' => 'ETB',
            'status' => 'requested',
            'payout_destination' => 'CBE:100012345678',
        ]);
        $ledgerService->reserveForPayout($payoutRequest, $balances['available']);

        // Available balance is now 0, reserved is 135000
        $balancesAfterReserve = $ledgerService->getBalances($query);
        $this->assertSame(0, $balancesAfterReserve['available']);
        $this->assertSame(135000, $balancesAfterReserve['reserved']);

        // 8. Prepare payout intent & submit payout to Chapa
        $payoutProcessingService = new StorefrontPayoutProcessingService(
            chapaManager: $chapaManager,
            creatorLedger: $ledgerService,
        );
        $intent = $payoutProcessingService->prepareIntent($payoutRequest);
        $this->assertSame(StorefrontPayoutIntent::STATUS_PREPARED, $intent->status);
        $this->assertStringStartsWith('lk-', $intent->merchant_reference);
        $this->assertLessThanOrEqual(20, strlen($intent->merchant_reference));

        $payoutProcessingService->submitPayout($intent);
        $intent->refresh();
        $payoutRequest->refresh();
        $this->assertSame(StorefrontPayoutIntent::STATUS_PROVIDER_PENDING, $intent->status);
        $this->assertSame('processing', $payoutRequest->status);

        // Funds remain in reserved liability during provider pending state
        $this->assertSame(135000, $ledgerService->getBalances($query)['reserved']);

        // 9. Verified settlement extinguishes creator liability
        $payoutProcessingService->verifyPayout($intent);
        $intent->refresh();
        $payoutRequest->refresh();

        $this->assertSame(StorefrontPayoutIntent::STATUS_SUCCESSFUL, $intent->status);
        $this->assertSame('paid', $payoutRequest->status);

        // Reserved liability is fully extinguished, zero remaining liability
        $finalBalances = $ledgerService->getBalances($query);
        $this->assertSame(0, $finalBalances['reserved']);
        $this->assertSame(0, $finalBalances['available']);
    }

    public function testFailedPayoutReleasesFundsBackToAvailableBalance(): void
    {
        $creatorId = 99;
        $workspaceId = 1;
        $amountCents = 75000;

        \Illuminate\Support\Facades\DB::table('users')->insert([
            'id' => $creatorId,
            'name' => 'Creator 99',
            'email' => 'creator99@test.com',
        ]);

        $postingService = new JournalPostingService();
        $ledgerService = new CreatorLedgerService($postingService);
        $query = BalanceQuery::for($creatorId, 'ETB');

        // Simulate matured sale
        $order = StorefrontOrder::create([
            'uuid' => (string) Str::uuid(),
            'monetization_policy' => 'marketplace_v2',
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA,
            'creator_id' => $creatorId,
            'currency' => 'ETB',
            'gross_amount_cents' => $amountCents,
            'platform_fee_cents' => 0,
            'creator_earnings_cents' => $amountCents,
            'status' => 'paid',
        ]);
        $ledgerService->recordPlatformSale($order);
        $ledgerService->releaseHeldToAvailable($order);

        $this->assertSame($amountCents, $ledgerService->getBalances($query)['available']);

        // Request payout
        $payout = PayoutRequest::create([
            'workspace_id' => $workspaceId,
            'creator_id' => $creatorId,
            'amount_cents' => $amountCents,
            'currency' => 'ETB',
            'status' => 'requested',
            'payout_destination' => 'CBE:100099999999',
        ]);
        $ledgerService->reserveForPayout($payout, $amountCents);
        $this->assertSame(0, $ledgerService->getBalances($query)['available']);
        $this->assertSame($amountCents, $ledgerService->getBalances($query)['reserved']);

        // Prepare & submit
        $chapaClient = $this->createMockChapaClient(
            new MockChapaConfig(
                verifyPayoutStatus: 'FAILED',
                payoutAmount: $amountCents,
            ),
        );
        $chapaManager = $this->createMock(LinketChapaManager::class);
        $chapaManager->method('platformClient')->willReturn($chapaClient);

        $processingService = new StorefrontPayoutProcessingService(
            chapaManager: $chapaManager,
            creatorLedger: $ledgerService,
        );
        $intent = $processingService->prepareIntent($payout);
        $processingService->submitPayout($intent);

        // Verification detects terminal failure and releases reserved funds
        $processingService->verifyPayout($intent);
        $intent->refresh();
        $payout->refresh();

        $this->assertSame(StorefrontPayoutIntent::STATUS_FAILED, $intent->status);
        $this->assertSame('rejected', $payout->status);

        // Reserved liability was released back to available balance with zero loss
        $this->assertSame(0, $ledgerService->getBalances($query)['reserved']);
        $this->assertSame($amountCents, $ledgerService->getBalances($query)['available']);
    }

    private function createMockChapaClient(?MockChapaConfig $config = null): ChapaClient
    {
        $cfg = $config ?? new MockChapaConfig();
        $transport = $this->createMock(Transport::class);
        $transport->method('send')->willReturnCallback(function (string $method, string $url) use ($cfg) {
            if (str_contains($url, '/v2/payouts') && $method === 'POST') {
                return new RawResponse(200, (string) json_encode([
                    'status' => 'success',
                    'message' => 'Transfer queued',
                    'data' => [
                        'status' => 'PENDING',
                        'chapa_reference' => 'TRF-12345',
                    ],
                ]));
            }

            if (str_contains($url, '/v2/payouts/') && str_contains($url, '/verify')) {
                preg_match('#/v2/payouts/([^/]+)/verify#', $url, $matches);
                $ref = $cfg->payoutRef ?? ($matches[1] ?? 'lk-po-unknown');
                return new RawResponse(200, (string) json_encode([
                    'status' => 'success',
                    'data' => [
                        'status' => $cfg->verifyPayoutStatus,
                        'merchant_reference' => $ref,
                        'chapa_reference' => 'CHP-PO-VERIFIED-99',
                        'amount' => $cfg->payoutAmount,
                        'currency' => 'ETB',
                    ],
                ]));
            }

            preg_match('#/v2/payments/([^/]+)/verify#', $url, $paymentMatches);
            $payRef = $cfg->paymentRef ?? ($paymentMatches[1] ?? 'lk-unknown');
            return new RawResponse(200, (string) json_encode([
                'status' => 'success',
                'data' => [
                    'status' => $cfg->verifyPaymentStatus,
                    'amount' => $cfg->paymentAmount,
                    'currency' => $cfg->paymentCurrency,
                    'merchant_reference' => $payRef,
                    'chapa_reference' => 'CHP-VERIFIED-99',
                    'email' => 'buyer@test.com',
                ],
            ]));
        });

        return new ChapaClient(
            privateKey: 'sec-test',
            webhookSecret: 'wh-secret',
            transport: $transport,
        );
    }
}

final class MockChapaConfig
{
    public function __construct(
        public string $verifyPaymentStatus = 'SUCCESS',
        public int $paymentAmount = 150000,
        public string $paymentCurrency = 'ETB',
        public ?string $paymentRef = null,
        public string $verifyPayoutStatus = 'SUCCESS',
        public int $payoutAmount = 135000,
        public ?string $payoutRef = null,
    ) {
    }
}
