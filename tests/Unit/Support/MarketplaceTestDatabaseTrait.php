<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Models\User;
use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Nateyk\Chapa\ChapaClient;
use Nateyk\Chapa\Http\RawResponse;
use Nateyk\Chapa\Http\Transport;

trait MarketplaceTestDatabaseTrait
{
    protected function createCoreTables(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->default('Creator');
            $table->string('email')->unique();
            $table->timestamps();
        });

        Schema::create('user_sessions', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->timestamps();
        });

        Schema::create('digital_products', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('workspace_id')->default(1);
            $table->unsignedBigInteger('user_id')->default(1);
            $table->string('name')->default('Digital Asset');
            $table->string('type', 32)->default('digital');
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('file_entries', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->default('File');
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('digital_product_files', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('digital_product_id');
            $table->unsignedBigInteger('file_entry_id');
            $table->timestamps();
        });

        DB::table('digital_products')->insert([
            'id' => 1,
            'workspace_id' => 1,
            'user_id' => 1,
            'name' => 'Digital Asset',
            'type' => 'digital',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function createStorefrontTables(): void
    {
        Schema::create('storefront_orders', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid');
            $table->string('monetization_policy')->nullable();
            $table->string('collection_owner')->nullable();
            $table->unsignedBigInteger('digital_product_id')->nullable();
            $table->unsignedBigInteger('biolink_id')->nullable();
            $table->unsignedBigInteger('creator_id')->nullable();
            $table->unsignedBigInteger('buyer_user_id')->nullable();
            $table->string('buyer_name')->nullable();
            $table->string('buyer_email')->nullable();
            $table->string('currency', 12)->default('ETB');
            $table->unsignedBigInteger('gross_amount_cents')->default(0);
            $table->integer('commission_bps')->default(0);
            $table->unsignedBigInteger('commission_plan_id')->nullable();
            $table->float('platform_fee_percent')->default(0);
            $table->unsignedBigInteger('platform_fee_cents')->default(0);
            $table->unsignedBigInteger('creator_earnings_cents')->default(0);
            $table->string('status', 32)->default('pending_payment');
            $table->string('payment_gateway', 32)->nullable();
            $table->string('chapa_tx_ref', 64)->nullable();
            $table->timestamp('receipt_sent_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });

        Schema::create('download_entitlements', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('storefront_order_id');
            $table->unsignedBigInteger('file_entry_id')->default(1);
            $table->uuid('token');
            $table->unsignedInteger('download_limit')->default(5);
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
        });

        Schema::create('reviews', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('storefront_order_id');
            $table->timestamps();
        });
    }

    protected function createLedgerTables(): void
    {
        Schema::create('digital_product_earnings_ledger', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->nullable();
            $table->string('source_key')->nullable();
            $table->unsignedBigInteger('workspace_id')->nullable();
            $table->unsignedBigInteger('creator_id')->nullable();
            $table->unsignedBigInteger('storefront_order_id')->nullable();
            $table->unsignedBigInteger('payout_request_id')->nullable();
            $table->string('entry_type');
            $table->bigInteger('amount_cents');
            $table->string('currency', 12);
            $table->timestamp('available_at')->nullable();
            $table->string('description')->nullable();
            $table->text('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('digital_product_payment_refunds', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('payment_transaction_id')->nullable();
            $table->unsignedBigInteger('storefront_order_id');
            $table->unsignedInteger('recorded_by');
            $table->unsignedBigInteger('amount_cents');
            $table->unsignedBigInteger('creator_earnings_reversal_cents');
            $table->unsignedBigInteger('platform_fee_reversal_cents');
            $table->string('currency', 12);
            $table->string('external_reference')->nullable();
            $table->string('chapa_refund_reference', 190)->nullable();
            $table->string('status', 32)->default('completed');
            $table->text('reason');
            $table->timestamp('refunded_at');
            $table->timestamps();
        });

        Schema::create('payout_requests', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('workspace_id')->default(1);
            $table->unsignedBigInteger('creator_id');
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency', 12)->default('ETB');
            $table->string('status', 32)->default('requested');
            $table->text('payout_destination')->nullable();
            $table->string('transfer_reference', 64)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });

        (new (require database_path('migrations/2026_11_14_200000_create_storefront_journal_tables.php')))->up();
        (new (require database_path('migrations/2026_11_14_210000_create_storefront_payment_attempts_table.php')))->up();
        (new (require database_path('migrations/2026_11_14_220000_create_storefront_payout_intents_table.php')))->up();
    }

    protected function dropAllTables(): void
    {
        Schema::dropIfExists('storefront_payout_intents');
        Schema::dropIfExists('storefront_payment_attempts');
        Schema::dropIfExists('storefront_journal_lines');
        Schema::dropIfExists('storefront_journal_entries');
        Schema::dropIfExists('payout_requests');
        Schema::dropIfExists('digital_product_payment_refunds');
        Schema::dropIfExists('digital_product_earnings_ledger');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('download_entitlements');
        Schema::dropIfExists('digital_product_files');
        Schema::dropIfExists('file_entries');
        Schema::dropIfExists('digital_products');
        Schema::dropIfExists('storefront_orders');
        Schema::dropIfExists('user_sessions');
        Schema::dropIfExists('users');
    }

    protected function seedUser(User $user): User
    {
        DB::table('users')->insert([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ]);

        return $user;
    }

    protected function seedPlatformOrder(User $creator, CreatorLedgerService $ledger, ?Carbon $paidAt = null): StorefrontOrder
    {
        $gross = 100000;
        $fee = 5000;

        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'monetization_policy' => 'marketplace_v2',
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA,
            'digital_product_id' => 1,
            'creator_id' => $creator->id,
            'currency' => 'ETB',
            'gross_amount_cents' => $gross,
            'commission_bps' => 500,
            'platform_fee_cents' => $fee,
            'creator_earnings_cents' => $gross - $fee,
            'status' => 'paid',
            'payment_gateway' => 'chapa',
            'chapa_tx_ref' => 'chp_tx_' . Str::random(12),
            'paid_at' => $paidAt ?? Carbon::now(),
        ]);

        StorefrontPaymentAttempt::query()->create([
            'order_id' => $order->id,
            'merchant_reference' => $order->chapa_tx_ref,
            'chapa_reference' => 'chapa_ref_' . Str::random(10),
            'idempotency_key' => (string) Str::uuid(),
            'amount_cents' => $gross,
            'currency' => 'ETB',
            'status' => StorefrontPaymentAttempt::STATUS_SUCCESSFUL,
        ]);

        $ledger->recordPlatformSale($order);

        return $order;
    }

    protected function createEntitlement(StorefrontOrder $order): DownloadEntitlement
    {
        return DownloadEntitlement::query()->create([
            'storefront_order_id' => $order->id,
            'file_entry_id' => 1,
            'token' => (string) Str::uuid(),
        ]);
    }

    protected function disburseEarnings(User $creator, CreatorLedgerService $ledger, int $cents): void
    {
        $payout = PayoutRequest::query()->create([
            'workspace_id' => 1,
            'creator_id' => $creator->id,
            'amount_cents' => $cents,
            'currency' => 'ETB',
            'status' => 'paid',
        ]);
        $ledger->reserveForPayout($payout);
        $ledger->disbursePayout($payout);
    }

    protected function bindMockChapaClient(MarketplaceMockConfig $config): void
    {
        $transport = $this->createMock(Transport::class);
        $transport->method('send')->willReturnCallback(function () use ($config) {
            $data = [
                'reference' => $config->reference,
                'chapa_reference' => $config->reference,
                'status' => $config->status,
                'amount' => $config->amount,
                'currency' => 'ETB',
            ];
            if (!$config->isRefund) {
                $data['merchant_reference'] = $config->reference;
                $data['email'] = 'buyer@test.com';
            }

            return new RawResponse(200, (string) json_encode(['status' => 'success', 'data' => $data]));
        });

        $client = new ChapaClient(privateKey: 'chapa-test-mock-secret', transport: $transport);
        $manager = new LinketChapaManager();
        $manager->swapClient($client);
        $this->app->instance(LinketChapaManager::class, $manager);
    }
}
