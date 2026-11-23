<?php

namespace Tests\Feature;

use App\Kyc\Models\KycVerification;
use App\Models\User;
use App\Storefront\ChapaPayoutService;
use App\Storefront\Models\DigitalProductPayoutMethod;
use App\Storefront\Models\DigitalProductWithdrawalMethod;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\WorkspacePayoutConfig;
use App\Storefront\DigitalProductFinance;
use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Ledger\JournalEntryData;
use App\Storefront\Ledger\JournalLineData;
use App\Storefront\Ledger\JournalPostingService;
use App\Storefront\PayoutRequestService;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Psr\Log\AbstractLogger;
use Tests\TestCase;

class PayoutSystemTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Notification::fake();
        // Payouts are gated by the storefront currency + hold days config.
        config()->set('store.payout_hold_days', 0);
        config()->set('storefront.currency', 'ETB');
    }

    /**
     * A verified creator with a funded ledger and an active withdrawal method
     * should be able to request a payout, which reserves the funds.
     */
    public function testVerifiedCreatorCanRequestPayoutAndReservesFunds(): void
    {
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 10000);
        $this->createPayoutMethod($creator, $workspaceId);

        $payout = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 4000);

        $this->assertSame('requested', $payout->status);
        $this->assertSame(4000, $payout->amount_cents);
        $this->assertSame('requested', $payout->fresh()->status);

        // Funds are reserved: available drops, reserved rises.
        $summary = app(\App\Storefront\DigitalProductFinance::class)->summary($creator->id, $workspaceId, false);
        $this->assertSame(6000, $summary['available_for_payout_cents']);
        $this->assertSame(4000, $summary['reserved_payout_cents']);

        // A ledger entry records the reservation against the payout.
        $this->assertDatabaseHas('digital_product_earnings_ledger', [
            'payout_request_id' => $payout->id,
            'entry_type' => 'payout_reserved',
            'amount_cents' => -4000,
        ]);
    }

    public function testCreatorCanRequestAnotherPayoutWhileExistingReservationRemains(): void
    {
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 10000);
        $this->createPayoutMethod($creator, $workspaceId);

        $first = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 4000);
        $first->update(['status' => 'processing']);
        $second = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 500);

        $this->assertSame('processing', $first->fresh()->status);
        $this->assertSame('requested', $second->status);
        $summary = app(DigitalProductFinance::class)->summary($creator->id, $workspaceId);
        $this->assertSame(5500, $summary['available_for_payout_cents']);
        $this->assertSame(4500, $summary['reserved_payout_cents']);

        try {
            app(PayoutRequestService::class)->create($creator->id, $workspaceId, 5501);
            $this->fail('The reserved amounts must not be available for another request.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('amount_cents', $exception->errors());
        }
    }

    public function testUnbackedLegacyEarningsCannotBeWithdrawnWithoutChapaJournalFunds(): void
    {
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->createPayoutMethod($creator, $workspaceId);

        // Simulate an older earnings record without a Chapa settlement journal.
        app(DigitalProductFinance::class)->record(
            $workspaceId,
            $creator->id,
            'legacy-unreconciled:' . $creator->id,
            'sale',
            25000,
            'ETB',
            ['available_at' => now()],
        );

        $summary = app(DigitalProductFinance::class)->summary($creator->id, $workspaceId);
        $this->assertSame(0, $summary['available_for_payout_cents']);
        $this->assertTrue($summary['balance_reconciliation_required']);

        try {
            app(PayoutRequestService::class)->create($creator->id, $workspaceId, 1000);
            $this->fail('Unbacked earnings must not authorize a withdrawal.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('amount_cents', $exception->errors());
        }
        $this->assertDatabaseMissing('payout_requests', ['creator_id' => $creator->id]);
    }

    public function testAvailableBalanceUsesCanonicalUppercaseCurrencyAndJournal(): void
    {
        config()->set('storefront.currency', 'etb');
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->createPayoutMethod($creator, $workspaceId);
        $this->creditSale($creator, 10000);
        // A separate currency must not inflate the ETB earnings or produce
        // a false mismatch on the Chapa balance summary.
        app(DigitalProductFinance::class)->record(
            $workspaceId, $creator->id, 'foreign-currency:' . $creator->id,
            'sale', 50000, 'USD', ['available_at' => now()]
        );

        $summary = app(DigitalProductFinance::class)->summary($creator->id, $workspaceId);
        $this->assertSame('ETB', $summary['currency']);
        $this->assertSame(10000, $summary['available_for_payout_cents']);
        $this->assertFalse($summary['balance_reconciliation_required']);

        $payout = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 3000);
        $this->assertSame('ETB', $payout->currency);
        $this->assertSame(7000, app(DigitalProductFinance::class)
            ->summary($creator->id, $workspaceId)['available_for_payout_cents']);
    }

    /**
     * A creator that has not completed KYC cannot request a payout while
     * the kyc.enabled setting is true.
     */
    public function testUnverifiedCreatorIsBlockedWhenKycEnabled(): void
    {
        settings()->save(['kyc.enabled' => true]);
        $creator = $this->createCreator();
        $workspaceId = $creator->workspaces()->first()->id;

        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        app(PayoutRequestService::class)->create($creator->id, $workspaceId, 1000);
    }

    /**
     * KYC gate is skipped when kyc is not enabled.
     */
    public function testKycGateIsSkippedWhenKycDisabled(): void
    {
        settings()->save(['kyc.enabled' => false]);
        $creator = $this->createCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 5000);
        $this->createPayoutMethod($creator, $workspaceId);

        $payout = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 1000);
        $this->assertSame('requested', $payout->status);
    }

    /**
     * Without a withdrawal method the request fails with a validation error.
     */
    public function testRequestWithoutWithdrawalMethodFails(): void
    {
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 10000);

        try {
            app(PayoutRequestService::class)->create($creator->id, $workspaceId, 1000);
            $this->fail('Expected validation exception for missing withdrawal method.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('withdrawal_method', $e->errors());
        }
    }

    /**
     * A disabled withdrawal method is treated as missing.
     */
    public function testRequestWithInactiveWithdrawalMethodFails(): void
    {
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 10000);
        $this->createPayoutMethod($creator, $workspaceId, active: false);

        try {
            app(PayoutRequestService::class)->create($creator->id, $workspaceId, 1000);
            $this->fail('Expected validation exception for inactive withdrawal method.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('withdrawal_method', $e->errors());
        }
    }

    /**
     * Requesting more than the available balance is rejected.
     */
    public function testRequestExceedingAvailableBalanceFails(): void
    {
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 5000);
        $this->createPayoutMethod($creator, $workspaceId);

        try {
            app(PayoutRequestService::class)->create($creator->id, $workspaceId, 6000);
            $this->fail('Expected validation exception for insufficient balance.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('amount_cents', $e->errors());
        }
    }

    /**
     * Requesting below the withdrawal method minimum is rejected.
     */
    public function testRequestBelowMinimumFails(): void
    {
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 5000);
        // minimum_amount_cents defaults to 100 in the factory.
        $this->createPayoutMethod($creator, $workspaceId, minimum: 200);

        try {
            app(PayoutRequestService::class)->create($creator->id, $workspaceId, 100);
            $this->fail('Expected validation exception for amount below minimum.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('amount_cents', $e->errors());
        }
    }

    public function testPlatformWideMinimumOverridesAWeakerWithdrawalMethodMinimum(): void
    {
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 10000);
        $this->createPayoutMethod($creator, $workspaceId, minimum: 100);

        settings()->set('marketplace.minimum_payout_cents', 5000);
        try {
            app(PayoutRequestService::class)->create($creator->id, $workspaceId, 4000);
            $this->fail('Expected validation against the platform payout minimum.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('amount_cents', $exception->errors());
        }

        $payout = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 6000);
        $this->assertSame(6000, $payout->amount_cents);

        settings()->set('marketplace.minimum_payout_cents', 7000);
        try {
            app(PayoutRequestService::class)->transition($payout, 'start_processing', $creator->id);
            $this->fail('A raised policy minimum must also block old pending withdrawals.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('amount_cents', $exception->errors());
        }
    }

    /**
     * A zero-valued administrator minimum cannot create a payout Chapa v1
     * would refuse to transfer (minimum 1.00 ETB).
     */
    public function testZeroProviderMinimumStillRequiresOneEtb(): void
    {
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 5000);
        $this->createPayoutMethod($creator, $workspaceId, minimum: 0);

        foreach ([0, 99] as $cents) {
            try {
                app(PayoutRequestService::class)->create($creator->id, $workspaceId, $cents);
                $this->fail('Expected the effective 1.00 ETB minimum to reject this amount.');
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('amount_cents', $exception->errors());
            }
        }

        $this->assertSame(0, PayoutRequest::query()->where('creator_id', $creator->id)->count());
        $payout = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 100);
        $this->assertSame(100, $payout->amount_cents);
    }

    public function testFinanceLimitChangeBlocksApprovalOfAnExistingWithdrawal(): void
    {
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 30000);
        $account = $this->createPayoutMethod($creator, $workspaceId, maximum: 20000);
        $payout = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 10000);

        DigitalProductWithdrawalMethod::query()->findOrFail($account->withdrawal_method_id)
            ->update(['maximum_amount_cents' => 5000]);

        try {
            app(PayoutRequestService::class)->transition($payout, 'start_processing', $creator->id);
            $this->fail('A withdrawal beyond the current maximum must not be approved.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('amount_cents', $exception->errors());
        }

        $this->assertSame('requested', $payout->fresh()->status);
    }

    public function testIncreasedProviderMinimumBlocksOldWithdrawalApproval(): void
    {
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 10000);
        $account = $this->createPayoutMethod($creator, $workspaceId, minimum: 100);
        $payout = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 1000);

        DigitalProductWithdrawalMethod::query()->findOrFail($account->withdrawal_method_id)
            ->update(['minimum_amount_cents' => 1500]);

        try {
            app(PayoutRequestService::class)->transition($payout, 'start_processing', $creator->id);
            $this->fail('An outdated withdrawal below the new minimum must be rejected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('amount_cents', $exception->errors());
        }

        $this->assertSame('requested', $payout->fresh()->status);
    }

    public function testFinanceLimitChangeBlocksDispatchAfterAdminApproval(): void
    {
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 30000);
        $account = $this->createPayoutMethod($creator, $workspaceId, maximum: 20000);
        $payout = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 10000);
        app(PayoutRequestService::class)->transition($payout, 'start_processing', $creator->id);

        DigitalProductWithdrawalMethod::query()->findOrFail($account->withdrawal_method_id)
            ->update(['maximum_amount_cents' => 5000]);
        config()->set('services.chapa.secret', 'CHASECK_TEST-fixture-limit');
        config()->set('services.chapa.test_payouts_enabled', true);
        config()->set('services.chapa.payouts_enabled', false);
        Http::fake();

        try {
            app(PayoutRequestService::class)->submitChapaPayout($payout->fresh(), $creator->id);
            $this->fail('A withdrawal beyond the current maximum must not be dispatched.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('amount_cents', $exception->errors());
        }

        $this->assertSame('processing', $payout->fresh()->status);
        $summary = app(DigitalProductFinance::class)->summary($creator->id, $workspaceId, false);
        $this->assertSame(10000, $summary['reserved_payout_cents']);
        $this->assertDatabaseMissing('storefront_payout_intents', ['payout_request_id' => $payout->id]);
        Http::assertNothingSent();
    }

    /**
     * Requesting above the withdrawal method maximum is rejected.
     */
    public function testRequestAboveMaximumFails(): void
    {
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 100000);
        $this->createPayoutMethod($creator, $workspaceId, maximum: 50000);

        try {
            app(PayoutRequestService::class)->create($creator->id, $workspaceId, 60000);
            $this->fail('Expected validation exception for amount above maximum.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('amount_cents', $e->errors());
        }
    }

    /**
     * A creator cannot have two pending payouts simultaneously.
     */
    public function testDuplicatePendingRequestIsBlocked(): void
    {
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 10000);
        $this->createPayoutMethod($creator, $workspaceId);

        $payout = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 1000);
        $this->assertSame('requested', $payout->status);

        try {
            app(PayoutRequestService::class)->create($creator->id, $workspaceId, 1000);
            $this->fail('Expected validation exception for duplicate pending request.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('amount_cents', $e->errors());
        }
    }

    /**
     * Full admin state-machine flow: requested -> processing -> paid releases
     * the reservation, marks paid, and records a debit statement-like entry.
     */
    public function testAdminCannotMarkChapaWithdrawalPaidWithoutVerification(): void
    {
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();

        $updated = app(PayoutRequestService::class)->transition($payout, 'start_processing', $admin->id, ['note' => 'Looks good']);
        $this->assertSame('processing', $updated->status);
        $this->assertNotNull($updated->processing_at);
        $this->assertStringContainsString('Looks good', $updated->activities->last()->note);

        try {
            app(PayoutRequestService::class)->transition($updated, 'mark_paid', $admin->id, [
                'transfer_reference' => 'UNVERIFIED',
            ]);
            $this->fail('Manual status update must not settle a Chapa withdrawal.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('status', $e->errors());
        }

        $this->assertSame('processing', $payout->fresh()->status);
        $this->assertNull($payout->fresh()->paid_at);
        $summary = app(DigitalProductFinance::class)->summary($creator->id, $workspaceId);
        $this->assertSame($payout->amount_cents, $summary['reserved_payout_cents']);
    }

    /**
     * Admin rejecting a payout releases the reserved funds back to available.
     */
    public function testAdminRejectingReleasesFunds(): void
    {
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();

        $rejected = app(PayoutRequestService::class)->transition($payout, 'reject', $admin->id, ['reason' => 'Suspicious documents']);
        $this->assertSame('rejected', $rejected->status);
        $this->assertSame('Suspicious documents', $rejected->rejection_reason);
        $this->assertNotNull($rejected->rejected_at);

        $summary = app(\App\Storefront\DigitalProductFinance::class)->summary($creator->id, $workspaceId, false);
        // Funds returned to available balance.
        $this->assertSame(10000, $summary['available_for_payout_cents']);
        $this->assertSame(0, $summary['reserved_payout_cents']);
    }

    /**
     * The creator can cancel their own pending request, which releases funds.
     */
    public function testCreatorCanCancelPendingRequest(): void
    {
        [$creator, $workspaceId, $payout] = $this->seedPendingPayout(withAdmin: false);

        $cancelled = app(PayoutRequestService::class)->transition($payout, 'cancel', $creator->id);
        $this->assertSame('cancelled', $cancelled->status);
        $this->assertNotNull($cancelled->cancelled_at);

        $summary = app(\App\Storefront\DigitalProductFinance::class)->summary($creator->id, $workspaceId, false);
        $this->assertSame(10000, $summary['available_for_payout_cents']);
    }

    /**
     * A paid-out payout is terminal — no further transitions are allowed.
     */
    public function testPaidPayoutCannotBeChanged(): void
    {
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();
        $processing = app(PayoutRequestService::class)->transition($payout, 'start_processing', $admin->id, ['note' => 'ok']);
        $processing->update(['status' => 'paid', 'paid_at' => now()]);

        $this->expectException(ValidationException::class);
        app(PayoutRequestService::class)->transition($processing->fresh(), 'reject', $admin->id, ['reason' => 'no']);
    }

    /**
     * The state machine only permits the documented transitions.
     */
    public function testStateMachineTransitions(): void
    {
        $this->assertTrue(PayoutRequestService::canTransition('requested', 'processing'));
        $this->assertTrue(PayoutRequestService::canTransition('requested', 'rejected'));
        $this->assertTrue(PayoutRequestService::canTransition('requested', 'cancelled'));
        $this->assertTrue(PayoutRequestService::canTransition('processing', 'paid'));
        $this->assertTrue(PayoutRequestService::canTransition('processing', 'rejected'));

        // Cannot go backward or out of terminal states.
        $this->assertFalse(PayoutRequestService::canTransition('paid', 'processing'));
        $this->assertFalse(PayoutRequestService::canTransition('rejected', 'processing'));
        $this->assertFalse(PayoutRequestService::canTransition('cancelled', 'processing'));
        // Cannot skip stages.
        $this->assertFalse(PayoutRequestService::canTransition('requested', 'paid'));
    }

    /**
     * Transitioning to processing from a rejected/cancelled terminal state is blocked.
     */
    public function testCannotTransitionFromTerminalStatus(): void
    {
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();
        $rejected = app(PayoutRequestService::class)->transition($payout, 'reject', $admin->id, ['reason' => 'bad']);
        $this->expectException(ValidationException::class);
        app(PayoutRequestService::class)->transition($rejected, 'start_processing', $admin->id, ['note' => 'x']);
    }

    /**
     * Revealing the destination requires an admin and records the reveal.
     */
    public function testAdminCanRevealDestination(): void
    {
        settings()->save(['kyc.enabled' => true]);
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();

        $destination = app(PayoutRequestService::class)->revealDestination($payout, $admin->id, 'audit check');
        $this->assertSame($payout->payout_destination, $destination);
        $this->assertDatabaseHas('digital_product_payout_destination_reveals', [
            'payout_request_id' => $payout->id,
            'revealed_by' => $admin->id,
        ]);
    }

    /**
     * The creator index shows only their own payouts for the active workspace.
     */
    public function testCreatorIndexListsOnlyTheirPayouts(): void
    {
        settings()->save(['kyc.enabled' => true]);
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 10000);
        $this->createPayoutMethod($creator, $workspaceId);
        $payout = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 1000);

        $this->stateful()->actingAs($creator);
        $response = $this->getJson('/api/v1/items/payout-requests');
        $response->assertOk()->assertJsonPath('data.0.id', $payout->id);
    }

    /**
     * Admin index returns all payout requests across creators.
     */
    public function testAdminIndexListsAllPayouts(): void
    {
        settings()->save(['kyc.enabled' => true]);
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();

        $this->stateful()->actingAs($admin);
        $response = $this->getJson('/api/v1/admin/items/payout-requests');
        $response->assertOk()->assertJsonPath('data.0.id', $payout->id);
    }

    public function testAdminMarkPaidRoute(): void
    {
        settings()->save(['kyc.enabled' => true]);
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();

        $this->stateful()->actingAs($admin);
        // Processing must happen before marking paid (state machine order).
        $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/processing", [
            'note' => 'Processing',
        ])->assertOk();

        $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/mark-paid", [
            'transfer_reference' => 'CHAPA-REF-999',
        ])->assertStatus(422);
        $this->assertSame('processing', $payout->fresh()->status);
        $this->assertNull($payout->fresh()->paid_at);
    }

    public function testAdminCanSavePayoutPolicyAndValidationRejectsUnsafeMinimum(): void
    {
        $admin = $this->createAdmin();
        $admin->permissions()->attach(Permission::query()->firstOrCreate(['name' => 'settings.update']));

        $this->stateful()->actingAs($admin);
        $this->getJson('/api/v1/admin/marketplace/payout-policy')
            ->assertOk()
            ->assertJsonPath('data.payout_hold_days', 0)
            ->assertJsonPath('data.minimum_payout_cents', 100);

        $this->putJson('/api/v1/admin/marketplace/payout-policy', [
            'payout_hold_days' => 2,
            'minimum_payout_cents' => 5000,
        ])->assertOk()
            ->assertJsonPath('data.payout_hold_days', 2)
            ->assertJsonPath('data.minimum_payout_cents', 5000);

        $this->assertSame(2, app(\App\Storefront\Services\MarketplacePayoutPolicy::class)->holdDays());
        $this->assertSame(5000, app(\App\Storefront\Services\MarketplacePayoutPolicy::class)->minimumWithdrawalCents());

        $this->putJson('/api/v1/admin/marketplace/payout-policy', [
            'payout_hold_days' => -1,
            'minimum_payout_cents' => 0,
        ])->assertUnprocessable();
    }

    public function testNonAdminCannotAccessAdminPayoutRoutes(): void
    {
        settings()->save(['kyc.enabled' => true]);
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 10000);
        $this->createPayoutMethod($creator, $workspaceId);
        $payout = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 1000);

        $this->stateful()->actingAs($creator);
        $this->getJson('/api/v1/admin/items/payout-requests')->assertForbidden();
        $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/mark-paid", [
            'transfer_reference' => 'ref',
        ])->assertForbidden();
    }

    /**
     * Creator cannot mark their own payout as paid.
     */
    public function testCreatorCannotMarkPaid(): void
    {
        settings()->save(['kyc.enabled' => true]);
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 10000);
        $this->createPayoutMethod($creator, $workspaceId);
        $payout = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 1000);

        $this->stateful()->actingAs($creator);
        $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/mark-paid", [
            'transfer_reference' => 'ref',
        ])->assertForbidden();
    }

    /**
     * Marking paid requires a transfer reference.
     */
    public function testMarkPaidRequiresTransferReference(): void
    {
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();

        $this->stateful()->actingAs($admin);
        $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/mark-paid", [])
            ->assertJsonValidationErrorFor('transfer_reference');
    }

    public function testCreatorCanAddCbebirrAndDashenAlongsideTelebirr(): void
    {
        $creator = $this->createVerifiedCreator();
        $destinations = ['telebirr' => '0911223344', 'cbebirr' => '0911223344', 'dashen' => '1234567890123'];
        DigitalProductWithdrawalMethod::query()->whereIn('code', ['telebirr', 'cbebirr', 'bank_transfer'])
            ->update(['is_active' => true]);
        $this->mock(ChapaPayoutService::class)->shouldReceive('availableBankOptions')
            ->andReturn([['code' => 'telebirr'], ['code' => 'cbebirr'], ['code' => 'dashen']]);
        $this->stateful()->actingAs($creator);

        foreach ($destinations as $code => $destination) {
            $this->postJson('/api/v1/items/payout-methods', [
                'bank_code' => $code,
                'account_holder' => 'Example Creator',
                'destination' => $destination,
                'is_default' => false,
            ])->assertCreated()
                ->assertJsonPath('data.bank_code', $code)
                ->assertJsonPath('data.bank_enabled', true)
                ->assertJsonPath('data.is_default', $code === 'telebirr')
                ->assertJsonPath('data.status', DigitalProductPayoutMethod::STATUS_PENDING);
        }

        settings()->save(['marketplace.payout_bank.dashen.enabled' => 0]);
        $accounts = $this->getJson('/api/v1/items/payout-methods')->assertOk()->assertJsonCount(3, 'data');
        $this->assertFalse(collect($accounts->json('data'))->firstWhere('bank_code', 'dashen')['bank_enabled']);
    }

    public function testStoreRouteGatesOnKyc(): void
    {
        settings()->save(['kyc.enabled' => true]);
        $creator = $this->createCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 5000);
        $this->createPayoutMethod($creator, $workspaceId);

        $this->stateful()->actingAs($creator);
        $this->postJson('/api/v1/items/payout-requests', ['amount_cents' => 1000])
            ->assertStatus(422);
    }

    public function testStoreRouteCreatesPayoutWhenVerified(): void
    {
        settings()->save(['kyc.enabled' => true]);
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 10000);
        $this->createPayoutMethod($creator, $workspaceId);

        $this->stateful()->actingAs($creator);
        $this->postJson('/api/v1/items/payout-requests', ['amount_cents' => 1000])
            ->assertCreated()
            ->assertJsonPath('data.status', 'requested');
    }

    public function testWorkspacePayoutConfigShowReturnsEmptyConfigWhenUnset(): void
    {
        $creator = $this->createCreator();
        $workspaceId = $creator->workspaces()->first()->id;

        $this->stateful()->actingAs($creator);
        $this->getJson("/api/v1/workspaces/{$workspaceId}/payout-config")
            ->assertOk()
            ->assertJsonPath('data.workspace_id', $workspaceId)
            ->assertJsonPath('data.withdrawal_method_id', null)
            ->assertJsonPath('data.withdrawal_account', '');

        $this->assertDatabaseMissing((new WorkspacePayoutConfig())->getTable(), [
            'workspace_id' => $workspaceId,
        ]);
    }

    /**
     * Admin can mark a payout as paid with auto_transfer=true for bank_transfer,
     * which triggers a Chapa transfer and returns the Chapa transfer reference.
     */
    public function testAdminMarkPaidWithAutoTransferBankTransfer(): void
    {
        settings()->save(['kyc.enabled' => true]);
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();

        // Use the seeded 'bank_transfer' withdrawal method (code='bank_transfer')
        $bankMethod = \App\Storefront\Models\DigitalProductWithdrawalMethod::query()->where('code', 'bank_transfer')->firstOrFail();

        $payout->update([
            'withdrawal_method_id' => $bankMethod->id,
            'withdrawal_method_name' => $bankMethod->name,
            'payout_destination' => 'cbe_bank:1234567890',
        ]);
        $payout->payoutMethod()->update([
            'withdrawal_method_id' => $bankMethod->id,
            'type' => 'bank_transfer',
            'destination' => 'cbe_bank:1234567890',
            'withdrawal_method_id' => $bankMethod->id,
        ]);

        $this->stateful()->actingAs($admin);
        $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/processing", [
            'note' => 'Processing',
        ])->assertOk();

        // Mock Chapa createTransfer to avoid external API call
        $this->mockChapaTransfer();

        $response = $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/mark-paid", [
            'auto_transfer' => true,
        ])->assertStatus(422);

        $this->assertSame('processing', $payout->fresh()->status);
    }

    /**
     * Admin can mark a payout as paid with auto_transfer=true for telebirr.
     */
    public function testAdminMarkPaidWithAutoTransferTelebirr(): void
    {
        settings()->save(['kyc.enabled' => true]);
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();

        $telebirrMethod = \App\Storefront\Models\DigitalProductWithdrawalMethod::query()->where('code', 'telebirr')->firstOrFail();

        $payout->update([
            'withdrawal_method_id' => $telebirrMethod->id,
            'withdrawal_method_name' => $telebirrMethod->name,
        ]);
        $payout->payoutMethod()->update([
            'withdrawal_method_id' => $telebirrMethod->id,
            'type' => 'telebirr',
            'destination' => '+251911223344',
            'withdrawal_method_id' => $telebirrMethod->id,
        ]);

        $this->stateful()->actingAs($admin);
        $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/processing", [
            'note' => 'Processing',
        ])->assertOk();

        $this->mockChapaTransfer();

        $response = $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/mark-paid", [
            'auto_transfer' => true,
        ])->assertStatus(422);

        $this->assertSame('processing', $payout->fresh()->status);
    }

    public function testChapaV1PayoutDoesNotLogRecipientOrGatewaySecret(): void
    {
        [$creator, $workspaceId, $payout] = $this->seedPendingPayout(withAdmin: false);
        $destination = '+251911223344';
        $secret = 'gateway-secret-account-value';
        $method = DigitalProductWithdrawalMethod::query()->where('code', 'telebirr')->firstOrFail();

        $payout->update([
            'status' => 'processing',
            'withdrawal_method_id' => $method->id,
            'withdrawal_method_name' => $method->name,
            'payout_destination' => $destination,
            'account_holder_snapshot' => 'Test Creator',
            'bank_code_snapshot' => 'telebirr',
        ]);
        $payout->payoutMethod()->update([
            'withdrawal_method_id' => $method->id,
            'type' => 'telebirr',
            'bank_code' => 'telebirr',
            'destination' => $destination,
        ]);

        config(['services.chapa.secret' => 'CHASECK_TEST-log-fixture',
            'services.chapa.test_payouts_enabled' => true,
            'services.chapa.test_transfer_status' => 'failed',
            'services.chapa.transfer_approval_secret' => 'synthetic-approval-fixture',
            'services.chapa.payouts_enabled' => false]);
        Cache::flush();
        Http::fake([
            'https://api.chapa.co/v1/banks' => Http::response([
                'status' => 'success',
                'data' => [['id' => 855, 'slug' => 'telebirr', 'is_active' => 1, 'active' => 1, 'currency' => 'ETB']],
            ]),
            'https://api.chapa.co/v1/transfers' => Http::response([
                'status' => 'success', 'data' => $secret,
            ]),
        ]);

        $logger = new class extends AbstractLogger {
            public array $records = [];

            public function log($level, string|\Stringable $message, array $context = []): void
            {
                $this->records[] = ['message' => (string) $message, 'context' => $context];
            }
        };
        $original = Log::getFacadeRoot();
        Log::swap($logger);
        try {
            $intent = app(\App\Storefront\Services\StorefrontPayoutProcessingService::class)
                ->prepareIntent($payout, 'telebirr');
            app(ChapaPayoutService::class)->createTransfer($intent);
        } finally {
            Log::swap($original);
        }

        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/v1/transfers')
            && $request->data()['status'] === 'failed'
            && $request->data()['currency'] === 'ETB');
        $logged = json_encode($logger->records);
        $this->assertStringNotContainsString($destination, $logged);
        $this->assertStringNotContainsString('251911223344', $logged);
        $this->assertStringNotContainsString($secret, $logged);
    }

    /**
     * Auto-transfer falls back to manual reference for unsupported methods (paypal, other).
     */
    public function testLegacyPaypalCannotEnterChapaPayoutProcessing(): void
    {
        settings()->save(['kyc.enabled' => true]);
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();

        // Retained for historical records, but not eligible for any new
        // Chapa payout approval or transfer (including the old manual path).
        $paypalMethod = \App\Storefront\Models\DigitalProductWithdrawalMethod::query()->where('code', 'paypal')->firstOrFail();

        $payout->update([
            'withdrawal_method_id' => $paypalMethod->id,
            'withdrawal_method_name' => $paypalMethod->name,
            'payout_destination' => 'test@example.com',
        ]);
        $payout->payoutMethod()->update([
            'withdrawal_method_id' => $paypalMethod->id,
            'type' => 'paypal',
            'destination' => 'test@example.com',
        ]);

        $this->stateful()->actingAs($admin);
        $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/processing", [
            'note' => 'Processing',
        ])->assertStatus(422)->assertJsonValidationErrors(['payout_method']);

        $this->assertSame('requested', $payout->fresh()->status);

        $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/mark-paid", [
            'auto_transfer' => true,
        ])->assertStatus(422);

        // The rejected legacy path must not mark any funds as disbursed.
        $this->assertSame('requested', $payout->fresh()->status);
    }

    /**
     * Auto-transfer requires the payout to be in processing state first.
     */
    public function testAutoTransferRequiresProcessingState(): void
    {
        settings()->save(['kyc.enabled' => true]);
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();

        // Do NOT process first, try to mark paid directly with auto_transfer
        $this->stateful()->actingAs($admin);
        $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/mark-paid", [
            'auto_transfer' => true,
        ])->assertStatus(422); // State machine blocks requested -> paid
    }

    /**
     * Mock Chapa transfer to avoid external API calls in tests.
     * Also stubs getBanks so validateBankCode does not hit live Chapa endpoint.
     */
    private function mockChapaTransfer(): void
    {
        Cache::flush();
        config(['services.chapa.secret' => 'platform-secret']);
        Http::fake([
            'https://api.chapa.co/v1/banks' => Http::response([
                'status' => 'success',
                'data' => [
                    ['id' => 946, 'slug' => 'cbe_bank', 'swift' => 'CBETETAA', 'name' => 'Commercial Bank of Ethiopia', 'active' => 1, 'currency' => 'ETB'],
                    ['id' => 880, 'slug' => 'dashen_bank', 'swift' => 'DASHETAA', 'name' => 'Dashen Bank', 'active' => 1, 'currency' => 'ETB'],
                    ['id' => 130, 'slug' => 'abay_bank', 'swift' => 'ABAYETAA', 'name' => 'Abay Bank', 'active' => 1, 'currency' => 'ETB'],
                    ['id' => 0, 'slug' => 'telebirr', 'swift' => 'TELEBIRR', 'name' => 'Telebirr', 'active' => 1, 'currency' => 'ETB'],
                ],
            ]),
            'https://api.chapa.co/v1/transfers' => Http::response([
                'status' => 'success',
                'data' => ['chapa_reference' => 'CP_T_test', 'status' => 'PENDING'],
            ]),
        ]);
    }

    /**
     * Seed a pending payout request for a verified creator that has funds.
     * Returns [creator, workspaceId, payout, admin?].
     */
    private function seedPendingPayout(bool $withAdmin = true): array
    {
        settings()->save(['kyc.enabled' => true]);
        $creator = $this->createVerifiedCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 10000);
        $this->createPayoutMethod($creator, $workspaceId);
        $payout = app(PayoutRequestService::class)->create($creator->id, $workspaceId, 1000);
        $admin = $withAdmin ? $this->createAdmin() : null;

        return [$creator, $workspaceId, $payout, $admin];
    }

    private function createCreator(bool $verified = false): User
    {
        $user = User::query()->forceCreate([
            'name' => 'Creator ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        // Ensure a personal workspace exists (mirrors what ActiveWorkspace would auto-provision).
        if (!\Common\Workspaces\Models\Workspace::query()->where('owner_id', $user->id)->where('is_personal', true)->exists()) {
            (new \Common\Workspaces\Actions\CreateWorkspace())->createPersonalWorkspace($user);
        }

        if ($verified) {
            $this->markCreatorVerified($user);
        }

        return $user;
    }

    private function createVerifiedCreator(): User
    {
        return $this->createCreator(verified: true);
    }

    private function createAdmin(): User
    {
        $admin = User::query()->forceCreate([
            'name' => 'Admin ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $admin->permissions()->attach(
            Permission::query()->firstOrCreate(['name' => 'admin']),
        );

        return $admin;
    }

    private function markCreatorVerified(User $user): void
    {
        // Build a pending KYC verification and approve it so the creator is verified.
        $verification = app(\App\Kyc\KycVerificationService::class)->submit($user, [
            'document_type' => KycVerification::DOCUMENT_TYPE_NATIONAL_ID,
            'document_number' => 'ID-' . Str::random(6),
            'front_of_id_file' => UploadedFile::fake()->image('front.jpg'),
            'back_of_id_file' => UploadedFile::fake()->image('back.jpg'),
            'selfie_file' => UploadedFile::fake()->image('selfie.jpg'),
        ]);
        app(\App\Kyc\KycVerificationService::class)->approve($verification, $this->createAdmin());
        $user->refresh();
    }

    private function creditSale(User $creator, int $cents): void
    {
        $workspaceId = $creator->workspaces()->first()->id;
        // Synthetic, balanced test funding: neither an unbacked earnings row
        // nor a pending provider payment may authorize a withdrawal.
        app(DigitalProductFinance::class)->record(
            $workspaceId,
            $creator->id,
            'sale:' . $creator->id . ':' . $cents,
            'sale',
            $cents,
            'ETB',
            ['available_at' => now(), 'description' => 'Synthetic verified sale'],
        );
        $context = ['creator_id' => $creator->id, 'workspace_id' => $workspaceId];
        app(JournalPostingService::class)->post(
            new JournalEntryData('test_funding', $creator->id, 'sale_' . $cents, 'ETB', $context),
            [
                new JournalLineData(AccountCodes::PLATFORM_CHAPA_CLEARING, $cents, 0, 'ETB', $context),
                new JournalLineData(AccountCodes::CREATOR_AVAILABLE, 0, $cents, 'ETB', $context),
            ],
        );
    }

    private function createPayoutMethod(User $creator, int $workspaceId, bool $active = true, ?int $minimum = 100, ?int $maximum = null): DigitalProductPayoutMethod
    {
        $code = 'bank_transfer_' . $creator->id . '_' . Str::random(4);
        $withdrawalMethod = DigitalProductWithdrawalMethod::query()->create([
            'name' => 'Bank transfer ' . $code,
            'code' => $code,
            'destination_label' => 'Bank account number',
            'instructions' => null,
            'minimum_amount_cents' => $minimum ?? 0,
            'maximum_amount_cents' => $maximum,
            'is_active' => $active,
            'position' => 1,
        ]);

        return DigitalProductPayoutMethod::query()->create([
            'workspace_id' => $workspaceId,
            'creator_id' => $creator->id,
            'withdrawal_method_id' => $withdrawalMethod->id,
            'type' => $withdrawalMethod->code,
            'bank_code' => 'cbe',
            'is_active' => true,
            'status' => 'active',
            'approved_at' => now(),
            'approved_by' => $creator->id,
            'account_holder' => 'Test Creator',
            'destination' => '1234567890',
            'display_label' => 'Bank transfer ending in 7890',
        ]);
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    /**
     * ChapaPayoutService can fetch and cache the bank list.
     */
    public function testChapaServiceCanFetchAndCacheBanks(): void
    {
        $this->mockChapaBanks();
        $service = app(ChapaPayoutService::class);

        // First call - should hit the mock
        $banks1 = $service->getBanks();
        $this->assertIsArray($banks1);
        $this->assertNotEmpty($banks1);
        $this->assertArrayHasKey('id', $banks1[0]);
        $this->assertArrayHasKey('slug', $banks1[0]);
        $this->assertArrayHasKey('swift', $banks1[0]);
        $this->assertArrayHasKey('name', $banks1[0]);

        // Second call - should use cache (we can't easily test cache was used without mocking Cache facade,
        // but we can verify the result is the same)
        $banks2 = $service->getBanks();
        $this->assertEquals($banks1, $banks2);
    }

    /**
     * ChapaPayoutService can validate bank codes against the fetched list.
     */
public function testChapaServiceCanValidateBankCodes(): void
    {
        $this->mockChapaBanks();
        $service = app(ChapaPayoutService::class);

        $this->assertTrue($service->validateBankCode('cbe_bank'));
        $this->assertTrue($service->validateBankCode('CBE_BANK'));
        $this->assertTrue($service->validateBankCode('CBETETAA'));
        $this->assertTrue($service->validateBankCode('946'));
        $this->assertFalse($service->validateBankCode('invalid_bank'));
    }

    /**
     * ChapaPayoutService can find a bank by its code.
     */
    public function testChapaServiceCanFindBankByCode(): void
    {
        $this->mockChapaBanks();
        $service = app(ChapaPayoutService::class);

        $bank = $service->findBankByCode('cbe_bank');
        $this->assertNotNull($bank);
        $this->assertSame('cbe_bank', $bank['slug']);

        $bank = $service->findBankByCode('CBETETAA');
        $this->assertNotNull($bank);
        $this->assertSame('cbe_bank', $bank['slug']);

        $this->assertNull($service->findBankByCode('nonexistent'));
    }

    /**
     * ChapaPayoutService can verify a transfer reference.
     */
    public function testChapaServiceCanVerifyTransfer(): void
    {
        config(['services.chapa.secret' => 'platform-secret']);
        Http::fake([
            'https://api.chapa.co/v1/transfers/verify/test_ref_123' => Http::response([
                'status' => 'success',
                'data' => [
                    'status' => 'SUCCESS',
                    'chapa_reference' => 'CP_T_123',
                    'merchant_reference' => 'test_ref_123',
                    'amount' => 10000,
                    'currency' => 'ETB',
                ],
            ]),
        ]);

        $service = app(ChapaPayoutService::class);

        $result = $service->verifyTransfer('test_ref_123');

        $this->assertSame('SUCCESS', $result['data']['status']);
        $this->assertSame('test_ref_123', $result['data']['merchant_reference']);
    }

    /**
     * Bank code validation prevents invalid codes in bank transfer creation.
     */
    public function testBankTransferRejectsInvalidBankCode(): void
    {
        settings()->save(['kyc.enabled' => true]);
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();

        $bankMethod = \App\Storefront\Models\DigitalProductWithdrawalMethod::query()->where('code', 'bank_transfer')->firstOrFail();

        $payout->update([
            'withdrawal_method_id' => $bankMethod->id,
            'withdrawal_method_name' => $bankMethod->name,
            'payout_destination' => 'INVALID:1234567890',
        ]);
        $payout->payoutMethod()->update([
            'withdrawal_method_id' => $bankMethod->id,
            'type' => 'bank_transfer',
            'destination' => 'INVALID:1234567890',
            'withdrawal_method_id' => $bankMethod->id,
        ]);

        $this->stateful()->actingAs($admin);
        $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/processing", [
            'note' => 'Processing',
        ])->assertOk();

        $this->mockChapaTransfer();

        $response = $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/mark-paid", [
            'auto_transfer' => true,
        ]);

        $response->assertStatus(422); // Unverified automatic-paid shortcuts are forbidden
    }

    /**
     * Mock Chapa banks list for testing.
     */
    private function mockChapaBanks(): void
    {
        Cache::flush();
        config(['services.chapa.secret' => 'platform-secret']);
        Http::fake([
            'https://api.chapa.co/v1/banks' => Http::response([
                'status' => 'success',
                'data' => [
                    [
                        'id' => 946,
                        'slug' => 'cbe_bank',
                        'swift' => 'CBETETAA',
                        'name' => 'Commercial Bank of Ethiopia',
                        'acct_length' => 13,
                        'country_id' => 1,
                        'is_mobilemoney' => null,
                        'is_active' => 1,
                        'is_rtgs' => 1,
                        'active' => 1,
                        'currency' => 'ETB',
                    ],
                    [
                        'id' => 880,
                        'slug' => 'dashen_bank',
                        'swift' => 'DASHETAA',
                        'name' => 'Dashen Bank',
                        'acct_length' => 13,
                        'country_id' => 1,
                        'is_mobilemoney' => null,
                        'is_active' => 1,
                        'is_rtgs' => 1,
                        'active' => 1,
                        'currency' => 'ETB',
                    ],
                    [
                        'id' => 130,
                        'slug' => 'abay_bank',
                        'swift' => 'ABAYETAA',
                        'name' => 'Abay Bank',
                        'acct_length' => 16,
                        'country_id' => 1,
                        'is_mobilemoney' => null,
                        'is_active' => 1,
                        'is_rtgs' => 1,
                        'active' => 1,
                        'currency' => 'ETB',
                    ],
                ],
            ]),
        ]);
    }
}
