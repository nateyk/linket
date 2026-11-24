<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
use App\Payments\Chapa\Exceptions\ChapaTransferRejectedException;
use App\Storefront\ChapaPayoutService;
use App\Storefront\DigitalProductFinance;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Models\DigitalProductPayoutMethod;
use App\Storefront\Models\DigitalProductWithdrawalMethod;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontPayoutIntent;
use App\Storefront\Notifications\ChapaPayoutStatusNotification;
use App\Storefront\Services\StorefrontPayoutProcessingService;
use Illuminate\Support\Facades\Notification;
use Mockery;
use RuntimeException;
use Tests\Support\StorefrontPayoutTestCase;

class StorefrontPayoutProcessingServiceTest extends StorefrontPayoutTestCase
{
    public function testSuccessfulSettlementEmailsTheCreator(): void
    {
        Notification::fake();
        $this->creatorId();
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('verifyTransfer')->once()->andReturn($this->verified());
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldReceive('disbursePayout')->once();

        $payout = $this->payout();
        $intent = $this->intent($payout);

        (new StorefrontPayoutProcessingService(creatorLedger: $ledger, chapaPayoutService: $provider))
            ->verifyPayout($intent);

        Notification::assertSentTo(
            User::query()->findOrFail(30),
            ChapaPayoutStatusNotification::class,
            fn (ChapaPayoutStatusNotification $notification): bool => $notification->event === 'sent'
                && $notification->amountLabel === '500.00 ETB'
                && $notification->reference === 'lk-po-TEST-REF-01',
        );
    }

    public function testFailedSettlementEmailsTheCreator(): void
    {
        Notification::fake();
        $this->creatorId();
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('verifyTransfer')->once()->andReturn($this->verified('failed'));
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldReceive('releasePayoutReservation')->once();
        $finance = Mockery::mock(DigitalProductFinance::class);
        $finance->shouldReceive('record')->once();
        $this->app->instance(DigitalProductFinance::class, $finance);

        $payout = $this->payout();
        $intent = $this->intent($payout);

        (new StorefrontPayoutProcessingService(creatorLedger: $ledger, chapaPayoutService: $provider))
            ->verifyPayout($intent);

        Notification::assertSentTo(
            User::query()->findOrFail(30),
            ChapaPayoutStatusNotification::class,
            fn (ChapaPayoutStatusNotification $notification): bool => $notification->event === 'failed'
                && $notification->reason === 'Chapa verified the transfer was unsuccessful.',
        );
    }

    private function creatorId(): int
    {
        return (int) User::query()->insertGetId([
            'id' => 30,
            'name' => 'Ada',
            'email' => 'ada@example.test',
            'created_at' => now(),
            'updated_at' => now(),
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
        $provider->shouldReceive('createTransfer')->once()->andReturnUsing(
            fn (StorefrontPayoutIntent $intent) => [
                'status' => 'success',
                'message' => 'Transfer Queued Successfully',
                'data' => $intent->merchant_reference,
            ],
        );

        $service = new StorefrontPayoutProcessingService(chapaPayoutService: $provider);
        $intent = $service->prepareIntent($payout);
        $queued = $service->submitPayout($intent);

        $this->assertSame(StorefrontPayoutIntent::STATUS_PROVIDER_PENDING, $queued->status);
        $this->assertSame('processing', $payout->fresh()->status);
        $this->assertNull($payout->fresh()->paid_at);
    }

    public function testNestedProviderQueueResponseWithExactReferenceIsAccepted(): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('createTransfer')->once()->andReturnUsing(
            fn (StorefrontPayoutIntent $intent) => [
                'status' => 'success',
                'data' => [
                    'id' => 123,
                    'reference' => $intent->merchant_reference,
                    'status' => 'pending',
                ],
            ],
        );

        $payout = $this->payout();
        $service = new StorefrontPayoutProcessingService(chapaPayoutService: $provider);
        $intent = $service->prepareIntent($payout);
        $queued = $service->submitPayout($intent);

        $this->assertSame(StorefrontPayoutIntent::STATUS_PROVIDER_PENDING, $queued->status);
        $this->assertSame($intent->merchant_reference, $queued->chapa_reference);
        $this->assertSame('processing', $payout->fresh()->status);
    }

    public function testUnexpectedQueuedTransferReferenceRemainsUncertainAndCannotBeResent(): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('createTransfer')->once()->andReturn([
            'status' => 'success',
            'data' => 'a-different-transfer',
        ]);
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldNotReceive('disbursePayout');

        $payout = $this->payout();
        $service = new StorefrontPayoutProcessingService(
            creatorLedger: $ledger, chapaPayoutService: $provider
        );
        $intent = $service->prepareIntent($payout);
        $first = $service->submitPayout($intent);
        $second = $service->submitPayout($intent);

        $this->assertSame(StorefrontPayoutIntent::STATUS_SUBMITTED, $first->status);
        $this->assertSame(StorefrontPayoutIntent::STATUS_SUBMITTED, $second->status);
        $this->assertNull($second->chapa_reference);
        $this->assertSame(1, (int) $second->attempts);
        $this->assertSame('processing', $payout->fresh()->status);
    }

