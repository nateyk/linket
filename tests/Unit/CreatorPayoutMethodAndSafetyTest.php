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
            'destination_label' => 'Account number',
            'minimum_amount_cents' => 10000,
            'maximum_amount_cents' => 5000000,
            'is_active' => true,
            'position' => 1,
        ]);

        $this->telebirrMethod = DigitalProductWithdrawalMethod::query()->create([
            'id' => 2,
            'name' => 'Telebirr',
            'code' => 'telebirr',
            'destination_label' => 'Phone number',
            'minimum_amount_cents' => 5000,
            'maximum_amount_cents' => 1000000,
            'is_active' => true,
            'position' => 2,
        ]);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        Schema::dropIfExists('permissionables');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('user_sessions');
        Schema::dropIfExists('workspace_user');
        Schema::dropIfExists('workspaces');
        Schema::dropIfExists('users');
        Schema::dropIfExists('digital_product_payout_request_activities');
        Schema::dropIfExists('digital_product_earnings_ledger');
        Schema::dropIfExists('payout_requests');
        Schema::dropIfExists('digital_product_payout_methods');
        Schema::dropIfExists('digital_product_withdrawal_methods');
        parent::tearDown();
    }

    public function testCreatorCanSaveMultipleDestinationsAndFirstIsDefault(): void
    {
        $controller = new DigitalProductPayoutMethodController();

        $request1 = Request::create('/api/items/payout-methods', 'POST', [
            'withdrawal_method_id' => $this->bankMethod->id,
            'type' => 'bank_transfer',
            'bank_code' => 'cbe',
            'bank_name' => 'Commercial Bank of Ethiopia',
            'account_holder' => 'Abebe Bikila',
            'destination' => '1000123456789',
        ]);
        $request1->setUserResolver(fn () => $this->creator);

        $response1 = $controller->store($request1);
        $data1 = $response1->getData(true)['data'];

        $this->assertEquals(201, $response1->getStatusCode());
        $this->assertTrue($data1['is_default']);
        $this->assertEquals('cbe', $data1['bank_code']);
        $this->assertEquals('6789', $data1['account_number_last_four']);
        $this->assertEquals('•••• 6789', $data1['masked_account_number']);

        $request2 = Request::create('/api/items/payout-methods', 'POST', [
            'withdrawal_method_id' => $this->telebirrMethod->id,
            'type' => 'telebirr',
            'bank_code' => 'telebirr',
            'bank_name' => 'Telebirr',
            'account_holder' => 'Abebe Bikila',
            'destination' => '0911223344',
            'is_default' => false,
        ]);
        $request2->setUserResolver(fn () => $this->creator);

        $response2 = $controller->store($request2);
        $data2 = $response2->getData(true)['data'];

        $this->assertEquals(201, $response2->getStatusCode());
        $this->assertFalse($data2['is_default']);
        $this->assertEquals('3344', $data2['account_number_last_four']);

        $indexResponse = $controller->index($request1);
        $methods = $indexResponse->response()->getData(true)['data'];

        $this->assertCount(2, $methods);
        $this->assertEquals($data1['id'], $methods[0]['id']);
        $this->assertTrue($methods[0]['is_default']);
    }

    public function testSettingDefaultDestinationAtomicallyUnsetsOtherDestinations(): void
    {
        $controller = new DigitalProductPayoutMethodController();

        $method1 = DigitalProductPayoutMethod::query()->create([
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
        ]);

        $method2 = DigitalProductPayoutMethod::query()->create([
            'workspace_id' => 1,
            'creator_id' => $this->creator->id,
            'withdrawal_method_id' => $this->telebirrMethod->id,
            'type' => 'telebirr',
            'bank_code' => 'telebirr',
            'bank_name' => 'Telebirr',
            'account_holder' => 'Abebe Bikila',
            'destination' => '0911223344',
            'account_number_last_four' => '3344',
            'display_label' => 'Telebirr (•••• 3344)',
            'is_active' => true,
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

        $method1 = DigitalProductPayoutMethod::query()->create([
            'workspace_id' => 1,
            'creator_id' => $this->creator->id,
            'withdrawal_method_id' => $this->bankMethod->id,
            'type' => 'bank_transfer',
            'bank_code' => 'cbe',
            'account_holder' => 'Abebe Bikila',
            'destination' => '1000123456789',
            'display_label' => 'CBE (•••• 6789)',
            'is_active' => true,
            'is_default' => true,
        ]);

        $method2 = DigitalProductPayoutMethod::query()->create([
            'workspace_id' => 1,
            'creator_id' => $this->creator->id,
            'withdrawal_method_id' => $this->telebirrMethod->id,
            'type' => 'telebirr',
            'bank_code' => 'telebirr',
            'account_holder' => 'Abebe Bikila',
            'destination' => '0911223344',
            'display_label' => 'Telebirr (•••• 3344)',
            'is_active' => true,
            'is_default' => false,
        ]);

        $request = Request::create("/api/items/payout-methods/{$method1->id}", 'DELETE');
        $request->setUserResolver(fn () => $this->creator);

        $response = $controller->destroy($request, $method1);
        $this->assertEquals(204, $response->getStatusCode());

        $this->assertFalse((bool) $method1->fresh()->is_active);
        $this->assertFalse((bool) $method1->fresh()->is_default);
        $this->assertEquals(DigitalProductPayoutMethod::STATUS_DEACTIVATED, $method1->fresh()->status);
        $this->assertTrue((bool) $method2->fresh()->is_default);
    }

    public function testPayoutCreationSnapshotsSelectedDestinationAndReservesLedger(): void
    {
        $method = DigitalProductPayoutMethod::query()->create([
            'workspace_id' => 1,
            'creator_id' => $this->creator->id,
            'withdrawal_method_id' => $this->bankMethod->id,
            'type' => 'bank_transfer',
            'bank_code' => 'cbe',
            'bank_name' => 'Commercial Bank of Ethiopia',
            'account_holder' => 'Abebe Bikila',
            'destination' => '1000123456789',
            'account_number_last_four' => '6789',
            'display_label' => 'Commercial Bank of Ethiopia (•••• 6789)',
            'is_active' => true,
            'is_default' => true,
        ]);

        $financeMock = Mockery::mock(DigitalProductFinance::class);
        $financeMock->shouldReceive('summary')
            ->once()
            ->with($this->creator->id, 1, true)
            ->andReturn(['available_for_payout_cents' => 50000]);
        $financeMock->shouldReceive('record')
            ->once()
            ->with(1, $this->creator->id, Mockery::pattern('/^payout-reserve:/'), 'payout_reserved', -25000, 'ETB', Mockery::any());
        $this->app->instance(DigitalProductFinance::class, $financeMock);

        $ledgerMock = Mockery::mock(CreatorLedgerService::class);
        $ledgerMock->shouldReceive('reserveForPayout')
            ->once()
            ->with(Mockery::type(PayoutRequest::class), 50000);
        $this->app->instance(CreatorLedgerService::class, $ledgerMock);

        $service = new PayoutRequestService();
        $payout = $service->create($this->creator->id, 1, 25000, $method->id);

        $this->assertEquals('requested', $payout->status);
        $this->assertEquals(25000, $payout->amount_cents);
        $this->assertEquals($method->id, $payout->digital_product_payout_method_id);
        $this->assertEquals('Commercial Bank of Ethiopia (•••• 6789)', $payout->payout_method_label);
        $this->assertEquals('Bank transfer', $payout->withdrawal_method_name);
        $this->assertEquals('1000123456789', $payout->payout_destination);
    }

    public function testPayoutCreationFailsAndRollsBackWhenLedgerThrowsException(): void
    {
        $method = DigitalProductPayoutMethod::query()->create([
            'workspace_id' => 1,
            'creator_id' => $this->creator->id,
            'withdrawal_method_id' => $this->bankMethod->id,
            'type' => 'bank_transfer',
            'bank_code' => 'cbe',
            'account_holder' => 'Abebe Bikila',
            'destination' => '1000123456789',
            'display_label' => 'CBE (•••• 6789)',
            'is_active' => true,
            'is_default' => true,
        ]);

        $financeMock = Mockery::mock(DigitalProductFinance::class);
        $financeMock->shouldReceive('summary')
            ->once()
            ->andReturn(['available_for_payout_cents' => 50000]);
        $financeMock->shouldReceive('record')->once();
        $this->app->instance(DigitalProductFinance::class, $financeMock);

        $ledgerMock = Mockery::mock(CreatorLedgerService::class);
        $ledgerMock->shouldReceive('reserveForPayout')
            ->once()
            ->andThrow(new InsufficientBalanceException('Ledger balance insufficient.'));
        $this->app->instance(CreatorLedgerService::class, $ledgerMock);

        $service = new PayoutRequestService();

        $this->expectException(ValidationException::class);
        try {
            $service->create($this->creator->id, 1, 25000, $method->id);
        } finally {
            $this->assertEquals(0, PayoutRequest::query()->count());
        }
    }

    public function testMarkPaidRejectsAutoTransferBypassAndRequiresExplicitReference(): void
    {
        $payout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => $this->creator->id,
            'amount_cents' => 20000,
            'currency' => 'ETB',
            'status' => 'processing',
        ]);

        $service = new PayoutRequestService();

        try {
            $service->transition($payout, 'mark_paid', 1, ['auto_transfer' => true]);
            $this->fail('Expected ValidationException when auto_transfer is passed to mark_paid.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('transfer_reference', $e->errors());
        }

        try {
            $service->transition($payout, 'mark_paid', 1, ['transfer_reference' => '   ']);
            $this->fail('Expected ValidationException for blank transfer reference.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('transfer_reference', $e->errors());
        }

        $this->assertEquals('processing', $payout->fresh()->status);
    }

    public function testMarkPaidDisbursesLedgerWithoutSwallowingExceptions(): void
    {
        $payout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => $this->creator->id,
            'amount_cents' => 20000,
            'currency' => 'ETB',
            'status' => 'processing',
        ]);

        $ledgerMock = Mockery::mock(CreatorLedgerService::class);
        $ledgerMock->shouldReceive('disbursePayout')
            ->once()
            ->with(Mockery::type(PayoutRequest::class));
        $this->app->instance(CreatorLedgerService::class, $ledgerMock);

        $service = new PayoutRequestService();
        $updated = $service->transition($payout, 'mark_paid', 1, [
            'transfer_reference' => 'CBE-TX-998877',
            'note' => 'Paid via counter transfer',
        ]);

        $this->assertEquals('paid', $updated->status);
        $this->assertEquals('CBE-TX-998877', $updated->transfer_reference);
        $this->assertNotNull($updated->paid_at);
    }

    private function createDatabaseSchema(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->default('User');
            $table->string('email')->unique();
            $table->string('image')->nullable();
            $table->timestamps();
        });

        Schema::create('roles', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->default('Owner');
            $table->timestamps();
        });

        Schema::create('permissions', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->default('all');
            $table->timestamps();
        });

        Schema::create('permissionables', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('permission_id');
            $table->unsignedBigInteger('permissionable_id');
            $table->string('permissionable_type');
            $table->timestamps();
        });

        Schema::create('user_sessions', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->text('payload')->nullable();
            $table->integer('last_activity')->default(0);
            $table->timestamps();
        });

        Schema::create('workspaces', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->default('Default Workspace');
            $table->unsignedBigInteger('owner_id')->default(42);
            $table->boolean('is_personal')->default(true);
            $table->timestamps();
        });

        Schema::create('workspace_user', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('workspace_id');
            $table->unsignedBigInteger('user_id');
            $table->boolean('is_owner')->default(false);
            $table->unsignedBigInteger('role_id')->nullable();
            $table->timestamps();
        });

        Schema::create('digital_product_withdrawal_methods', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('destination_label')->default('Payout destination');
            $table->text('instructions')->nullable();
            $table->unsignedBigInteger('minimum_amount_cents')->default(0);
            $table->unsignedBigInteger('maximum_amount_cents')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('digital_product_payout_methods', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->default(1);
            $table->unsignedBigInteger('creator_id');
            $table->foreignId('withdrawal_method_id')->nullable();
            $table->string('type')->default('bank_transfer');
            $table->string('bank_code', 64)->nullable();
            $table->string('bank_name', 160)->nullable();
            $table->string('account_holder');
            $table->text('destination');
            $table->string('account_number_last_four', 8)->nullable();
            $table->string('display_label');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->string('status', 32)->default('active');
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('payout_requests', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('workspace_id')->default(1);
            $table->unsignedBigInteger('creator_id');
            $table->foreignId('digital_product_payout_method_id')->nullable();
            $table->foreignId('withdrawal_method_id')->nullable();
            $table->string('payout_method_label')->nullable();
            $table->string('withdrawal_method_name')->nullable();
            $table->text('payout_destination')->nullable();
            $table->string('currency', 12)->default('ETB');
            $table->unsignedBigInteger('amount_cents');
            $table->string('status', 32)->default('requested');
            $table->unsignedBigInteger('processed_by')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('processing_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('transfer_reference', 190)->nullable();
            $table->text('admin_notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('digital_product_payout_request_activities', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('payout_request_id');
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('action');
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('digital_product_earnings_ledger', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->nullable();
            $table->foreignId('workspace_id')->default(1);
            $table->unsignedBigInteger('creator_id');
            $table->foreignId('storefront_order_id')->nullable();
            $table->foreignId('payout_request_id')->nullable();
            $table->string('entry_type');
            $table->bigInteger('amount_cents');
            $table->string('currency', 12)->default('ETB');
            $table->timestamp('available_at')->nullable();
            $table->text('description')->nullable();
            $table->string('source_key')->nullable();
            $table->timestamps();
        });
    }
}
