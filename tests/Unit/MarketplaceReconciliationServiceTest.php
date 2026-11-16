<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Ledger\BalanceQuery;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Ledger\JournalPostingService;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontJournalLine;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\MarketplaceReconciliationService;
use App\Storefront\Services\StorefrontPaymentVerificationService;
use App\Storefront\Services\StorefrontPayoutProcessingService;
use App\Storefront\StorefrontWebhookHandler;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use App\Payments\Chapa\ChapaV2Client;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Nateyk\Chapa\ChapaClient;
use Nateyk\Chapa\Http\RawResponse;
use Nateyk\Chapa\Http\Transport;
use Tests\TestCase;

class MarketplaceReconciliationServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('store.payout_hold_days', 7);

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
        Schema::dropIfExists('storefront_orders');
        Schema::dropIfExists('user_sessions');
        Schema::dropIfExists('users');
        parent::tearDown();
    }

    public function testReleaseMaturedEscrowMaturesEligibleOrdersOnly(): void
    {
        $creator = new User(['id' => 101, 'name' => 'Creator 101', 'email' => 'creator101@test.com']);
        $this->seedCreator($creator);
        $ledger = new CreatorLedgerService(new JournalPostingService());

        $maturedOrder = $this->seedPlatformOrder($creator, 100000, Carbon::now()->subDays(10));
        $ledger->recordPlatformSale($maturedOrder);

        $immatureOrder = $this->seedPlatformOrder($creator, 50000, Carbon::now()->subDays(2));
        $ledger->recordPlatformSale($immatureOrder);

        $service = new MarketplaceReconciliationService(creatorLedger: $ledger);
        $maturedCount = $service->releaseMaturedEscrow();

        $this->assertSame(1, $maturedCount);

        $balances = $ledger->getBalances(BalanceQuery::for((int) $creator->id, 'ETB'));
        $this->assertSame(90000, $balances['available']);
        $this->assertSame(45000, $balances['held']);
        $this->assertSame(0, $service->releaseMaturedEscrow());
    }

    public function testReconcilePendingPaymentAttemptsFulfillsVerifiedOrders(): void
    {
        $creator = new User(['id' => 102, 'name' => 'Creator 102', 'email' => 'creator102@test.com']);
        $this->seedCreator($creator);

        $order = $this->seedPlatformOrder($creator, 200000);
        $merchantRef = 'lk-pay-stale-99';

        $attempt = StorefrontPaymentAttempt::create([
            'order_id' => $order->id,
            'merchant_reference' => $merchantRef,
            'idempotency_key' => (string) Str::uuid(),
            'status' => StorefrontPaymentAttempt::STATUS_PENDING,
            'currency' => 'ETB',
            'amount_cents' => 200000,
        ]);
        DB::table('storefront_payment_attempts')->where('id', $attempt->id)->update([
            'created_at' => Carbon::now()->subMinutes(30),
        ]);

        Http::fake([
            'https://api.chapa.co/v1/transaction/verify/'.$merchantRef => Http::response([
                'status' => 'success',
                'data' => [
                    'status' => 'success',
                    'amount' => ChapaV2Client::majorFromCents(200000),
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

        $service = new MarketplaceReconciliationService(
            chapaManager: $chapaManager,
            verificationService: new StorefrontPaymentVerificationService($chapaManager, $webhookHandler),
        );

        $this->assertSame(1, $service->reconcilePendingPaymentAttempts(15));
        $this->assertSame(StorefrontPaymentAttempt::STATUS_SUCCESSFUL, $attempt->fresh()->status);
    }

    public function testReconcilePendingPayoutIntentsDisbursesSettledTransfers(): void
    {
        $creator = new User(['id' => 103, 'name' => 'Creator 103', 'email' => 'creator103@test.com']);
        $this->seedCreator($creator);
        $ledger = new CreatorLedgerService(new JournalPostingService());

        $order = $this->seedPlatformOrder($creator, 150000, Carbon::now()->subDays(10));
        $ledger->recordPlatformSale($order);
        $ledger->releaseHeldToAvailable($order);

        $payout = PayoutRequest::create([
            'workspace_id' => 1,
            'creator_id' => $creator->id,
            'amount_cents' => 135000,
            'currency' => 'ETB',
            'status' => 'processing',
            'payout_destination' => 'CBE:1000103103',
        ]);
        $ledger->reserveForPayout($payout, 135000);

        $intent = StorefrontPayoutIntent::create([
            'payout_request_id' => $payout->id,
            'merchant_reference' => 'lk-po-settled-103',
            'idempotency_key' => (string) Str::uuid(),
            'amount_cents' => 135000,
            'currency' => 'ETB',
            'provider' => 'chapa',
            'withdrawal_code' => 'bank_transfer',
            'destination_snapshot' => 'CBE:1000103103',
            'status' => StorefrontPayoutIntent::STATUS_PROVIDER_PENDING,
        ]);
        DB::table('storefront_payout_intents')->where('id', $intent->id)->update([
            'created_at' => Carbon::now()->subMinutes(10),
        ]);

        $chapaClient = $this->createMockChapaClient(ReconciliationChapaMockConfig::forPayout('lk-po-settled-103', 135000));
        $chapaManager = $this->createMock(LinketChapaManager::class);
        $chapaManager->method('platformClient')->willReturn($chapaClient);

        $payoutProcessor = new StorefrontPayoutProcessingService(chapaManager: $chapaManager, creatorLedger: $ledger);
        $service = new MarketplaceReconciliationService(
            chapaManager: $chapaManager,
            payoutProcessingService: $payoutProcessor,
            creatorLedger: $ledger,
        );

        $this->assertSame(1, $service->reconcilePendingPayoutIntents(5));
        $this->assertSame(StorefrontPayoutIntent::STATUS_SUCCESSFUL, $intent->fresh()->status);
        $this->assertSame('paid', $payout->fresh()->status);

        $balances = $ledger->getBalances(BalanceQuery::for((int) $creator->id, 'ETB'));
        $this->assertSame(0, $balances['reserved']);
        $this->assertSame(0, $balances['available']);
    }

    public function testReconcileMissingJournalEntriesRepairsPaidOrders(): void
    {
        $creator = new User(['id' => 104, 'name' => 'Creator 104', 'email' => 'creator104@test.com']);
        $this->seedCreator($creator);
        $ledger = new CreatorLedgerService(new JournalPostingService());

        $order = $this->seedPlatformOrder($creator, 80000, Carbon::now()->subDays(1));

        $service = new MarketplaceReconciliationService(creatorLedger: $ledger);
        $this->assertSame(1, $service->reconcileMissingJournalEntries());

        $this->assertDatabaseHas('storefront_journal_entries', [
            'source_type' => 'order',
            'source_id' => $order->id,
            'event_type' => 'sale_settled',
        ]);

        $balances = $ledger->getBalances(BalanceQuery::for((int) $creator->id, 'ETB'));
        $this->assertSame(72000, $balances['held']);
    }

    public function testAuditLedgerIntegrityDetectsBalancedAndUnbalancedLedger(): void
    {
        $creator = new User(['id' => 105, 'name' => 'Creator 105', 'email' => 'creator105@test.com']);
        $this->seedCreator($creator);
        $ledger = new CreatorLedgerService(new JournalPostingService());

        $order = $this->seedPlatformOrder($creator, 120000, Carbon::now()->subDays(5));
        $ledger->recordPlatformSale($order);

        $service = new MarketplaceReconciliationService(creatorLedger: $ledger);
        $audit = $service->auditLedgerIntegrity();

        $this->assertTrue($audit->isBalanced);
        $this->assertSame(120000, $audit->clearingBalanceCents);
        $this->assertSame(108000, $audit->totalCreatorLiabilitiesCents);
        $this->assertSame(12000, $audit->platformCommissionCents);
        $this->assertFalse($audit->hasAnomalies());

        // Inject unbalanced line
        StorefrontJournalLine::create([
            'journal_entry_id' => 1,
            'account_code' => AccountCodes::PLATFORM_CHAPA_CLEARING,
            'creator_id' => $creator->id,
            'workspace_id' => 1,
            'currency' => 'ETB',
            'debit_cents' => 9999,
            'credit_cents' => 0,
        ]);

        $compromisedAudit = $service->auditLedgerIntegrity();
        $this->assertFalse($compromisedAudit->isBalanced);
        $this->assertTrue($compromisedAudit->hasAnomalies());
        $this->assertNotEmpty($compromisedAudit->issues);
    }

    public function testArtisanCommandExecutesReconciliationSuccessfully(): void
    {
        $creator = new User(['id' => 106, 'name' => 'Creator 106', 'email' => 'creator106@test.com']);
        $this->seedCreator($creator);
        $ledger = new CreatorLedgerService(new JournalPostingService());

        $order = $this->seedPlatformOrder($creator, 100000, Carbon::now()->subDays(10));
        $ledger->recordPlatformSale($order);

        $this->artisan('marketplace:reconcile')
            ->expectsOutput('Starting Marketplace Financial Reconciliation...')
            ->assertExitCode(0);

        $balances = $ledger->getBalances(BalanceQuery::for((int) $creator->id, 'ETB'));
        $this->assertSame(90000, $balances['available']);
    }

    private function seedCreator(User $creator): void
    {
        DB::table('users')->insert([
            'id' => $creator->id,
            'name' => $creator->name,
            'email' => $creator->email,
        ]);
    }

    private function seedPlatformOrder(User $creator, int $gross, ?Carbon $paidAt = null): StorefrontOrder
    {
        $fee = (int) round($gross * 0.10);
        return StorefrontOrder::create([
            'uuid' => (string) Str::uuid(),
            'monetization_policy' => 'marketplace_v2',
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA,
            'creator_id' => $creator->id,
            'currency' => 'ETB',
            'gross_amount_cents' => $gross,
            'platform_fee_cents' => $fee,
            'creator_earnings_cents' => $gross - $fee,
            'status' => $paidAt !== null ? 'paid' : 'pending_payment',
            'paid_at' => $paidAt,
        ]);
    }

    private function createMockChapaClient(ReconciliationChapaMockConfig $config): ChapaClient
    {
        $transport = $this->createMock(Transport::class);
        $transport->method('send')->willReturnCallback(function (string $method, string $url) use ($config) {
            $data = [
                'status' => $config->status,
                'chapa_reference' => $config->isPayout ? 'CHP-PO-12345' : 'CHP-PAY-12345',
                'merchant_reference' => $config->reference,
                'amount' => $config->amount,
                'currency' => 'ETB',
            ];
            if (!$config->isPayout) {
                $data['email'] = 'buyer@test.com';
            }

            return new RawResponse(200, (string) json_encode(['status' => 'success', 'data' => $data]));
        });

        return new ChapaClient(privateKey: 'sec-test', webhookSecret: 'wh-secret', transport: $transport);
    }
}

final class ReconciliationChapaMockConfig
{
    public string $status = 'SUCCESS';
    public string $reference = 'ref';
    public int $amount = 100000;
    public bool $isPayout = false;

    public static function forPayment(string $ref, int $amount, string $status = 'SUCCESS'): self
    {
        $cfg = new self();
        $cfg->reference = $ref;
        $cfg->amount = $amount;
        $cfg->status = $status;
        $cfg->isPayout = false;
        return $cfg;
    }

    public static function forPayout(string $ref, int $amount, string $status = 'SUCCESS'): self
    {
        $cfg = new self();
        $cfg->reference = $ref;
        $cfg->amount = $amount;
        $cfg->status = $status;
        $cfg->isPayout = true;
        return $cfg;
    }
}