    public function testFailedProviderLookupCannotDisburse(): void
    {
        $this->assertFailedProviderLookupLeavesFundsReserved('success');
    }

    public function testFailedProviderLookupCannotRelease(): void
    {
        $this->assertFailedProviderLookupLeavesFundsReserved('failed');
    }

    private function assertFailedProviderLookupLeavesFundsReserved(string $transferStatus): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $response = $this->verified($transferStatus);
        $response['status'] = 'failed';
        $provider->shouldReceive('verifyTransfer')->once()->andReturn($response);

        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldNotReceive('disbursePayout');
        $ledger->shouldNotReceive('releasePayoutReservation');

        $payout = $this->payout();
        $intent = $this->intent($payout);
        $service = new StorefrontPayoutProcessingService(
            creatorLedger: $ledger, chapaPayoutService: $provider
        );

        try {
            $service->verifyPayout($intent);
            $this->fail('A failed provider lookup must not change the payout.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('verification lookup', $exception->getMessage());
        }

        $this->assertSame('processing', $payout->fresh()->status);
        $this->assertSame(StorefrontPayoutIntent::STATUS_PROVIDER_PENDING, $intent->fresh()->status);
    }

    public function testMatchingRecipientFromVerificationAllowsSettlement(): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $response = $this->verified();
        $response['data']['account_number'] = '1000123456789';
        $provider->shouldReceive('verifyTransfer')->once()->andReturn($response);

        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldReceive('disbursePayout')->once();

        $payout = $this->payout();
        $service = new StorefrontPayoutProcessingService(
            creatorLedger: $ledger, chapaPayoutService: $provider
        );
        $verified = $service->verifyPayout($this->intent($payout));

