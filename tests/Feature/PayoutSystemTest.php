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

        $response = $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/mark-paid", [
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
        ])->assertOk()->assertJsonPath('data.status', 'paid');

        $this->assertStringStartsWith('CHAPA-TX-', $response->json('data.transfer_reference'));
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
        ])->assertOk()->assertJsonPath('data.status', 'paid');

        $this->assertStringStartsWith('CHAPA-TX-', $response->json('data.transfer_reference'));
    }

    public function testChapaPayoutLogsNeverContainSensitiveGatewayData(): void
    {
        settings()->save(['kyc.enabled' => true]);
        [$creator, $workspaceId, $payout] = $this->seedPendingPayout(withAdmin: false);
        $destination = '+251911223344';
        $responseSecret = 'gateway-secret-account-value';
        $telebirrMethod = DigitalProductWithdrawalMethod::query()
            ->where('code', 'telebirr')
            ->firstOrFail();

        $payout->update([
            'withdrawal_method_id' => $telebirrMethod->id,
            'withdrawal_method_name' => $telebirrMethod->name,
            'payout_destination' => $destination,
        ]);
        $payout->payoutMethod()->update([
            'withdrawal_method_id' => $telebirrMethod->id,
            'type' => 'telebirr',
            'destination' => $destination,
        ]);
        config(['services.chapa.secret' => 'platform-secret']);
        Http::fake([
            'https://api.chapa.global/v2/payouts' => Http::response([
                'status' => 'success',
                'data' => [
                    'chapa_reference' => 'CP_T_safe',
                    'status' => 'PENDING',
                    'account_number' => $responseSecret,
                ],
            ]),
        ]);
        $logger = new class extends AbstractLogger {
            public array $records = [];

            public function log($level, string|\Stringable $message, array $context = []): void
            {
                $this->records[] = [
                    'level' => $level,
                    'message' => (string) $message,
                    'context' => $context,
                ];
            }
        };
        $originalLogger = Log::getFacadeRoot();
        Log::swap($logger);

        try {
            app(ChapaPayoutService::class)->createTransfer(
                $payout->fresh(['withdrawalMethod', 'payoutMethod', 'creator']),
            );
        } finally {
            Log::swap($originalLogger);
        }

        $initiated = collect($logger->records)->firstWhere(
            'message',
            'Initiating Chapa Telebirr transfer',
        );
        $this->assertNotNull($initiated);
        $this->assertSame([
            'payout_id',
            'reference',
            'amount',
            'currency',
            'bank_code',
        ], array_keys($initiated['context']));

        $logged = json_encode($logger->records);
        $this->assertStringNotContainsString($destination, $logged);
        $this->assertStringNotContainsString(
            preg_replace('/\D/', '', $destination),
            $logged,
        );
        $this->assertStringNotContainsString($responseSecret, $logged);
    }

    /**
     * Auto-transfer falls back to manual reference for unsupported methods (paypal, other).
     */
    public function testAutoTransferFallsBackToManualForPaypal(): void
    {
        settings()->save(['kyc.enabled' => true]);
        [$creator, $workspaceId, $payout, $admin] = $this->seedPendingPayout();

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
            'withdrawal_method_id' => $paypalMethod->id,
        ]);

        $this->stateful()->actingAs($admin);
        $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/processing", [
            'note' => 'Processing',
        ])->assertOk();

        $response = $this->postJson("/api/v1/admin/items/payout-requests/{$payout->id}/mark-paid", [
            'auto_transfer' => true,
        ])->assertOk()->assertJsonPath('data.status', 'paid');

        $this->assertStringStartsWith('MANUAL-', $response->json('data.transfer_reference'));
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
            'https://api.chapa.global/v2/payouts/banks' => Http::response([
                'status' => 'success',
                'data' => [
                    ['id' => 946, 'slug' => 'cbe_bank', 'swift' => 'CBETETAA', 'name' => 'Commercial Bank of Ethiopia', 'active' => 1, 'currency' => 'ETB'],
                    ['id' => 880, 'slug' => 'dashen_bank', 'swift' => 'DASHETAA', 'name' => 'Dashen Bank', 'active' => 1, 'currency' => 'ETB'],
                    ['id' => 130, 'slug' => 'abay_bank', 'swift' => 'ABAYETAA', 'name' => 'Abay Bank', 'active' => 1, 'currency' => 'ETB'],
                    ['id' => 0, 'slug' => 'telebirr', 'swift' => 'TELEBIRR', 'name' => 'Telebirr', 'active' => 1, 'currency' => 'ETB'],
                ],
            ]),
            'https://api.chapa.global/v2/payouts' => Http::response([
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
            'https://api.chapa.global/v2/payouts/test_ref_123/verify' => Http::response([
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

        $this->assertSame('SUCCESS', $result['status']);
        $this->assertSame('test_ref_123', $result['merchant_reference']);
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

        $response->assertStatus(500); // RuntimeException for invalid bank code
    }

    /**
     * Mock Chapa banks list for testing.
     */
    private function mockChapaBanks(): void
    {
        Cache::flush();
        config(['services.chapa.secret' => 'platform-secret']);
        Http::fake([
            'https://api.chapa.global/v2/payouts/banks' => Http::response([
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
