<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creator_payment_methods', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('user_id');
            $table->string('provider', 32);
            $table->text('account_number');
            $table->char('account_fingerprint', 64);
            $table->string('account_name_raw');
            $table->string('account_name_normalized');
            $table->json('approved_aliases')->nullable();
            $table->string('pending_alias')->nullable();
            $table->string('alias_proof_path')->nullable();
            $table->string('proof_path')->nullable();
            $table->string('status', 24)->default('pending');
            $table->boolean('is_active')->default(false);
            $table->unsignedInteger('reviewed_by')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();
            $table->unique(['provider', 'account_fingerprint'], 'creator_payment_account_unique');
            $table->index(['workspace_id', 'user_id', 'status']);
        });

        Schema::create('commission_invoices', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedInteger('creator_id');
            $table->foreignId('workspace_id')->constrained()->restrictOnDelete();
            $table->string('invoice_number', 50)->unique();
            $table->date('period_start');
            $table->date('period_end');
            $table->unsignedInteger('sales_count')->default(0);
            $table->unsignedBigInteger('gross_sales_cents')->default(0);
            $table->unsignedBigInteger('commission_fee_cents')->default(0);
            $table->string('status', 24)->default('pending');
            $table->timestamp('due_at');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->foreign('creator_id')->references('id')->on('users')->restrictOnDelete();
            $table->index(['creator_id', 'status', 'due_at']);
        });

        Schema::create('commission_accruals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('storefront_order_id')->unique()->constrained()->restrictOnDelete();
            $table->unsignedInteger('creator_id');
            $table->foreignId('workspace_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('plan_id')->nullable();
            $table->unsignedBigInteger('gross_amount_cents');
            $table->unsignedInteger('fee_bps');
            $table->unsignedBigInteger('fee_cents');
            $table->foreignId('commission_invoice_id')->nullable()->constrained()->restrictOnDelete();
            $table->timestamp('paid_at');
            $table->timestamps();
            $table->foreign('creator_id')->references('id')->on('users')->restrictOnDelete();
            $table->index(['creator_id', 'commission_invoice_id', 'paid_at'], 'accruals_invoice_period_index');
        });

        Schema::create('order_manual_approvals', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('storefront_order_id')->unique()->constrained()->restrictOnDelete();
            $table->unsignedInteger('creator_id');
            $table->string('buyer_reference', 150);
            $table->string('creator_ip', 45);
            $table->string('reason')->nullable();
            $table->string('proof_path')->nullable();
            $table->boolean('was_degraded_mode')->default(false);
            $table->timestamp('created_at');
            $table->foreign('creator_id')->references('id')->on('users')->restrictOnDelete();
            $table->index(['creator_id', 'created_at']);
        });

        Schema::create('direct_payment_verifications', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 150)->unique();
            $table->string('payable_type');
            $table->unsignedBigInteger('payable_id');
            $table->string('bank_code', 32);
            $table->text('settlement_account');
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency', 12)->default('ETB');
            $table->string('status', 32)->default('pending');
            $table->string('provider_request_id')->nullable()->unique();
            $table->unsignedInteger('attempt')->default(1);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->index(['payable_type', 'payable_id']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('pro_subscription_payments', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedInteger('creator_id');
            $table->unsignedInteger('product_id');
            $table->unsignedBigInteger('amount_cents')->default(50000);
            $table->string('status', 32)->default('pending_payment');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->foreign('creator_id')->references('id')->on('users')->restrictOnDelete();
            $table->index(['creator_id', 'status']);
        });

        Schema::create('verify_et_webhook_deliveries', function (Blueprint $table): void {
            $table->id();
            $table->uuid('event_id')->unique();
            $table->string('provider_request_id')->nullable();
            $table->string('event_type', 80)->nullable();
            $table->string('status', 32);
            $table->boolean('is_test')->default(false);
            $table->timestamp('received_at');
            $table->timestamps();
        });

        Schema::table('storefront_orders', function (Blueprint $table): void {
            $table->foreignId('creator_payment_method_id')->nullable()->constrained('creator_payment_methods')->restrictOnDelete();
            $table->string('payment_reference', 150)->nullable()->unique();
            $table->string('verification_request_id')->nullable()->index();
            $table->char('payment_access_token_hash', 64)->nullable();
            $table->timestamp('payment_expires_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('creator_payment_method_id');
            $table->dropColumn(['payment_reference', 'verification_request_id', 'payment_access_token_hash', 'payment_expires_at']);
        });
        Schema::dropIfExists('verify_et_webhook_deliveries');
        Schema::dropIfExists('pro_subscription_payments');
        Schema::dropIfExists('direct_payment_verifications');
        Schema::dropIfExists('order_manual_approvals');
        Schema::dropIfExists('commission_accruals');
        Schema::dropIfExists('commission_invoices');
        Schema::dropIfExists('creator_payment_methods');
    }
};
