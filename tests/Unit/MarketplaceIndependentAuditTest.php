<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
use App\Payments\VerifyEt\VerifyEtRetirementAudit;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Ledger\JournalPostingService;
use App\Storefront\Ledger\RefundBreakdown;
use App\Storefront\Models\DigitalProductPaymentRefund;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\MarketplaceEvidenceJournal;
use App\Storefront\Services\MarketplaceIndependentAudit;
use App\Storefront\Services\MarketplaceProviderEvidence;
use App\Storefront\Services\MarketplaceReconciliationService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;
use Tests\Unit\Support\MarketplaceTestDatabaseTrait;

class MarketplaceIndependentAuditTest extends TestCase
{
    use MarketplaceTestDatabaseTrait;

    /** @var string[] */
    private array $temporaryFiles = [];
    private CreatorLedgerService $ledger;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');

        $this->createCoreTables();
        $this->createStorefrontTables();
        $this->createLedgerTables();
        Schema::table('storefront_orders', fn (Blueprint $table) => $table->string('delivery_status')->nullable());
        $this->createLegacyAuditTables();

        $this->ledger = new CreatorLedgerService(new JournalPostingService());
    }

    protected function tearDown(): void
    {
        foreach ($this->temporaryFiles as $path) {
            @unlink($path);
        }
        foreach (['storefront_payment_disputes', 'pro_subscription_payments', 'subscriptions',
            'verify_et_webhook_deliveries', 'direct_payment_verifications'] as $table) {
            Schema::dropIfExists($table);
        }
        $this->dropAllTables();
        parent::tearDown();
    }

    public function testMissingProviderExportAlwaysBlocksIndependentSignoff(): void
    {
        $order = $this->sale();

        $report = $this->audit()->audit();

        $this->assertFalse($report['candidate_for_manual_review']);
        $this->assertFalse($report['retirement_authorized']);
        $this->assertFalse($report['live_payouts_authorized']);
        $this->assertSame(1, $report['counts']['payments']);
        $this->assertContains('independent_provider_export_missing', array_column($report['issues'], 'code'));
        $this->assertSame(1, StorefrontOrder::query()->whereKey($order->id)->count());
    }

    public function testMatchingProviderSnapshotAndJournalCanEnterManualReview(): void
    {
        $order = $this->sale();

        $report = $this->audit()->audit($this->evidence([
            'chapa_payments' => [$this->paymentEvidence($order)],
        ]));

        $this->assertSame(0, $report['issue_count']);
        $this->assertTrue($report['candidate_for_manual_review']);
        $this->assertFalse($report['retirement_authorized']);
        $this->assertFalse($report['live_payouts_authorized']);
    }

    public function testProviderAmountMismatchBlocksEvenWhenJournalIsBalanced(): void
    {
        $order = $this->sale();
        $payment = $this->paymentEvidence($order);
        $payment['amount_cents'] = 123;

        $report = $this->audit()->audit($this->evidence(['chapa_payments' => [$payment]]));

        $this->assertTrue($report['journal_balanced']);
        $this->assertFalse($report['candidate_for_manual_review']);
        $this->assertContains('provider_amount_mismatch', array_column($report['issues'], 'code'));
    }

    public function testCompletedPartialRefundMustMatchChapaAndExactJournalReversal(): void
    {
        $order = $this->sale();
        $refund = DigitalProductPaymentRefund::query()->create([
            'storefront_order_id' => $order->id,
            'recorded_by' => $order->creator_id,
            'amount_cents' => 40000,
            'creator_earnings_reversal_cents' => 38000,
            'platform_fee_reversal_cents' => 2000,
            'currency' => 'ETB',
            'external_reference' => 'refund-evidence-1',
            'status' => 'completed',
            'refunded_at' => now(),
            'reason' => 'Synthetic test',
        ]);
        $this->ledger->recordRefund($order, new RefundBreakdown(40000, 38000, 2000, $refund->id));

        $report = $this->audit()->audit($this->evidence([
            'chapa_payments' => [$this->paymentEvidence($order)],
            'chapa_refunds' => [[
                'reference' => 'refund-evidence-1',
                'amount_cents' => 40000,
                'currency' => 'ETB',
                'status' => 'completed',
            ]],
        ]));

        $this->assertSame(1, $report['counts']['refunds']);
        $this->assertSame(0, $report['issue_count']);
        $this->assertTrue($report['candidate_for_manual_review']);
    }

    public function testPaidWithdrawalRequiresBothDisbursedJournalAndProviderSuccess(): void
    {
        $order = $this->sale();
        $this->ledger->releaseHeldToAvailable($order);
        $payout = PayoutRequest::query()->create([
            'creator_id' => $order->creator_id,
            'workspace_id' => 1,
            'currency' => 'ETB',
            'amount_cents' => 50000,
            'status' => 'paid',
        ]);
        $this->ledger->reserveForPayout($payout);
        $this->ledger->disbursePayout($payout);
        StorefrontPayoutIntent::query()->create([
            'payout_request_id' => $payout->id,
            'merchant_reference' => 'lk-po-audit-123',
            'idempotency_key' => (string) Str::uuid(),
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'provider' => 'chapa',
            'withdrawal_code' => 'telebirr',
            'destination_snapshot' => 'synthetic',
            'status' => 'successful',
        ]);

        $evidence = $this->evidence([
            'chapa_payments' => [$this->paymentEvidence($order)],
            'chapa_payouts' => [[
                'reference' => 'lk-po-audit-123', 'amount_cents' => 50000,
                'currency' => 'ETB', 'status' => 'success',
            ]],
        ]);
        $this->assertSame(0, $this->audit()->audit($evidence)['issue_count']);

        // A provider statement cannot compensate for missing disbursement entries.
        DB::table('storefront_journal_entries')->where('source_type', 'payout')
            ->where('source_id', $payout->id)->where('event_type', 'withdrawal_disbursed')->delete();
        $report = $this->audit()->audit($this->evidence([
            'chapa_payments' => [$this->paymentEvidence($order)],
            'chapa_payouts' => [[
                'reference' => 'lk-po-audit-123', 'amount_cents' => 50000,
                'currency' => 'ETB', 'status' => 'success',
            ]],
        ]));
        $this->assertContains('journal_missing', array_column($report['issues'], 'code'));
        $this->assertFalse($report['candidate_for_manual_review']);
    }

    public function testHistoricalVerifyEtOrderMustNotCreatePlatformLiability(): void
    {
        $creator = $this->seedUser(new User(['id' => 706, 'name' => 'Historical', 'email' => 'legacy-audit@test.com']));
        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'creator_id' => $creator->id,
            'digital_product_id' => 1,
            'collection_owner' => 'verify_et_creator',
            'payment_gateway' => 'verify_et',
            'status' => 'paid',
            'delivery_status' => 'delivered',
            'currency' => 'ETB',
            'gross_amount_cents' => 10000,
            'creator_earnings_cents' => 10000,
        ]);
        DB::table('direct_payment_verifications')->insert([
            'reference' => 'historical-verification-1', 'status' => 'success',
            'amount_cents' => 10000, 'currency' => 'ETB',
        ]);

        $report = $this->audit()->audit($this->evidence([
            'verify_et_verifications' => [[
                'reference' => 'historical-verification-1', 'amount_cents' => 10000,
                'currency' => 'ETB', 'status' => 'success',
            ]],
        ]));

        $this->assertSame(1, $report['counts']['legacy_orders']);
        $this->assertSame(1, $report['counts']['legacy_verifications']);
        $this->assertSame(0, $report['issue_count']);
        $this->assertFalse($this->ledger->recordPlatformSale($order) !== null);
    }

    private function sale(): StorefrontOrder
    {
        $creator = $this->seedUser(new User([
            'id' => 705, 'name' => 'Audit Creator', 'email' => 'audit-creator@test.com',
        ]));
        return $this->seedPlatformOrder($creator, $this->ledger);
    }

    private function audit(): MarketplaceIndependentAudit
    {
        return new MarketplaceIndependentAudit(
            new MarketplaceEvidenceJournal(),
            new MarketplaceReconciliationService(creatorLedger: $this->ledger),
            new VerifyEtRetirementAudit(),
        );
    }

    private function paymentEvidence(StorefrontOrder $order): array
    {
        return [
            'reference' => $order->paymentAttempts()->firstOrFail()->merchant_reference,
            'amount_cents' => (int) $order->gross_amount_cents,
            'currency' => 'ETB',
            'status' => 'success',
        ];
    }

    private function evidence(array $overrides = []): MarketplaceProviderEvidence
    {
        $path = tempnam(sys_get_temp_dir(), 'marketplace-audit-');
        $this->temporaryFiles[] = $path;
        file_put_contents($path, (string) json_encode(array_replace([
            'schema_version' => 1,
            'scope' => 'complete_marketplace_history',
            'chapa_payments' => [],
            'chapa_refunds' => [],
            'chapa_payouts' => [],
            'verify_et_verifications' => [],
        ], $overrides), JSON_THROW_ON_ERROR));
        return MarketplaceProviderEvidence::fromPath($path);
    }

    private function createLegacyAuditTables(): void
    {
        Schema::create('direct_payment_verifications', function (Blueprint $table): void {
            $table->id();
            $table->string('reference');
            $table->string('status');
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency', 12);
        });
        Schema::create('verify_et_webhook_deliveries', function (Blueprint $table): void {
            $table->id();
            $table->string('status');
        });
        Schema::create('subscriptions', function (Blueprint $table): void {
            $table->id();
            $table->string('gateway_name')->nullable();
            $table->timestamp('ends_at')->nullable();
        });
        Schema::create('pro_subscription_payments', function (Blueprint $table): void {
            $table->id();
            $table->string('status');
        });
        Schema::create('storefront_payment_disputes', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('storefront_order_id');
            $table->string('lifecycle_status');
        });
    }
}