        $this->assertSame(StorefrontPayoutIntent::STATUS_SUCCESSFUL, $verified->status);
        $this->assertSame('paid', $payout->fresh()->status);
    }

    public function testMismatchedRecipientFromVerificationCannotDisburse(): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $response = $this->verified();
        $response['data']['account_number'] = '1000123456788';
        $provider->shouldReceive('verifyTransfer')->once()->andReturn($response);

        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldNotReceive('disbursePayout');

        $payout = $this->payout();
        $intent = $this->intent($payout);
        $service = new StorefrontPayoutProcessingService(
            creatorLedger: $ledger, chapaPayoutService: $provider
        );

        $this->expectExceptionMessage('different recipient account');
        try {
            $service->verifyPayout($intent);
        } finally {
            $this->assertSame('processing', $payout->fresh()->status);
        }
    }

    public function testTimedOutDispatchCannotBeSentTwice(): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('createTransfer')->once()->andThrow(new RuntimeException('timeout'));
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldNotReceive('releasePayoutReservation');
        $payout = $this->payout();
        $service = new StorefrontPayoutProcessingService(
            creatorLedger: $ledger,
            chapaPayoutService: $provider,
        );
        $intent = $service->prepareIntent($payout);
        $first = $service->submitPayout($intent);
        $second = $service->submitPayout($intent);

        $this->assertSame(StorefrontPayoutIntent::STATUS_SUBMITTED, $first->status);
        $this->assertSame(StorefrontPayoutIntent::STATUS_SUBMITTED, $second->status);
        $this->assertSame(1, (int) $second->attempts);
        $this->assertSame('processing', $payout->fresh()->status);
    }

    public function testExplicitProviderRejectionRejectsWithdrawalAndReleasesReservationOnce(): void
    {
        Notification::fake();
        $this->creatorId();
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('createTransfer')->once()->andThrow(
            new ChapaTransferRejectedException(
                providerMessage: 'Our Transfer hours are Mon-Sat from 08:30 AM - 04:30 PM only.',
                httpStatus: 401,
            ),
        );
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldReceive('releasePayoutReservation')->once();
        $finance = Mockery::mock(DigitalProductFinance::class);
        $finance->shouldReceive('record')->once();
        $this->app->instance(DigitalProductFinance::class, $finance);

        $payout = $this->payout();
        $service = new StorefrontPayoutProcessingService(
            creatorLedger: $ledger,
            chapaPayoutService: $provider,
        );
        $intent = $service->prepareIntent($payout);

        $first = $service->submitPayout($intent);
        $second = $service->submitPayout($intent->fresh());

        $reason = 'Chapa rejected the transfer because it was submitted outside transfer hours.';
        $this->assertSame(StorefrontPayoutIntent::STATUS_FAILED, $first->status);
        $this->assertSame(StorefrontPayoutIntent::STATUS_FAILED, $second->status);
        $this->assertSame($reason, $first->last_error);
        $this->assertSame('rejected', $payout->fresh()->status);
        $this->assertSame($reason, $payout->fresh()->rejection_reason);
        $this->assertNotNull($payout->fresh()->rejected_at);

        Notification::assertSentTo(
            User::query()->findOrFail(30),
            ChapaPayoutStatusNotification::class,
            fn (ChapaPayoutStatusNotification $notification): bool => $notification->event === 'failed'
                && $notification->reason === $reason,
        );
    }

    public function testPendingVerificationClearsUncertaintyButKeepsCreatorFundsReserved(): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('verifyTransfer')->once()->andReturn($this->verified('pending'));
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldNotReceive('disbursePayout');
        $ledger->shouldNotReceive('releasePayoutReservation');

        $payout = $this->payout();
        $intent = $this->intent($payout);
        $intent->update([
            'status' => StorefrontPayoutIntent::STATUS_SUBMITTED,
            'last_error' => 'Submission uncertain.',
        ]);

        $service = new StorefrontPayoutProcessingService(creatorLedger: $ledger, chapaPayoutService: $provider);
        $verified = $service->verifyPayout($intent);

        $this->assertSame(StorefrontPayoutIntent::STATUS_PROVIDER_PENDING, $verified->status);
        $this->assertNull($verified->last_error);
        $this->assertNotNull($verified->verified_at);
        $this->assertSame('processing', $payout->fresh()->status);
        $this->assertNull($payout->fresh()->paid_at);
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

    public function testSingleRecordListVerificationCanSettleExactlyOnce(): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('verifyTransfer')->twice()->andReturn([
            'status' => 'success',
            'data' => [$this->verified()['data']],
        ]);
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldReceive('disbursePayout')->once();

        $payout = $this->payout();
        $intent = $this->intent($payout);
        $service = new StorefrontPayoutProcessingService(
            creatorLedger: $ledger,
            chapaPayoutService: $provider,
        );

        $service->verifyPayout($intent);
        $service->verifyPayout($intent->fresh());

        $this->assertSame('paid', $payout->fresh()->status);
        $this->assertSame(StorefrontPayoutIntent::STATUS_SUCCESSFUL, $intent->fresh()->status);
    }

    public function testQueuedTransferStringListLeavesFundsReservedAndPending(): void
    {
        $payout = $this->payout();
        $intent = $this->intent($payout);

        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('verifyTransfer')->once()->andReturn([
            'status' => 'success',
            'data' => [$intent->merchant_reference],
        ]);
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldNotReceive('disbursePayout');
        $ledger->shouldNotReceive('releasePayoutReservation');

        $service = new StorefrontPayoutProcessingService(
            creatorLedger: $ledger,
            chapaPayoutService: $provider,
        );

        $result = $service->verifyPayout($intent);

        $this->assertSame(StorefrontPayoutIntent::STATUS_PROVIDER_PENDING, $result->status);
        $this->assertSame('processing', $payout->fresh()->status);
    }

    public function testAmbiguousListVerificationLeavesFundsReserved(): void
    {
        $provider = Mockery::mock(ChapaPayoutService::class);
        $provider->shouldReceive('verifyTransfer')->once()->andReturn([
            'status' => 'success',
            'data' => [$this->verified()['data'], $this->verified()['data']],
        ]);
        $ledger = Mockery::mock(CreatorLedgerService::class);
        $ledger->shouldNotReceive('disbursePayout');
        $ledger->shouldNotReceive('releasePayoutReservation');

        $payout = $this->payout();
        $intent = $this->intent($payout);
        $service = new StorefrontPayoutProcessingService(
            creatorLedger: $ledger,
            chapaPayoutService: $provider,
        );

        try {
            $service->verifyPayout($intent);
            $this->fail('Multiple records must fail closed.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('unambiguous', $exception->getMessage());
        }

        $this->assertSame('processing', $payout->fresh()->status);
        $this->assertSame(StorefrontPayoutIntent::STATUS_PROVIDER_PENDING, $intent->fresh()->status);
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
