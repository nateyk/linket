<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Storefront\ChapaPayoutService;
use App\Storefront\Controllers\ChapaV1TransferApprovalController;
use App\Storefront\Models\DigitalProductPayoutMethod;
use App\Storefront\Models\DigitalProductWithdrawalMethod;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontPayoutIntent;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ChapaV1TransferApprovalContractTest extends TestCase
{
    private const SECRET = 'fake-local-test-only-approval-secret';
    private const REFERENCE = 'lk-po-CONTRACT-01';

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('services.chapa.transfer_approval_secret', self::SECRET);
        config()->set('services.chapa.secret', 'CHASECK_TEST-fixture-approval');
        config()->set('services.chapa.test_payouts_enabled', true);
        config()->set('services.chapa.payouts_enabled', false);
        Http::fake();
        $this->createSchema();
        $this->seedApprovedTransfer();
    }

    private function createSchema(): void
    {
        Schema::create('digital_product_withdrawal_methods', function (Blueprint $table): void {
            $table->id();
            $table->string('code');
            $table->boolean('is_active');
            $table->timestamps();
        });
        Schema::create('digital_product_payout_methods', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('workspace_id')->default(1);
            $table->unsignedBigInteger('creator_id');
            $table->unsignedBigInteger('withdrawal_method_id');
            $table->string('type');
            $table->string('bank_code');
            $table->string('account_holder');
            $table->text('destination');
            $table->string('display_label');
            $table->boolean('is_active');
            $table->string('status');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
        Schema::create('payout_requests', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('workspace_id')->default(1);
            $table->unsignedBigInteger('creator_id');
            $table->unsignedBigInteger('digital_product_payout_method_id');
            $table->unsignedBigInteger('withdrawal_method_id');
            $table->string('status');
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency');
            $table->string('bank_code_snapshot');
            $table->string('account_holder_snapshot');
            $table->text('payout_destination');
            $table->timestamps();
        });
        (new (require database_path('migrations/2026_11_14_220000_create_storefront_payout_intents_table.php')))->up();
    }

    private function seedApprovedTransfer(): void
    {
        $withdrawalMethod = DigitalProductWithdrawalMethod::query()->create([
            'code' => 'telebirr',
            'is_active' => true,
        ]);
        $receivingAccount = DigitalProductPayoutMethod::query()->create([
            'workspace_id' => 1,
            'creator_id' => 30,
            'withdrawal_method_id' => $withdrawalMethod->id,
            'type' => 'telebirr',
            'bank_code' => 'telebirr',
            'account_holder' => 'Test Seller',
            'destination' => '0911223344',
            'display_label' => 'Telebirr •••• 3344',
            'is_active' => true,
            'status' => DigitalProductPayoutMethod::STATUS_ACTIVE,
            'approved_at' => now(),
        ]);
        $payout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => 30,
            'digital_product_payout_method_id' => $receivingAccount->id,
            'withdrawal_method_id' => $withdrawalMethod->id,
            'status' => 'processing',
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'bank_code_snapshot' => 'telebirr',
            'account_holder_snapshot' => 'Test Seller',
            'payout_destination' => '0911223344',
        ]);
        StorefrontPayoutIntent::query()->create([
            'payout_request_id' => $payout->id,
            'merchant_reference' => self::REFERENCE,
            'idempotency_key' => '4b77a6b4-0b7d-45a0-b759-0bdf9864b81e',
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'provider' => 'chapa',
            'withdrawal_code' => 'telebirr',
            'destination_snapshot' => '0911223344',
            'status' => StorefrontPayoutIntent::STATUS_SUBMITTED,
        ]);
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('storefront_payout_intents');
        Schema::dropIfExists('payout_requests');
        Schema::dropIfExists('digital_product_payout_methods');
        Schema::dropIfExists('digital_product_withdrawal_methods');
        parent::tearDown();
    }

    private function requestApproval(array $changes = [], ?string $signature = null): JsonResponse
    {
        $payload = array_merge([
            'reference' => self::REFERENCE,
            'amount' => '500.00',
            'bank' => 'telebirr',
            'account_name' => 'Test Seller',
            'account_number' => '251911223344',
        ], $changes);
        $rawBody = json_encode($payload, JSON_THROW_ON_ERROR);
        $request = Request::create(
            '/api/v1/chapa/transfer-approval',
            'POST',
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            $rawBody,
        );
        $request->headers->set(
            'Chapa-Signature',
            $signature ?? hash_hmac('sha256', self::SECRET, self::SECRET),
        );

        return app(ChapaV1TransferApprovalController::class)(
            $request, app(ChapaPayoutService::class),
        );
    }

    public function testValidCallbackIsIdempotentWithoutSendingAnotherTransfer(): void
    {
        $this->assertSame(200, $this->requestApproval()->status());
        $this->assertSame(200, $this->requestApproval()->status());
        $this->assertSame('processing', PayoutRequest::query()->firstOrFail()->status);
        $this->assertSame(StorefrontPayoutIntent::STATUS_SUBMITTED, StorefrontPayoutIntent::query()->firstOrFail()->status);
        $this->assertSame(1, StorefrontPayoutIntent::query()->count());
        Http::assertNothingSent();
    }

    public function testChangedBankRecipientAmountAndReferenceAreRejected(): void
    {
        Log::spy();
        $intentId = StorefrontPayoutIntent::query()->sole()->id;
        foreach ([
            [['amount' => '500.01'], ['reason' => 'amount_mismatch', 'intent_id' => $intentId]],
            [['bank' => 'mpesa'], ['reason' => 'bank_mismatch', 'intent_id' => $intentId]],
            [['account_name' => 'Different Seller'], ['reason' => 'account_name_mismatch', 'intent_id' => $intentId]],
            [['account_number' => '251911223345'], ['reason' => 'account_number_mismatch', 'intent_id' => $intentId]],
            [['reference' => 'unknown-reference'], ['reason' => 'intent_not_found']],
            [['amount' => 'not-a-number'], ['reason' => 'invalid_payload', 'fields' => ['amount']]],
        ] as [$change, $expectedContext]) {
            $response = $this->requestApproval($change);
            $this->assertSame(400, $response->status());
            $this->assertSame(['message' => 'Transfer not approved'], $response->getData(true));
            Log::shouldHaveReceived('warning')->with('chapa.transfer_approval_rejected', $expectedContext)->once();
        }
        Http::assertNothingSent();
    }

    public function testApprovalRejectsNonCentDecimalAndExponentAmounts(): void
    {
        foreach ([
            '500.001',
            '500.009',
            '499.999',
            '5e2',
            '+500.00',
            '-500.00',
        ] as $amount) {
            $this->assertSame(400, $this->requestApproval(['amount' => $amount])->status());
        }

        $this->assertSame('processing', PayoutRequest::query()->firstOrFail()->status);
        Http::assertNothingSent();
    }

    public function testTelebirrApprovalAllowsMissingNameOnlyForTheApprovedNumber(): void
    {
        $this->assertSame(200, $this->requestApproval(['account_name' => null])->status());
        $this->assertSame(200, $this->requestApproval(['account_name' => ''])->status());
        $this->assertSame(400, $this->requestApproval([
            'account_name' => null,
            'account_number' => '251911223345',
        ])->status());
        $this->assertSame(400, $this->requestApproval(['account_name' => 'Different Seller'])->status());
    }

    public function testTelebirrApprovalAcceptsNameFormattingButNotDifferentRecipient(): void
    {
        $this->assertSame(200, $this->requestApproval([
            'account_name' => "  TEST   seller  ",
            'account_number' => '0911223344',
        ])->status());
        $this->assertSame(400, $this->requestApproval([
            'account_name' => 'TEST SELLER',
            'account_number' => '251911223345',
        ])->status());
        $this->assertSame(400, $this->requestApproval([
            'account_name' => 'Another Seller',
        ])->status());
        $this->assertSame(400, $this->requestApproval([
            'account_name' => 'TEST SELLER',
            'amount' => '500.01',
        ])->status());
        $this->assertSame('processing', PayoutRequest::query()->sole()->status);
        $this->assertSame(StorefrontPayoutIntent::STATUS_SUBMITTED, StorefrontPayoutIntent::query()->sole()->status);
        Http::assertNothingSent();
    }

    public function testWrongSignatureAndMissingApprovalSecretFailClosed(): void
    {
        Log::spy();
        $this->assertSame(400, $this->requestApproval([], str_repeat('0', 64))->status());
        $this->assertSame(400, $this->requestApproval([], str_repeat('0', 63))->status());
        Log::shouldHaveReceived('warning')->with('chapa.transfer_approval_rejected', ['reason' => 'signature_invalid'])->twice();
        config()->set('services.chapa.transfer_approval_secret', '');
        $this->assertSame(400, $this->requestApproval()->status());
        Log::shouldHaveReceived('warning')->with('chapa.transfer_approval_rejected', ['reason' => 'approval_secret_missing'])->once();
        Http::assertNothingSent();
    }

    public function testDisabledTestPayoutSwitchRejectsApprovalEvenWhenLiveFlagIsSet(): void
    {
        Log::spy();
        config()->set('services.chapa.test_payouts_enabled', false);
        config()->set('services.chapa.payouts_enabled', true);
        $this->assertSame(400, $this->requestApproval()->status());
        Log::shouldHaveReceived('warning')->with('chapa.transfer_approval_rejected', ['reason' => 'payouts_disabled'])->once();
    }

    public function testUnapprovedAccountAndPreparedIntentFailClosed(): void
    {
        Log::spy();
        $intentId = StorefrontPayoutIntent::query()->sole()->id;
        DigitalProductPayoutMethod::query()->update([
            'status' => DigitalProductPayoutMethod::STATUS_PENDING,
            'approved_at' => null,
        ]);
        $this->assertSame(400, $this->requestApproval()->status());
        Log::shouldHaveReceived('warning')->with('chapa.transfer_approval_rejected', [
            'reason' => 'payout_account_unavailable', 'intent_id' => $intentId,
        ])->once();

        DigitalProductPayoutMethod::query()->update([
            'status' => DigitalProductPayoutMethod::STATUS_ACTIVE,
            'approved_at' => now(),
        ]);
        StorefrontPayoutIntent::query()->update(['status' => StorefrontPayoutIntent::STATUS_PREPARED]);
        $this->assertSame(400, $this->requestApproval()->status());
        Log::shouldHaveReceived('warning')->with('chapa.transfer_approval_rejected', [
            'reason' => 'intent_not_submitted', 'intent_id' => $intentId,
        ])->once();
    }

    public function testUnsignedPublicRouteReturnsHttp400NotAuthRedirect(): void
    {
        Log::spy();
        $this->postJson('/api/v1/chapa/transfer-approval', [
            'reference' => self::REFERENCE,
            'amount' => '500.00',
            'bank' => 'telebirr',
            'account_name' => 'Test Seller',
            'account_number' => '251911223344',
        ])->assertStatus(400)->assertExactJson(['message' => 'Transfer not approved']);
        Log::shouldHaveReceived('warning')->with('chapa.transfer_approval_rejected', ['reason' => 'signature_missing'])->once();
    }

    public function testLiveApprovalRouteChecksTheApprovedAmountBeforeSettlement(): void
    {
        config()->set('services.chapa.secret', 'CHASECK-synthetic-route-fixture');
        config()->set('services.chapa.payouts_enabled', true);
        $payout = PayoutRequest::query()->sole();
        $intent = StorefrontPayoutIntent::query()->sole();
        $payout->update(['amount_cents' => 500]);
        $intent->update(['amount_cents' => 500]);

        $path = '/api/v1/chapa/transfer-approval';
        $payload = [
            'reference' => self::REFERENCE,
            'bank' => 'telebirr',
            'account_name' => 'Test Seller',
            'account_number' => '251911223344',
            'amount' => '5.00',
        ];
        $approvedBody = json_encode($payload, JSON_THROW_ON_ERROR);
        $this->call(
            'POST',
            $path,
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_Chapa-Signature' => hash_hmac('sha256', self::SECRET, self::SECRET),
            ],
            $approvedBody,
        )->assertOk()->assertJsonPath('message', 'Transfer approved');

        $rejectedPayload = [...$payload, 'amount' => 4.90, 'charge' => 0.10];
        $rejectedBody = json_encode($rejectedPayload, JSON_THROW_ON_ERROR);
        $this->call(
            'POST',
            $path,
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_Chapa-Signature' => hash_hmac('sha256', self::SECRET, self::SECRET),
            ],
            $rejectedBody,
        )->assertStatus(400)->assertJsonPath('message', 'Transfer not approved');

        $this->assertSame('processing', $payout->fresh()->status);
        $this->assertSame(StorefrontPayoutIntent::STATUS_SUBMITTED, $intent->fresh()->status);
        Http::assertNothingSent();
    }
}
