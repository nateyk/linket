<?php

namespace Tests\Feature;

use App\Kyc\Models\KycVerification;
use App\Models\User;
use App\Storefront\Models\DigitalProductPayoutMethod;
use App\Storefront\Models\DigitalProductWithdrawalMethod;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\DigitalProductFinance;
use App\Storefront\PayoutRequestService;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
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
        config()->set('storefront.payout_hold_days', 0);
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
    public function testAdminCanProcessAndPayOutRequest(): void
    {
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();

        $updated = app(PayoutRequestService::class)->transition($payout, 'start_processing', $admin->id, ['note' => 'Looks good']);
        $this->assertSame('processing', $updated->status);
        $this->assertNotNull($updated->processing_at);
        $this->assertStringContainsString('Looks good', $updated->activities->last()->note);

        $paid = app(PayoutRequestService::class)->transition($updated, 'mark_paid', $admin->id, ['transfer_reference' => 'CHAPA-1234']);
        $this->assertSame('paid', $paid->status);
        $this->assertNotNull($paid->paid_at);
        $this->assertSame('CHAPA-1234', $paid->transfer_reference);
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
        $paid = app(PayoutRequestService::class)->transition($processing, 'mark_paid', $admin->id, ['transfer_reference' => 'ref']);

        $this->expectException(ValidationException::class);
        app(PayoutRequestService::class)->transition($paid, 'reject', $admin->id, ['reason' => 'no']);
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
        $response = $this->getJson('/api/v1/digital-products/payout-requests');
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
        $response = $this->getJson('/api/v1/admin/digital-products/payout-requests');
        $response->assertOk()->assertJsonPath('data.0.id', $payout->id);
    }

    public function testAdminMarkPaidRoute(): void
    {
        settings()->save(['kyc.enabled' => true]);
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();

        $this->stateful()->actingAs($admin);
        // Processing must happen before marking paid (state machine order).
        $this->postJson("/api/v1/admin/digital-products/payout-requests/{$payout->id}/processing", [
            'note' => 'Processing',
        ])->assertOk();

        $response = $this->postJson("/api/v1/admin/digital-products/payout-requests/{$payout->id}/mark-paid", [
            'transfer_reference' => 'CHAPA-REF-999',
        ])->assertOk()->assertJsonPath('data.status', 'paid');
        $this->assertSame('CHAPA-REF-999', $response->json('data.transfer_reference'));
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
        $this->getJson('/api/v1/admin/digital-products/payout-requests')->assertForbidden();
        $this->postJson("/api/v1/admin/digital-products/payout-requests/{$payout->id}/mark-paid", [
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
        $this->postJson("/api/v1/admin/digital-products/payout-requests/{$payout->id}/mark-paid", [
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
        $this->postJson("/api/v1/admin/digital-products/payout-requests/{$payout->id}/mark-paid", [])
            ->assertJsonValidationErrorFor('transfer_reference');
    }

    public function testStoreRouteGatesOnKyc(): void
    {
        settings()->save(['kyc.enabled' => true]);
        $creator = $this->createCreator();
        $workspaceId = $creator->workspaces()->first()->id;
        $this->creditSale($creator, 5000);
        $this->createPayoutMethod($creator, $workspaceId);

        $this->stateful()->actingAs($creator);
        $this->postJson('/api/v1/digital-products/payout-requests', ['amount_cents' => 1000])
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
        $this->postJson('/api/v1/digital-products/payout-requests', ['amount_cents' => 1000])
            ->assertCreated()
            ->assertJsonPath('data.status', 'requested');
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
        // A verified sale ledger entry, immediately available for payout.
        app(DigitalProductFinance::class)->record(
            $creator->workspaces()->first()->id,
            $creator->id,
            'sale:' . $creator->id . ':' . $cents,
            'sale',
            $cents,
            config('storefront.currency'),
            ['available_at' => now(), 'description' => 'Verified sale'],
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
            'account_holder' => 'Test Creator',
            'destination' => '1234567890',
            'display_label' => 'Bank transfer ending in 7890',
        ]);
    }

    private function stateful(): static
    {
        return $this->withHeader('Referer', 'http://localhost');
    }
}
