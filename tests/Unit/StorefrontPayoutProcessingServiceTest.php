<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Storefront\ChapaPayoutService;
use App\Storefront\DigitalProductFinance;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\DigitalProductWithdrawalMethod;
use App\Storefront\Models\DigitalProductPayoutMethod;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\StorefrontPayoutProcessingService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class StorefrontPayoutProcessingServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');

        Schema::create('payout_requests', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('workspace_id')->default(1);
            $table->unsignedBigInteger('creator_id');
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency', 12)->default('ETB');
            $table->string('status', 32)->default('processing');
            $table->text('payout_destination')->nullable();
            $table->string('transfer_reference', 64)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });
        (new (require database_path('migrations/2026_11_14_220000_create_storefront_payout_intents_table.php')))->up();
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('storefront_payout_intents');
        Schema::dropIfExists('payout_requests');
        parent::tearDown();
    }

    private function payout(string $status = 'processing'): PayoutRequest
    {
        return PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => 30,
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'payout_destination' => '1000123456789',
            'status' => $status,
        ]);
    }

    private function intent(PayoutRequest $payout): StorefrontPayoutIntent
    {
        return StorefrontPayoutIntent::query()->create([
            'payout_request_id' => $payout->id,
            'merchant_reference' => 'lk-po-TEST-REF-01',
            'idempotency_key' => 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'provider' => 'chapa',
            'withdrawal_code' => 'bank_transfer',
            'destination_snapshot' => '1000123456789',
            'status' => StorefrontPayoutIntent::STATUS_PROVIDER_PENDING,
        ]);
    }

    private function verified(string $status = 'success', string $reference = 'lk-po-TEST-REF-01'): array
    {
        return [
            'status' => 'success',
            'data' => [
                'status' => $status,
                'reference' => $reference,
                'amount' => '500.00',
                'currency' => 'ETB',
            ],
        ];
    }

    public function testSignedApprovalPayloadMatchesExactApprovedWalletSnapshot(): void
    {
        $payout = new PayoutRequest([
            'status' => 'processing',
            'bank_code_snapshot' => 'telebirr',
            'account_holder_snapshot' => 'Abebe Seller',
        ]);
        $payout->setRelation('withdrawalMethod', new DigitalProductWithdrawalMethod([
            'is_active' => true,
            'code' => 'telebirr',
        ]));
        $payout->setRelation('payoutMethod', new DigitalProductPayoutMethod([
            'is_active' => true,
            'status' => 'active',
            'approved_at' => now(),
        ]));
        $intent = new StorefrontPayoutIntent([
            'merchant_reference' => 'lk-po-CALLBACK-01',
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'destination_snapshot' => '0911223344',
            'status' => StorefrontPayoutIntent::STATUS_SUBMITTED,
        ]);
        $intent->setRelation('payoutRequest', $payout);

        $payload = [
            'reference' => 'lk-po-CALLBACK-01',
            'amount' => '500.00',
            'bank' => 'telebirr',
            'account_name' => 'Abebe Seller',
            'account_number' => '251911223344',
        ];
        $service = new ChapaPayoutService();
        $this->assertTrue($service->approvalMatches($intent, $payload));
        $this->assertFalse($service->approvalMatches($intent, [...$payload, 'amount' => '500.01']));
        $this->assertFalse($service->approvalMatches($intent, [...$payload, 'account_number' => '251911223345']));
        $this->assertFalse($service->approvalMatches($intent, [...$payload, 'reference' => 'wrong-reference']));
    }

    public function testPrepareIntentReusesStableReference(): void
    {
        $payout = $this->payout();
        $service = new StorefrontPayoutProcessingService();

        $first = $service->prepareIntent($payout, 'bank_transfer');
        $second = $service->prepareIntent($payout, 'bank_transfer');
        $this->assertSame($first->id, $second->id);
        $this->assertSame($first->merchant_reference, $second->merchant_reference);
        $this->assertLessThanOrEqual(20, strlen($first->merchant_reference));
        $this->assertSame(1, StorefrontPayoutIntent::query()->count());
    }

    public function testQueuedTransferDoesNotMarkWithdrawalPaid(): void
    {
        $payout = $this->payout();
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('createTransfer')->once()->andReturn([
            'status' => 'success', 'message' => 'Transfer Queued Successfully', 'data' => 'lk-po-TEST-REF-01',
        ]);

        $service = new StorefrontPayoutProcessingService(chapaPayoutService: $provider);
        $intent = $service->prepareIntent($payout);
        $queued = $service->submitPayout($intent);

        $this->assertSame(StorefrontPayoutIntent::STATUS_PROVIDER_PENDING, $queued->status);
        $this->assertSame('processing', $payout->fresh()->status);
        $this->assertNull($payout->fresh()->paid_at);
    }

    public function testTimedOutDispatchCannotBeSentTwice(): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('createTransfer')->once()->andThrow(new RuntimeException('timeout'));
        $service = new StorefrontPayoutProcessingService(chapaPayoutService: $provider);
        $intent = $service->prepareIntent($this->payout());
        $first = $service->submitPayout($intent);
        $second = $service->submitPayout($intent);

        $this->assertSame(StorefrontPayoutIntent::STATUS_SUBMITTED, $first->status);
        $this->assertSame(StorefrontPayoutIntent::STATUS_SUBMITTED, $second->status);
        $this->assertSame(1, (int) $second->attempts);
    }

    public function testVerifiedSuccessfulTransferDisbursesOnlyOnce(): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('verifyTransfer')->twice()->andReturn($this->verified());
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldReceive('disbursePayout')->once();

        $payout = $this->payout();
        $intent = $this->intent($payout);
        $service = new StorefrontPayoutProcessingService(creatorLedger: $ledger, chapaPayoutService: $provider);
        $service->verifyPayout($intent);
        $service->verifyPayout($intent->fresh());

        $this->assertSame('paid', $payout->fresh()->status);
        $this->assertSame(StorefrontPayoutIntent::STATUS_SUCCESSFUL, $intent->fresh()->status);
    }

    public function testVerifiedFailureReleasesReservationOnce(): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('verifyTransfer')->twice()->andReturn($this->verified('failed'));
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldReceive('releasePayoutReservation')->once();
        $finance = Mockery::mock(DigitalProductFinance::class);
        $finance->shouldReceive('record')->once();
        $this->app->instance(DigitalProductFinance::class, $finance);

        $payout = $this->payout();
        $intent = $this->intent($payout);
        $service = new StorefrontPayoutProcessingService(creatorLedger: $ledger, chapaPayoutService: $provider);
        $service->verifyPayout($intent);
        $service->verifyPayout($intent->fresh());

        $this->assertSame('rejected', $payout->fresh()->status);
        $this->assertSame(StorefrontPayoutIntent::STATUS_FAILED, $intent->fresh()->status);
    }

    public function testMismatchedProviderVerificationCannotSettle(): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('verifyTransfer')->once()->andReturn($this->verified('success', 'another-transfer'));
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldNotReceive('disbursePayout');

        $payout = $this->payout();
        $service = new StorefrontPayoutProcessingService(creatorLedger: $ledger, chapaPayoutService: $provider);

        $this->expectExceptionMessage('verification details do not match');
        try {
            $service->verifyPayout($this->intent($payout));
        } finally {
            $this->assertSame('processing', $payout->fresh()->status);
        }
    }

    public function testReversalOfAlreadyPaidWithdrawalCannotReleaseLedger(): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('verifyTransfer')->once()->andReturn($this->verified('reversed'));
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldNotReceive('releasePayoutReservation');

        $payout = $this->payout('paid');
        $intent = $this->intent($payout);
        $intent->update(['status' => StorefrontPayoutIntent::STATUS_SUCCESSFUL]);
        $service = new StorefrontPayoutProcessingService(creatorLedger: $ledger, chapaPayoutService: $provider);

        $this->expectExceptionMessage('A settled payout requires manual reconciliation');
        $service->verifyPayout($intent);
    }
}
