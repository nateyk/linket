<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
use App\Storefront\Controllers\DigitalProductWithdrawalMethodsController;
use App\Storefront\Models\DigitalProductWithdrawalMethod;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class WithdrawalMethodConfigurationIntegrityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');

        Schema::create('digital_product_withdrawal_methods', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('destination_label');
            $table->text('instructions')->nullable();
            $table->unsignedBigInteger('minimum_amount_cents')->default(0);
            $table->unsignedBigInteger('maximum_amount_cents')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });
        Schema::create('payout_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('withdrawal_method_id')->nullable()
                ->constrained('digital_product_withdrawal_methods')->nullOnDelete();
        });

        Gate::define('admin.access', fn () => true);
        $this->actingAs(new User(['id' => 1]));
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('payout_requests');
        Schema::dropIfExists('digital_product_withdrawal_methods');
        parent::tearDown();
    }

    private function method(int $minimum = 0, ?int $maximum = null): DigitalProductWithdrawalMethod
    {
        return DigitalProductWithdrawalMethod::query()->create([
            'name' => 'Telebirr',
            'code' => 'telebirr',
            'destination_label' => 'Phone number',
            'minimum_amount_cents' => $minimum,
            'maximum_amount_cents' => $maximum,
            'is_active' => true,
        ]);
    }

    public function testRemovingAProviderPreservesFinancialHistoryAndDisablesIt(): void
    {
        $method = $this->method();
        $payoutId = DB::table('payout_requests')->insertGetId([
            'withdrawal_method_id' => $method->id,
        ]);

        $response = (new DigitalProductWithdrawalMethodsController())->destroy($method);

        $this->assertSame(200, $response->status());
        $this->assertFalse($method->fresh()->is_active);
        $this->assertSame($method->id, DB::table('payout_requests')->where('id', $payoutId)->value('withdrawal_method_id'));
    }

    public function testUpdateRejectsMaximumBelowNewMinimum(): void
    {
        $method = $this->method();
        $request = Request::create('/admin/withdrawal-methods/'.$method->id, 'PATCH', [
            'minimum_amount_cents' => 2000,
            'maximum_amount_cents' => 1999,
        ]);

        try {
            (new DigitalProductWithdrawalMethodsController())->update($request, $method);
            $this->fail('Maximum below minimum must be rejected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('maximum_amount_cents', $exception->errors());
        }
        $this->assertSame(0, $method->fresh()->minimum_amount_cents);
    }

    public function testPartialUpdateCannotReduceMaximumBelowExistingMinimum(): void
    {
        $method = $this->method(2500, 6000);
        $request = Request::create('/admin/withdrawal-methods/'.$method->id, 'PATCH', [
            'maximum_amount_cents' => 1500,
        ]);

        $this->expectException(ValidationException::class);
        (new DigitalProductWithdrawalMethodsController())->update($request, $method);
    }

    public function testCreateRejectsMaximumBelowEffectiveOneEtbFloor(): void
    {
        $request = Request::create('/admin/withdrawal-methods', 'POST', [
            'name' => 'Test provider',
            'destination_label' => 'Account',
            'minimum_amount_cents' => 0,
            'maximum_amount_cents' => 50,
        ]);

        try {
            (new DigitalProductWithdrawalMethodsController())->store($request);
            $this->fail('Provider with an unusable maximum must be rejected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('maximum_amount_cents', $exception->errors());
        }
        $this->assertSame(0, DigitalProductWithdrawalMethod::query()->count());
    }

    public function testNullMaximumAllowsUnlimitedProviderMethod(): void
    {
        $method = $this->method(2500, 6000);
        $request = Request::create('/admin/withdrawal-methods/'.$method->id, 'PATCH', [
            'maximum_amount_cents' => null,
        ]);

        (new DigitalProductWithdrawalMethodsController())->update($request, $method);

        $this->assertNull($method->fresh()->maximum_amount_cents);
        $this->assertSame(2500, $method->fresh()->minimum_amount_cents);
    }
}
