<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontPayoutIntent;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

abstract class StorefrontPayoutTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');

        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->nullable();
            $table->string('email')->nullable();
            $table->timestamps();
        });

        Schema::create('payout_requests', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('workspace_id')->default(1);
            $table->unsignedBigInteger('creator_id');
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency', 12)->default('ETB');
            $table->string('status', 32)->default('processing');
            $table->text('payout_destination')->nullable();
            $table->string('transfer_reference', 64)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });
        (new (require database_path('migrations/2026_11_14_220000_create_storefront_payout_intents_table.php')))->up();
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('storefront_payout_intents');
        Schema::dropIfExists('payout_requests');
        Schema::dropIfExists('users');
        parent::tearDown();
    }

    protected function payout(string $status = 'processing'): PayoutRequest
    {
        return PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => 30,
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'payout_destination' => '1000123456789',
            'status' => $status,
        ]);
    }

    protected function intent(PayoutRequest $payout): StorefrontPayoutIntent
    {
        return StorefrontPayoutIntent::query()->create([
            'payout_request_id' => $payout->id,
            'merchant_reference' => 'lk-po-TEST-REF-01',
            'idempotency_key' => 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'provider' => 'chapa',
            'withdrawal_code' => 'bank_transfer',
            'destination_snapshot' => '1000123456789',
            'status' => StorefrontPayoutIntent::STATUS_PROVIDER_PENDING,
        ]);
    }

    protected function verified(string $status = 'success', string $reference = 'lk-po-TEST-REF-01'): array
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
}
