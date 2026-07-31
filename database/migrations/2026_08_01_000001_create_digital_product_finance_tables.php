<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('digital_product_withdrawal_methods')) Schema::create('digital_product_withdrawal_methods', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('destination_label')->default('Payout destination');
            $table->text('instructions')->nullable();
            $table->unsignedBigInteger('minimum_amount_cents')->default(0);
            $table->unsignedBigInteger('maximum_amount_cents')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        foreach ([
            ['name' => 'Bank transfer', 'code' => 'bank_transfer', 'destination_label' => 'Bank account number'],
            ['name' => 'Telebirr', 'code' => 'telebirr', 'destination_label' => 'Telebirr phone number'],
            ['name' => 'PayPal', 'code' => 'paypal', 'destination_label' => 'PayPal email address'],
            ['name' => 'Manual payout', 'code' => 'other', 'destination_label' => 'Payout destination'],
        ] as $position => $method) {
            DB::table('digital_product_withdrawal_methods')->updateOrInsert(
                ['code' => $method['code']],
                [...$method, 'position' => $position + 1, 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            );
        }

        if (!Schema::hasTable('digital_product_earnings_ledger')) Schema::create('digital_product_earnings_ledger', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('creator_id');
            $table->foreignId('storefront_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('payout_request_id')->nullable()->constrained()->nullOnDelete();
            $table->string('entry_type')->index();
            $table->bigInteger('amount_cents');
            $table->string('currency', 12);
            $table->timestamp('available_at')->nullable()->index();
            $table->string('source_key')->unique();
            $table->string('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->foreign('creator_id')->references('id')->on('users')->cascadeOnDelete();
        });
        try {
            DB::statement('CREATE INDEX digital_earnings_creator_currency_idx ON digital_product_earnings_ledger (workspace_id, creator_id, currency)');
        } catch (\Throwable) {
            // A previous interrupted local migration may already have created the index.
        }

        if (!Schema::hasTable('digital_product_payout_request_activities')) Schema::create('digital_product_payout_request_activities', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('payout_request_id');
            $table->unsignedInteger('actor_id')->nullable();
            $table->string('action');
            $table->text('note')->nullable();
            $table->timestamps();
            $table->foreign('actor_id', 'dp_payout_activity_actor_fk')->references('id')->on('users')->nullOnDelete();
        });
        try { DB::statement('ALTER TABLE digital_product_payout_request_activities ADD CONSTRAINT dp_payout_activity_request_fk FOREIGN KEY (payout_request_id) REFERENCES payout_requests(id) ON DELETE CASCADE'); } catch (\Throwable) {}

        if (!Schema::hasTable('digital_product_payout_destination_reveals')) Schema::create('digital_product_payout_destination_reveals', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('payout_request_id');
            $table->unsignedInteger('revealed_by');
            $table->string('reason')->nullable();
            $table->timestamps();
            $table->foreign('revealed_by', 'dp_payout_reveal_actor_fk')->references('id')->on('users')->cascadeOnDelete();
        });
        try { DB::statement('ALTER TABLE digital_product_payout_destination_reveals ADD CONSTRAINT dp_payout_reveal_request_fk FOREIGN KEY (payout_request_id) REFERENCES payout_requests(id) ON DELETE CASCADE'); } catch (\Throwable) {}

        if (!Schema::hasTable('digital_product_payment_refunds')) Schema::create('digital_product_payment_refunds', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('payment_transaction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('storefront_order_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('recorded_by');
            $table->unsignedBigInteger('amount_cents');
            $table->unsignedBigInteger('creator_earnings_reversal_cents');
            $table->unsignedBigInteger('platform_fee_reversal_cents');
            $table->string('currency', 12);
            $table->string('external_reference')->nullable();
            $table->text('reason');
            $table->timestamp('refunded_at');
            $table->timestamps();
            $table->foreign('recorded_by')->references('id')->on('users')->restrictOnDelete();
        });
        try { DB::statement('CREATE UNIQUE INDEX dp_refund_external_reference_uq ON digital_product_payment_refunds (payment_transaction_id, external_reference)'); } catch (\Throwable) {}

        if (!Schema::hasColumn('digital_product_payout_methods', 'withdrawal_method_id')) Schema::table('digital_product_payout_methods', function (Blueprint $table): void {
            $table->foreignId('withdrawal_method_id')->nullable()->after('creator_id')->constrained('digital_product_withdrawal_methods')->nullOnDelete();
        });

        if (!Schema::hasColumn('payout_requests', 'withdrawal_method_id')) Schema::table('payout_requests', function (Blueprint $table): void {
            $table->foreignId('withdrawal_method_id')->nullable()->after('digital_product_payout_method_id')
                ->constrained('digital_product_withdrawal_methods')->nullOnDelete();
            $table->string('withdrawal_method_name')->nullable()->after('payout_method_label');
            $table->text('payout_destination')->nullable()->after('withdrawal_method_name');
            $table->string('transfer_reference')->nullable()->after('processed_by');
            $table->text('admin_notes')->nullable()->after('transfer_reference');
            $table->text('rejection_reason')->nullable()->after('admin_notes');
            $table->timestamp('processing_at')->nullable()->after('paid_at');
            $table->timestamp('rejected_at')->nullable()->after('processing_at');
            $table->timestamp('cancelled_at')->nullable()->after('rejected_at');
        });

        if (!Schema::hasColumn('download_entitlements', 'revoked_at')) Schema::table('download_entitlements', function (Blueprint $table): void {
            $table->timestamp('revoked_at')->nullable()->after('expires_at');
        });

        DB::table('payout_requests')->where('status', 'pending')->update(['status' => 'requested']);
        DB::table('digital_product_payout_methods')->whereNull('withdrawal_method_id')->update([
            'withdrawal_method_id' => DB::table('digital_product_withdrawal_methods')->where('code', 'bank_transfer')->value('id'),
        ]);

        DB::table('storefront_orders')
            ->join('digital_products', 'digital_products.id', '=', 'storefront_orders.digital_product_id')
            ->where('storefront_orders.status', 'paid')
            ->orderBy('storefront_orders.id')
            ->select(['storefront_orders.*', 'digital_products.workspace_id'])
            ->each(function (object $order): void {
                DB::table('digital_product_earnings_ledger')->updateOrInsert(
                    ['source_key' => "sale:{$order->id}"],
                    [
                        'uuid' => (string) \Illuminate\Support\Str::uuid(),
                        'workspace_id' => $order->workspace_id,
                        'creator_id' => $order->creator_id,
                        'storefront_order_id' => $order->id,
                        'entry_type' => 'sale',
                        'amount_cents' => $order->creator_earnings_cents,
                        'currency' => $order->currency,
                        'available_at' => $order->paid_at,
                        'description' => 'Legacy verified product sale',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                );
            });

        DB::table('payout_requests')->whereIn('status', ['requested', 'paid'])->orderBy('id')->each(function (object $payout): void {
            DB::table('digital_product_earnings_ledger')->updateOrInsert(
                ['source_key' => "legacy-payout:{$payout->id}"],
                [
                    'uuid' => (string) \Illuminate\Support\Str::uuid(),
                    'workspace_id' => $payout->workspace_id,
                    'creator_id' => $payout->creator_id,
                    'payout_request_id' => $payout->id,
                    'entry_type' => 'payout_reserved',
                    'amount_cents' => -$payout->amount_cents,
                    'currency' => $payout->currency,
                    'available_at' => now(),
                    'description' => 'Legacy payout reservation',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        });
    }

    public function down(): void
    {
        Schema::table('payout_requests', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('withdrawal_method_id');
            $table->dropColumn(['withdrawal_method_name', 'payout_destination', 'transfer_reference', 'admin_notes', 'rejection_reason', 'processing_at', 'rejected_at', 'cancelled_at']);
        });
        Schema::table('download_entitlements', fn (Blueprint $table) => $table->dropColumn('revoked_at'));
        Schema::table('digital_product_payout_methods', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('withdrawal_method_id');
        });
        Schema::dropIfExists('digital_product_payment_refunds');
        Schema::dropIfExists('digital_product_payout_destination_reveals');
        Schema::dropIfExists('digital_product_payout_request_activities');
        Schema::dropIfExists('digital_product_earnings_ledger');
        Schema::dropIfExists('digital_product_withdrawal_methods');
    }
};
