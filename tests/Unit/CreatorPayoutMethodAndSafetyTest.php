<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
use App\Storefront\Controllers\DigitalProductPayoutMethodController;
use App\Storefront\DigitalProductFinance;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Ledger\Exceptions\InsufficientBalanceException;
use App\Storefront\Models\DigitalProductPayoutMethod;
use App\Storefront\Models\DigitalProductWithdrawalMethod;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\PayoutRequestService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Mockery;
use Tests\TestCase;

class CreatorPayoutMethodAndSafetyTest extends TestCase
{
    private User $creator;
    private DigitalProductWithdrawalMethod $bankMethod;
    private DigitalProductWithdrawalMethod $telebirrMethod;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('storefront.currency', 'ETB');
        config()->set('scout.driver', 'null');

        $this->createDatabaseSchema();

        $this->creator = User::withoutEvents(fn () => User::query()->create([
            'id' => 42,
            'name' => 'Abebe Creator',
            'email' => 'abebe@example.com',
        ]));
        $this->actingAs($this->creator);

        $this->bankMethod = DigitalProductWithdrawalMethod::query()->create([
            'id' => 1,
            'name' => 'Bank transfer',
            'code' => 'bank_transfer',
            'minimum_amount_cents' => 10000,
            'maximum_amount_cents' => 5000000,
            'is_active' => true,
        ]);

