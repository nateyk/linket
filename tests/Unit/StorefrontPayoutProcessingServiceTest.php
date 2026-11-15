<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\ChapaPayoutService;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Services\StorefrontPaymentReferenceGenerator;
use App\Storefront\Services\StorefrontPayoutProcessingService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Nateyk\Chapa\ChapaClient;
use Nateyk\Chapa\Http\RawResponse;
use Nateyk\Chapa\Http\Transport;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final readonly class PayoutVerificationCase
{
    public function __construct(
        public string $chapaStatus,
        public string $expectedIntentStatus,
        public string $expectedPayoutStatus,
        public string $expectedLedgerAction,
    ) {
    }
}

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
            $table->string('status', 32)->default('requested');
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

    private function mockChapaClient(string $createStatus = 'PENDING', string $verifyStatus = 'SUCCESS'): ChapaClient
    {
        $transport = $this->createMock(Transport::class);
        $transport->method('send')->willReturnCallback(function (string $method, string $url) use ($createStatus, $verifyStatus) {
            if (str_contains($url, '/verify')) {
                return new RawResponse(200, (string) json_encode([
                    'status' => 'success',
                    'data' => [
                        'status' => $verifyStatus,
                        'chapa_reference' => 'CHP-PO-VERIFY-1',
                        'merchant_reference' => 'lk-po-TEST-REF-01',
                        'amount' => 50000,
                        'currency' => 'ETB',
                    ],
                ]));
            }

            return new RawResponse(200, (string) json_encode([
                'status' => 'success',
                'data' => [
                    'status' => $createStatus,
                    'chapa_reference' => 'CHP-PO-CREATE-99',
                    'created_at' => '2026-11-14T20:00:00Z',
                ],
            ]));
        });

        return new ChapaClient(
            privateKey: 'sec-test-payout',
            webhookSecret: 'wh-secret',
            transport: $transport,
        );
    }

    public function testPreparesDurableIntentWithStableReference(): void
    {
        $payout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => 15,
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'payout_destination' => 'CBE:100099887766',
            'status' => 'processing',
        ]);

        $service = new StorefrontPayoutProcessingService(
            referenceGenerator: new StorefrontPaymentReferenceGenerator(fn (): bool => false),
        );

        $intent1 = $service->prepareIntent($payout, 'bank_transfer');
        $this->assertSame(StorefrontPayoutIntent::STATUS_PREPARED, $intent1->status);
        $this->assertStringStartsWith('lk-', $intent1->merchant_reference);
        $this->assertLessThanOrEqual(20, strlen($intent1->merchant_reference));

        // Re-preparing the same payout must return the exact same intent without creating a new record
        $intent2 = $service->prepareIntent($payout, 'bank_transfer');
        $this->assertSame($intent1->id, $intent2->id);
        $this->assertSame($intent1->merchant_reference, $intent2->merchant_reference);
        $this->assertSame($intent1->idempotency_key, $intent2->idempotency_key);
        $this->assertSame(1, StorefrontPayoutIntent::query()->where('payout_request_id', $payout->id)->count());
    }

    public function testSubmitPayoutWithLowercaseCurrencySetsProviderPendingWithoutExtinguishingLiability(): void
    {
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('platformClient')->willReturn($this->mockChapaClient(createStatus: 'PENDING'));

        $ledgerMock = $this->createMock(CreatorLedgerService::class);
        $ledgerMock->expects($this->never())->method('disbursePayout');

        $payout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => 20,
            'amount_cents' => 50000,
            'currency' => 'etb',
            'payout_destination' => 'CBE:100012345678',
            'status' => 'processing',
        ]);

        $service = new StorefrontPayoutProcessingService(
            chapaManager: $manager,
            referenceGenerator: new StorefrontPaymentReferenceGenerator(fn (): bool => false),
            creatorLedger: $ledgerMock,
        );

        $intent = $service->prepareIntent($payout, 'bank_transfer');
        $submitted = $service->submitPayout($intent);

        $this->assertSame(StorefrontPayoutIntent::STATUS_PROVIDER_PENDING, $submitted->status);
        $this->assertSame('CHP-PO-CREATE-99', $submitted->chapa_reference);

        $payout->refresh();
        $this->assertSame('processing', $payout->status);
        $this->assertSame($intent->merchant_reference, $payout->transfer_reference);
        $this->assertNull($payout->paid_at);
    }

    #[DataProvider('payoutVerificationCases')]
    public function testVerifyPayoutOutcomes(PayoutVerificationCase $case): void
    {
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('platformClient')->willReturn($this->mockChapaClient(verifyStatus: $case->chapaStatus));

        $ledgerMock = $this->createMock(CreatorLedgerService::class);
        $disburseExpectation = $case->expectedLedgerAction === 'disburse' ? $this->once() : $this->never();
        $releaseExpectation = $case->expectedLedgerAction === 'release' ? $this->once() : $this->never();
        $ledgerMock->expects($disburseExpectation)->method('disbursePayout');
        $ledgerMock->expects($releaseExpectation)->method('releasePayoutReservation');

        $payout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => 30,
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'payout_destination' => 'CBE:100012345678',
            'status' => 'processing',
        ]);

        $intent = StorefrontPayoutIntent::query()->create([
            'payout_request_id' => $payout->id,
            'merchant_reference' => 'lk-po-TEST-REF-01',
            'idempotency_key' => 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
            'amount_cents' => 50000,
            // Existing intents may use the lowercase storefront currency.
            'currency' => 'etb',
            'provider' => 'chapa',
            'withdrawal_code' => 'bank_transfer',
            'destination_snapshot' => 'CBE:100012345678',
            'status' => StorefrontPayoutIntent::STATUS_PROVIDER_PENDING,
        ]);

        $service = new StorefrontPayoutProcessingService(
            chapaManager: $manager,
            creatorLedger: $ledgerMock,
        );

        $verified = $service->verifyPayout($intent);

        $this->assertSame($case->expectedIntentStatus, $verified->status);

        $payout->refresh();
        $this->assertSame($case->expectedPayoutStatus, $payout->status);
    }

    public function testReversalOfSettledPayoutRequiresReviewBeforeChangingLedger(): void
    {
        $manager = $this->createMock(LinketChapaManager::class);
        $manager->method('platformClient')->willReturn($this->mockChapaClient(verifyStatus: 'REVERSED'));
        $ledger = $this->createMock(CreatorLedgerService::class);
        $ledger->expects($this->never())->method('releasePayoutReservation');
        $payout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => 30,
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'status' => 'paid',
            'paid_at' => now(),
        ]);
        $intent = StorefrontPayoutIntent::query()->create([
            'payout_request_id' => $payout->id,
            'merchant_reference' => 'lk-po-TEST-REF-01',
            'idempotency_key' => 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'provider' => 'chapa',
            'withdrawal_code' => 'bank_transfer',
            'destination_snapshot' => 'CBE:100012345678',
            'status' => StorefrontPayoutIntent::STATUS_SUCCESSFUL,
        ]);
        $service = new StorefrontPayoutProcessingService(chapaManager: $manager, creatorLedger: $ledger);

        $this->expectExceptionMessage('A settled payout requires manual reconciliation');
        try {
            $service->verifyPayout($intent);
        } finally {
            $this->assertSame('paid', $payout->fresh()->status);
            $this->assertSame(StorefrontPayoutIntent::STATUS_SUCCESSFUL, $intent->fresh()->status);
        }
    }

    public static function payoutVerificationCases(): array
    {
        return [
            'delivered settlement disburses liability' => [
                new PayoutVerificationCase(
                    chapaStatus: 'SUCCESS',
                    expectedIntentStatus: StorefrontPayoutIntent::STATUS_SUCCESSFUL,
                    expectedPayoutStatus: 'paid',
                    expectedLedgerAction: 'disburse',
                ),
            ],
            'terminal failure releases reservation' => [
                new PayoutVerificationCase(
                    chapaStatus: 'FAILED',
                    expectedIntentStatus: StorefrontPayoutIntent::STATUS_FAILED,
                    expectedPayoutStatus: 'rejected',
                    expectedLedgerAction: 'release',
                ),
            ],
        ];
    }
}
