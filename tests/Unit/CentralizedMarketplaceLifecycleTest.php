<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Commission\CommissionPolicy;
use App\Storefront\ChapaPayoutService;
use App\Storefront\DigitalProductFinance;
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
use Common\Billing\Models\Product;
use Illuminate\Database\Schema\Blueprint;
use App\Payments\Chapa\ChapaV2Client;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Nateyk\Chapa\ChapaClient;
use Nateyk\Chapa\Http\RawResponse;
use Nateyk\Chapa\Http\Transport;
use PHPUnit\Framework\Attributes\TestWith;
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

        // Ledger hold release includes completed refund reversals.
        Schema::create('digital_product_payment_refunds', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('storefront_order_id');
            $table->string('status', 32)->default('completed');
            $table->unsignedBigInteger('creator_earnings_reversal_cents')->default(0);
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
        Schema::dropIfExists('digital_product_payment_refunds');
        Schema::dropIfExists('storefront_order_items');
        Schema::dropIfExists('storefront_orders');
        Schema::dropIfExists('user_sessions');
        Schema::dropIfExists('users');
        parent::tearDown();
    }

    public function testStorefrontPurchaseCommissionSnapshotAndLedgerPosting(): void
    {
        $creatorId = 42;
        $grossAmountCents = 150000;
        $this->seedCreator($creatorId, 'creator42@test.com');

        $commissionPolicy = new CommissionPolicy(
            bpsResolver: fn ($uid): int => 1000,
            planResolver: fn ($uid): Product => new Product(['id' => 1, 'name' => 'Free Plan']),
        );
        $snapshot = $commissionPolicy->calculate(new User(['id' => $creatorId]), $grossAmountCents);
        $this->assertSame(15000, $snapshot->platformFeeCents);
        $this->assertSame(135000, $snapshot->creatorEarningsCents);

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

        $merchantRef = (new StorefrontPaymentReferenceGenerator())->generate();
        $attempt = StorefrontPaymentAttempt::create([
            'order_id' => $order->id,
            'merchant_reference' => $merchantRef,
            'idempotency_key' => (string) Str::uuid(),
            'status' => StorefrontPaymentAttempt::STATUS_PENDING,
            'currency' => 'ETB',
            'amount_cents' => $grossAmountCents,
        ]);

        Http::fake([
            'https://api.chapa.co/v1/transaction/verify/'.$merchantRef => Http::response([
                'status' => 'success',
                'data' => [
                    'status' => 'success',
                    'amount' => ChapaV2Client::majorFromCents($grossAmountCents),
                    'currency' => 'ETB',
                    'tx_ref' => $merchantRef,
                    'reference' => 'CHP-VERIFIED-99',
                    'email' => 'buyer@test.com',
                ],
            ]),
        ]);
        $chapaManager = $this->createMock(LinketChapaManager::class);
        $chapaManager->method('platformSecret')->willReturn('platform-secret');

        $webhookHandler = $this->createMock(StorefrontWebhookHandler::class);
        $webhookHandler->expects($this->once())->method('fulfill');

        $verificationService = new StorefrontPaymentVerificationService($chapaManager, $webhookHandler);
        $verificationService->verifyAndFulfill($merchantRef);

        $attempt->refresh();
        $this->assertSame(StorefrontPaymentAttempt::STATUS_SUCCESSFUL, $attempt->status);

        $ledgerService = new CreatorLedgerService(new JournalPostingService());
        $order->update(['status' => 'paid', 'payment_gateway' => 'chapa', 'chapa_tx_ref' => $merchantRef]);
        $ledgerService->recordPlatformSale($order);

        $journalEntry = StorefrontJournalEntry::where('source_type', 'order')->where('source_id', $order->id)->first();
        $this->assertNotNull($journalEntry);
        $lines = StorefrontJournalLine::where('journal_entry_id', $journalEntry->id)->get();
        $this->assertCount(3, $lines);
        $this->assertSame($lines->sum('debit_cents'), $lines->sum('credit_cents'));

        $ledgerService->releaseHeldToAvailable($order);
        $balances = $ledgerService->getBalances(BalanceQuery::for($creatorId, 'ETB'));
        $this->assertSame(135000, $balances['available']);
    }

    public function testCreatorPayoutReservationAndVerifiedSettlement(): void
    {
        $creatorId = 42;
        $workspaceId = 1;
        $amountCents = 135000;
        $this->seedCreator($creatorId, 'creator42_payout@test.com');

        $ledgerService = new CreatorLedgerService(new JournalPostingService());
        $this->seedMaturedSale($creatorId, $amountCents, $ledgerService);

        $query = BalanceQuery::for($creatorId, 'ETB');
        $this->assertSame($amountCents, $ledgerService->getBalances($query)['available']);

        $payoutRequest = PayoutRequest::create([
            'workspace_id' => $workspaceId,
            'creator_id' => $creatorId,
            'amount_cents' => $amountCents,
            'currency' => 'ETB',
            'status' => 'processing',
            'payout_destination' => 'CBE:100012345678',
        ]);
        $ledgerService->reserveForPayout($payoutRequest, $amountCents);

        $balancesAfterReserve = $ledgerService->getBalances($query);
        $this->assertSame(0, $balancesAfterReserve['available']);
        $this->assertSame($amountCents, $balancesAfterReserve['reserved']);

        $provider = $this->createMock(ChapaPayoutService::class);
        $provider->method('createTransfer')->willReturnCallback(
            fn (StorefrontPayoutIntent $intent): array => [
                'status' => 'success',
                'message' => 'Transfer Queued Successfully',
                'data' => ['reference' => $intent->merchant_reference, 'status' => 'pending'],
            ],
        );
        $provider->method('verifyTransfer')->willReturnCallback(fn (string $ref): array => [
            'status' => 'success',
            'data' => ['status' => 'success', 'reference' => $ref, 'amount' => '1350.00', 'currency' => 'ETB'],
        ]);
        $payoutProcessingService = new StorefrontPayoutProcessingService(
            creatorLedger: $ledgerService,
            chapaPayoutService: $provider,
        );

        $intent = $payoutProcessingService->prepareIntent($payoutRequest);
        $this->assertSame(StorefrontPayoutIntent::STATUS_PREPARED, $intent->status);

        $payoutProcessingService->submitPayout($intent);
        $this->assertSame(StorefrontPayoutIntent::STATUS_PROVIDER_PENDING, $intent->fresh()->status);
        $this->assertSame($amountCents, $ledgerService->getBalances($query)['reserved']);

        $payoutProcessingService->verifyPayout($intent);
        $this->assertSame(StorefrontPayoutIntent::STATUS_SUCCESSFUL, $intent->fresh()->status);
        $this->assertSame('paid', $payoutRequest->fresh()->status);

        $finalBalances = $ledgerService->getBalances($query);
        $this->assertSame(0, $finalBalances['reserved']);
        $this->assertSame(0, $finalBalances['available']);
    }

    #[TestWith(['failed', 5.00, 0.00])]
    #[TestWith(['failed/cancelled', 5.00, 0.00])]
    #[TestWith(['failed/cancelled', 4.90, 0.10])]
    public function testFailedPayoutReleasesFundsBackToAvailableBalance(string $providerStatus, float $amount, float $charge): void
    {
        $creatorId = 99;
        $workspaceId = 1;
        $amountCents = 500;
        $this->seedCreator($creatorId, 'creator99@test.com');
        $manager = $this->createStub(LinketChapaManager::class);
        $manager->method('platformSecret')->willReturn('CHASECK-fixture');
        $this->app->instance(LinketChapaManager::class, $manager);

        $ledgerService = new CreatorLedgerService(new JournalPostingService());
        $this->seedMaturedSale($creatorId, $amountCents, $ledgerService);

        $query = BalanceQuery::for($creatorId, 'ETB');
        $payout = PayoutRequest::create([
            'workspace_id' => $workspaceId,
            'creator_id' => $creatorId,
            'amount_cents' => $amountCents,
            'currency' => 'ETB',
            'status' => 'processing',
            'payout_destination' => '0900000001',
        ]);
        $ledgerService->reserveForPayout($payout, $amountCents);

        $provider = $this->createMock(ChapaPayoutService::class);
        $provider->method('createTransfer')->willReturnCallback(
            fn (StorefrontPayoutIntent $intent): array => [
                'status' => 'success',
                'message' => 'Transfer Queued Successfully',
                'data' => ['reference' => $intent->merchant_reference, 'status' => 'pending'],
            ],
        );
        $provider->method('verifyTransfer')->willReturnCallback(fn (string $ref): array => [
            'status' => 'success',
            'data' => [
                'status' => $providerStatus, 'tx_ref' => $ref, 'amount' => $amount, 'currency' => 'ETB',
                'charge' => $charge, 'account_number' => '251900000001', 'mode' => 'live',
            ],
        ]);
        $processingService = new StorefrontPayoutProcessingService(
            creatorLedger: $ledgerService,
            chapaPayoutService: $provider,
        );

        $finance = $this->createMock(DigitalProductFinance::class);
        $finance->expects($this->once())->method('record');
        $this->app->instance(DigitalProductFinance::class, $finance);

        $intent = $processingService->prepareIntent($payout);
        $processingService->submitPayout($intent);

        $processingService->verifyPayout($intent);
        $this->assertSame(StorefrontPayoutIntent::STATUS_FAILED, $intent->fresh()->status);
        $processingService->verifyPayout($intent->fresh());
        $this->assertSame('rejected', $payout->fresh()->status);

        $this->assertSame(0, $ledgerService->getBalances($query)['reserved']);
        $this->assertSame($amountCents, $ledgerService->getBalances($query)['available']);
    }

    private function seedCreator(int $id, string $email): void
    {
        DB::table('users')->insert([
            'id' => $id,
            'name' => 'Creator User',
            'email' => $email,
        ]);
    }

    private function seedMaturedSale(int $creatorId, int $amountCents, CreatorLedgerService $ledgerService): void
    {
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
        // The standalone fixture does not have a products/workspaces table.
        // Attribute its funded journal lines to the same workspace used by
        // the synthetic payout request, rather than weakening payout guards.
        StorefrontJournalLine::query()
            ->where('creator_id', $creatorId)
            ->update(['workspace_id' => 1]);
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
    public string $verifyPaymentStatus = 'SUCCESS';
    public int $paymentAmount = 150000;
    public string $paymentCurrency = 'ETB';
    public ?string $paymentRef = null;
    public string $verifyPayoutStatus = 'SUCCESS';
    public int $payoutAmount = 135000;
    public ?string $payoutRef = null;

    public static function forPayment(string $status, int $amount, string $ref): self
    {
        $cfg = new self();
        $cfg->verifyPaymentStatus = $status;
        $cfg->paymentAmount = $amount;
        $cfg->paymentRef = $ref;
        return $cfg;
    }

    public static function forPayout(string $status, int $amount, ?string $ref = null): self
    {
        $cfg = new self();
        $cfg->verifyPayoutStatus = $status;
        $cfg->payoutAmount = $amount;
        $cfg->payoutRef = $ref;
        return $cfg;
    }
}