        $this->telebirrMethod = DigitalProductWithdrawalMethod::query()->create([
            'id' => 2,
            'name' => 'Telebirr',
            'code' => 'telebirr',
            'minimum_amount_cents' => 5000,
            'maximum_amount_cents' => 1000000,
            'is_active' => true,
        ]);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        $this->dropDatabaseSchema();
        parent::tearDown();
    }

    public function testCreatorCanSaveMultipleDestinationsAndFirstIsDefault(): void
    {
        $controller = new DigitalProductPayoutMethodController();

        $resp1 = $controller->store($this->makePayoutRequest([
            'withdrawal_method_id' => $this->bankMethod->id,
            'bank_code' => 'cbe',
            'bank_name' => 'Commercial Bank of Ethiopia',
            'destination' => '1000123456789',
        ]));
        $data1 = $resp1->getData(true)['data'];

        $this->assertEquals(201, $resp1->getStatusCode());
        $this->assertTrue($data1['is_default']);
        $this->assertEquals('•••• 6789', $data1['masked_account_number']);

        $resp2 = $controller->store($this->makePayoutRequest([
            'withdrawal_method_id' => $this->telebirrMethod->id,
            'bank_code' => 'telebirr',
            'destination' => '0911223344',
            'is_default' => false,
        ]));
        $data2 = $resp2->getData(true)['data'];

        $this->assertEquals(201, $resp2->getStatusCode());
        $this->assertFalse($data2['is_default']);

        $index = $controller->index($this->makePayoutRequest([]))->response()->getData(true)['data'];
        $this->assertCount(2, $index);
        $this->assertTrue($index[0]['is_default']);
    }

    public function testSettingDefaultDestinationAtomicallyUnsetsOtherDestinations(): void
    {
        $controller = new DigitalProductPayoutMethodController();
        $method1 = $this->createTestPayoutMethod(['is_default' => true]);
        $method2 = $this->createTestPayoutMethod([
            'withdrawal_method_id' => $this->telebirrMethod->id,
            'bank_code' => 'telebirr',
            'destination' => '0911223344',
            'is_default' => false,
        ]);

        $request = Request::create("/api/items/payout-methods/{$method2->id}/default", 'POST');
        $request->setUserResolver(fn () => $this->creator);

        $response = $controller->setDefault($request, $method2);
        $data = $response->response()->getData(true)['data'];

        $this->assertTrue($data['is_default']);
        $this->assertFalse((bool) $method1->fresh()->is_default);
        $this->assertTrue((bool) $method2->fresh()->is_default);
    }

    public function testDeactivatingDefaultDestinationFallsBackToAnotherActiveDestination(): void
    {
        $controller = new DigitalProductPayoutMethodController();
        $method1 = $this->createTestPayoutMethod(['is_default' => true]);
        $method2 = $this->createTestPayoutMethod([
            'withdrawal_method_id' => $this->telebirrMethod->id,
            'bank_code' => 'telebirr',
            'destination' => '0911223344',
            'is_default' => false,
        ]);

        $request = Request::create("/api/items/payout-methods/{$method1->id}", 'DELETE');
        $request->setUserResolver(fn () => $this->creator);

        $response = $controller->destroy($request, $method1);
        $this->assertEquals(204, $response->getStatusCode());

        $this->assertFalse((bool) $method1->fresh()->is_active);
        $this->assertEquals(DigitalProductPayoutMethod::STATUS_DEACTIVATED, $method1->fresh()->status);
        $this->assertTrue((bool) $method2->fresh()->is_default);
    }

    public function testPayoutCreationSnapshotsSelectedDestinationAndReservesLedger(): void
    {
        $method = $this->createTestPayoutMethod([
            'display_label' => 'Commercial Bank of Ethiopia (•••• 6789)',
            'destination' => '1000123456789',
        ]);

        $this->mockFinance(50000, 25000);
        $ledgerMock = Mockery::mock(CreatorLedgerService::class);
        $ledgerMock->shouldReceive('reserveForPayout')->once()->with(Mockery::type(PayoutRequest::class), 50000);
        $this->app->instance(CreatorLedgerService::class, $ledgerMock);

        $payout = (new PayoutRequestService())->create($this->creator->id, 1, 25000, $method->id);

        $this->assertEquals('requested', $payout->status);
        $this->assertEquals(25000, $payout->amount_cents);
        $this->assertEquals($method->id, $payout->digital_product_payout_method_id);
        $this->assertEquals('Commercial Bank of Ethiopia (•••• 6789)', $payout->payout_method_label);
        $this->assertEquals('1000123456789', $payout->payout_destination);
    }

    public function testPayoutCreationFailsAndRollsBackWhenLedgerThrowsException(): void
    {
        $method = $this->createTestPayoutMethod();

        $financeMock = Mockery::mock(DigitalProductFinance::class);
        $financeMock->shouldReceive('summary')->once()->andReturn(['available_for_payout_cents' => 50000]);
        $financeMock->shouldReceive('record')->once();
        $this->app->instance(DigitalProductFinance::class, $financeMock);

        $ledgerMock = Mockery::mock(CreatorLedgerService::class);
        $ledgerMock->shouldReceive('reserveForPayout')->once()->andThrow(new InsufficientBalanceException('Ledger balance insufficient.'));
        $this->app->instance(CreatorLedgerService::class, $ledgerMock);

        $this->expectException(ValidationException::class);
        try {
            (new PayoutRequestService())->create($this->creator->id, 1, 25000, $method->id);
        } finally {
            $this->assertEquals(0, PayoutRequest::query()->count());
        }
    }

    public function testMarkPaidRejectsAutoTransferBypassAndRequiresExplicitReference(): void
    {
        $payout = $this->createTestPayoutRequest('processing');
        $service = new PayoutRequestService();

        try {
            $service->transition($payout, 'mark_paid', 1, ['auto_transfer' => true]);
            $this->fail('Expected ValidationException when auto_transfer is passed.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('transfer_reference', $e->errors());
        }

        try {
            $service->transition($payout, 'mark_paid', 1, ['transfer_reference' => '   ']);
            $this->fail('Expected ValidationException for blank reference.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('transfer_reference', $e->errors());
        }

        $this->assertEquals('processing', $payout->fresh()->status);
    }

    public function testMarkPaidDisbursesLedgerWithoutSwallowingExceptions(): void
    {
        $payout = $this->createTestPayoutRequest('processing');

        $ledgerMock = Mockery::mock(CreatorLedgerService::class);
        $ledgerMock->shouldReceive('disbursePayout')->once()->with(Mockery::type(PayoutRequest::class));
        $this->app->instance(CreatorLedgerService::class, $ledgerMock);

        $updated = (new PayoutRequestService())->transition($payout, 'mark_paid', 1, [
            'transfer_reference' => 'CBE-TX-998877',
            'note' => 'Paid via counter transfer',
        ]);

        $this->assertEquals('paid', $updated->status);
        $this->assertEquals('CBE-TX-998877', $updated->transfer_reference);
        $this->assertNotNull($updated->paid_at);
    }

    private function createTestPayoutMethod(array $overrides = []): DigitalProductPayoutMethod
    {
        return DigitalProductPayoutMethod::query()->create(array_merge([
            'workspace_id' => 1,
            'creator_id' => $this->creator->id,
            'withdrawal_method_id' => $this->bankMethod->id,
            'type' => 'bank_transfer',
            'bank_code' => 'cbe',
            'bank_name' => 'Commercial Bank of Ethiopia',
            'account_holder' => 'Abebe Bikila',
            'destination' => '1000123456789',
            'account_number_last_four' => '6789',
            'display_label' => 'CBE (•••• 6789)',
            'is_active' => true,
            'is_default' => true,
        ], $overrides));
    }

    private function createTestPayoutRequest(string $status): PayoutRequest
    {
        return PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => $this->creator->id,
            'amount_cents' => 20000,
            'currency' => 'ETB',
            'status' => $status,
        ]);
    }

    private function makePayoutRequest(array $data): Request
    {
        $req = Request::create('/api/items/payout-methods', 'POST', array_merge([
            'account_holder' => 'Abebe Bikila',
            'destination' => '1000123456789',
        ], $data));
        $req->setUserResolver(fn () => $this->creator);

        return $req;
    }

    private function mockFinance(int $available, int $reserved): void
    {
        $finance = Mockery::mock(DigitalProductFinance::class);
        $finance->shouldReceive('summary')->once()->with($this->creator->id, 1, true)->andReturn(['available_for_payout_cents' => $available]);
        $finance->shouldReceive('record')->once()->with(1, $this->creator->id, Mockery::pattern('/^payout-reserve:/'), 'payout_reserved', -$reserved, 'ETB', Mockery::any());
        $this->app->instance(DigitalProductFinance::class, $finance);
    }

    private function createDatabaseSchema(): void
    {
        $this->createAuthSchema();
        $this->createPayoutSchema();
    }

    private function createAuthSchema(): void
    {
        Schema::create('users', function (Blueprint $t): void {
            $t->id();
            $t->string('name')->default('User');
            $t->string('email')->unique();
            $t->string('image')->nullable();
            $t->timestamps();
        });
        Schema::create('roles', fn (Blueprint $t) => $t->id() && $t->string('name')->default('Owner') && $t->timestamps());
        Schema::create('permissions', fn (Blueprint $t) => $t->id() && $t->string('name')->default('all') && $t->timestamps());
        Schema::create('permissionables', function (Blueprint $t): void {
            $t->id();
            $t->unsignedBigInteger('permission_id');
            $t->unsignedBigInteger('permissionable_id');
            $t->string('permissionable_type');
            $t->timestamps();
        });
        Schema::create('user_sessions', function (Blueprint $t): void {
            $t->id();
            $t->unsignedBigInteger('user_id');
            $t->string('ip_address', 45)->nullable();
            $t->text('user_agent')->nullable();
            $t->text('payload')->nullable();
            $t->integer('last_activity')->default(0);
            $t->timestamps();
        });
        Schema::create('workspaces', function (Blueprint $t): void {
            $t->id();
            $t->string('name')->default('Default');
            $t->unsignedBigInteger('owner_id')->default(42);
            $t->boolean('is_personal')->default(true);
            $t->timestamps();
        });
        Schema::create('workspace_user', function (Blueprint $t): void {
            $t->id();
            $t->unsignedBigInteger('workspace_id');
            $t->unsignedBigInteger('user_id');
            $t->boolean('is_owner')->default(false);
            $t->unsignedBigInteger('role_id')->nullable();
            $t->timestamps();
        });
    }

    private function createPayoutSchema(): void
    {
        Schema::create('digital_product_withdrawal_methods', function (Blueprint $t): void {
            $t->id();
            $t->string('name');
            $t->string('code')->unique();
            $t->string('destination_label')->default('Destination');
            $t->text('instructions')->nullable();
            $t->unsignedBigInteger('minimum_amount_cents')->default(0);
            $t->unsignedBigInteger('maximum_amount_cents')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });
        Schema::create('digital_product_payout_methods', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('workspace_id')->default(1);
            $t->unsignedBigInteger('creator_id');
            $t->foreignId('withdrawal_method_id')->nullable();
            $t->string('type')->default('bank_transfer');
            $t->string('bank_code', 64)->nullable();
            $t->string('bank_name', 160)->nullable();
            $t->string('account_holder');
            $t->text('destination');
            $t->string('account_number_last_four', 8)->nullable();
            $t->string('display_label');
            $t->boolean('is_active')->default(true);
            $t->boolean('is_default')->default(false);
            $t->string('status', 32)->default('active');
            $t->json('metadata')->nullable();
            $t->timestamps();
        });
        Schema::create('payout_requests', function (Blueprint $t): void {
            $t->id();
            $t->unsignedBigInteger('workspace_id')->default(1);
            $t->unsignedBigInteger('creator_id');
            $t->foreignId('digital_product_payout_method_id')->nullable();
            $t->foreignId('withdrawal_method_id')->nullable();
            $t->string('payout_method_label')->nullable();
            $t->string('withdrawal_method_name')->nullable();
            $t->text('payout_destination')->nullable();
            $t->string('currency', 12)->default('ETB');
            $t->unsignedBigInteger('amount_cents');
            $t->string('status', 32)->default('requested');
            $t->unsignedBigInteger('processed_by')->nullable();
            $t->timestamp('paid_at')->nullable();
            $t->timestamp('processing_at')->nullable();
            $t->timestamp('rejected_at')->nullable();
            $t->timestamp('cancelled_at')->nullable();
            $t->string('transfer_reference', 190)->nullable();
            $t->text('admin_notes')->nullable();
            $t->text('rejection_reason')->nullable();
            $t->timestamps();
        });
        Schema::create('digital_product_payout_request_activities', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('payout_request_id');
            $t->unsignedBigInteger('actor_id')->nullable();
            $t->string('action');
            $t->text('note')->nullable();
            $t->timestamps();
        });
        Schema::create('digital_product_earnings_ledger', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('workspace_id')->default(1);
            $t->unsignedBigInteger('creator_id');
            $t->string('entry_type');
            $t->bigInteger('amount_cents');
            $t->string('currency', 12)->default('ETB');
            $t->timestamps();
        });
    }

    private function dropDatabaseSchema(): void
    {
        $tables = [
            'permissionables', 'permissions', 'roles', 'user_sessions',
            'workspace_user', 'workspaces', 'users',
            'digital_product_payout_request_activities',
            'digital_product_earnings_ledger', 'payout_requests',
            'digital_product_payout_methods', 'digital_product_withdrawal_methods',
        ];
        foreach ($tables as $table) {
            Schema::dropIfExists($table);
        }
    }
}
