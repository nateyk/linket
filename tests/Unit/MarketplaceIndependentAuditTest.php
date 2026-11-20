<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Ledger\JournalEntryData;
use App\Storefront\Ledger\JournalLineData;
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
        $this->createAuditDisputeTable();

        $this->ledger = new CreatorLedgerService(new JournalPostingService());
    }

    protected function tearDown(): void
    {
        foreach ($this->temporaryFiles as $path) {
            @unlink($path);
        }
        Schema::dropIfExists('storefront_payment_disputes');
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

    public function testUnmatchedProviderRecordBlocksEvenWhenAllLocalOrdersMatch(): void
    {
        $order = $this->sale();
        $extra = [
            'reference' => 'unknown-marketplace-ref', 'amount_cents' => 10000,
            'currency' => 'ETB', 'status' => 'success',
        ];
        $report = $this->audit()->audit($this->evidence([
            'chapa_payments' => [$this->paymentEvidence($order), $extra],
        ]));

        $this->assertFalse($report['candidate_for_manual_review']);
        $this->assertContains('provider_records_without_local_match', array_column($report['issues'], 'code'));
    }

    public function testAuditCommandReportsBlockedStatusWithoutChangingJournal(): void
    {
        $order = $this->sale();
        $before = DB::table('storefront_journal_entries')->count();

        $this->artisan('marketplace:audit-independent', ['--json' => true])
            ->assertExitCode(1);

        $this->assertSame($before, DB::table('storefront_journal_entries')->count());
        $this->assertSame('paid', $order->fresh()->status);
    }

    public function testBalancedJournalWithNegativeCreatorHoldStillBlocksManualSignoff(): void
    {
        $order = $this->sale();
        $context = ['creator_id' => (int) $order->creator_id, 'workspace_id' => 1];
        (new JournalPostingService())->post(
            new JournalEntryData(
                sourceType: 'audit_fixture',
                sourceId: (int) $order->id,
                eventType: 'invalid_creator_overdraft',
                currency: 'ETB',
                attributes: $context,
            ),
            [
                new JournalLineData(AccountCodes::CREATOR_HELD, 96000, 0, 'ETB', $context),
                new JournalLineData(AccountCodes::PLATFORM_CHAPA_CLEARING, 0, 96000, 'ETB', $context),
            ],
        );

        $report = $this->audit()->audit($this->evidence([
            'chapa_payments' => [$this->paymentEvidence($order)],
        ]));

        $this->assertTrue($report['journal_balanced']);
        $this->assertFalse($report['candidate_for_manual_review']);
        $this->assertContains('negative_creator_liability', array_column($report['issues'], 'code'));
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
        ], $overrides), JSON_THROW_ON_ERROR));
        return MarketplaceProviderEvidence::fromPath($path);
    }

    private function createAuditDisputeTable(): void
    {
        Schema::create('storefront_payment_disputes', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('storefront_order_id');
            $table->string('lifecycle_status');
        });
    }
}
