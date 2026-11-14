<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontPayoutIntent;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class StorefrontPayoutIntentModelTest extends TestCase
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

    public function testStatusConstantsAreDefined(): void
    {
        $this->assertSame('prepared', StorefrontPayoutIntent::STATUS_PREPARED);
        $this->assertSame('submitted', StorefrontPayoutIntent::STATUS_SUBMITTED);
        $this->assertSame('provider_pending', StorefrontPayoutIntent::STATUS_PROVIDER_PENDING);
        $this->assertSame('successful', StorefrontPayoutIntent::STATUS_SUCCESSFUL);
        $this->assertSame('failed', StorefrontPayoutIntent::STATUS_FAILED);
        $this->assertSame('requires_action', StorefrontPayoutIntent::STATUS_REQUIRES_ACTION);
    }

    public function testCastsAndAccessors(): void
    {
        $intent = StorefrontPayoutIntent::query()->create([
            'payout_request_id' => 10,
            'merchant_reference' => 'lk-po-1234567890123',
            'idempotency_key' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'provider' => 'chapa',
            'withdrawal_code' => 'bank_transfer',
            'destination_snapshot' => 'CBE:100012345678',
            'status' => StorefrontPayoutIntent::STATUS_PREPARED,
            'verification_data' => ['raw_status' => 'pending'],
        ]);

        $this->assertSame(50000, $intent->amount_cents);
        $this->assertSame('CBE:100012345678', $intent->destination_snapshot);
        $this->assertSame(['raw_status' => 'pending'], $intent->verification_data);
    }

    public function testStatusHelperMethods(): void
    {
        $intent = new StorefrontPayoutIntent(['status' => StorefrontPayoutIntent::STATUS_PREPARED]);
        $this->assertTrue($intent->isPrepared());
        $this->assertFalse($intent->isSuccessful());

        $intent->status = StorefrontPayoutIntent::STATUS_PROVIDER_PENDING;
        $this->assertTrue($intent->isPending());

        $intent->status = StorefrontPayoutIntent::STATUS_SUCCESSFUL;
        $this->assertTrue($intent->isSuccessful());

        $intent->status = StorefrontPayoutIntent::STATUS_FAILED;
        $this->assertTrue($intent->isFailed());
    }

    public function testPayoutRequestRelationship(): void
    {
        $payout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => 42,
            'amount_cents' => 25000,
            'status' => 'processing',
        ]);

        $intent = StorefrontPayoutIntent::query()->create([
            'payout_request_id' => $payout->id,
            'merchant_reference' => 'lk-po-REL-TEST-999',
            'idempotency_key' => 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
            'amount_cents' => 25000,
            'currency' => 'ETB',
            'provider' => 'chapa',
            'withdrawal_code' => 'telebirr',
            'destination_snapshot' => '0911223344',
            'status' => StorefrontPayoutIntent::STATUS_PREPARED,
        ]);

        $this->assertInstanceOf(PayoutRequest::class, $intent->payoutRequest);
        $this->assertSame($payout->id, $intent->payoutRequest->id);
    }
}
