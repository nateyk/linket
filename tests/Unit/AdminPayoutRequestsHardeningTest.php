<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
use App\Storefront\Controllers\AdminPayoutRequestsController;
use App\Storefront\Models\PayoutRequest;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class AdminPayoutRequestsHardeningTest extends TestCase
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
            $table->string('transfer_reference', 64)->nullable();
            $table->timestamps();
        });

        Gate::define('admin.access', fn () => true);
        $this->actingAs(new User(['id' => 1]));
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('payout_requests');
        parent::tearDown();
    }

    public function testDestroyIsForbiddenToPreserveAuditTrail(): void
    {
        $payout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => 10,
            'amount_cents' => 10000,
            'status' => 'requested',
        ]);

        $controller = new AdminPayoutRequestsController();

        $this->expectException(HttpException::class);
        $controller->destroy($payout);
    }

    public function testMarkPaidRequiresTransferReference(): void
    {
        $payout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => 10,
            'amount_cents' => 10000,
            'status' => 'processing',
        ]);

        $admin = new User(['id' => 1]);
        $request = Request::create('/admin/storefront/payouts/'.$payout->id, 'PUT', [
            'status' => 'paid',
            // Missing transfer_reference
        ]);
        $request->setUserResolver(fn () => $admin);

        $controller = new AdminPayoutRequestsController();

        $response = $controller->update($request, $payout);
        $this->assertSame(422, $response->getStatusCode());
    }
}
