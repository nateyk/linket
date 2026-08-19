<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Recover safely from a prior interrupted local run before the migration was recorded.
        if (Schema::hasTable('digital_product_files') && !DB::table('digital_product_files')->exists()) {
            Schema::drop('digital_product_files');
        }
        if (Schema::hasTable('digital_products') && !DB::table('digital_products')->exists()) {
            Schema::drop('digital_products');
        }

        if (!Schema::hasColumn('products', 'storefront_benefits')) {
            Schema::table('products', function (Blueprint $table): void {
                $table->json('storefront_benefits')->nullable()->after('feature_list');
            });
        }

        if (!Schema::hasTable('digital_products')) Schema::create('digital_products', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('user_id');
            $table->unsignedInteger('cover_file_entry_id')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('price_cents');
            $table->string('currency', 12);
            $table->string('status')->default('draft')->index();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('cover_file_entry_id')->references('id')->on('file_entries')->nullOnDelete();
        });

        if (!Schema::hasTable('digital_product_files')) Schema::create('digital_product_files', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('digital_product_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('file_entry_id');
            $table->timestamps();
            $table->foreign('file_entry_id')->references('id')->on('file_entries')->cascadeOnDelete();
            $table->unique(['digital_product_id', 'file_entry_id']);
        });

        if (!Schema::hasTable('storefront_orders')) Schema::create('storefront_orders', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('digital_product_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('creator_id');
            $table->string('buyer_email')->nullable()->index();
            $table->string('currency', 12);
            $table->unsignedBigInteger('gross_amount_cents');
            $table->unsignedInteger('commission_bps');
            $table->unsignedBigInteger('platform_fee_cents');
            $table->unsignedBigInteger('creator_earnings_cents');
            $table->string('status')->default('pending')->index();
            $table->string('stripe_checkout_session_id')->nullable()->unique();
            $table->string('stripe_payment_intent_id')->nullable()->unique();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->foreign('creator_id')->references('id')->on('users')->restrictOnDelete();
        });

        if (!Schema::hasTable('storefront_order_items')) Schema::create('storefront_order_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('storefront_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('digital_product_id')->constrained()->restrictOnDelete();
            $table->string('title');
            $table->unsignedBigInteger('unit_amount_cents');
            $table->unsignedInteger('quantity')->default(1);
            $table->timestamps();
        });

        if (!Schema::hasTable('download_entitlements')) Schema::create('download_entitlements', function (Blueprint $table): void {
            $table->id();
            $table->uuid('token')->unique();
            $table->foreignId('storefront_order_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('file_entry_id');
            $table->unsignedInteger('download_count')->default(0);
            $table->unsignedInteger('download_limit')->default(10);
            $table->timestamp('expires_at');
            $table->timestamps();
            $table->unique(['storefront_order_id', 'file_entry_id']);
            $table->foreign('file_entry_id')->references('id')->on('file_entries')->restrictOnDelete();
        });

        if (!Schema::hasTable('payout_requests')) Schema::create('payout_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('creator_id');
            $table->string('currency', 12);
            $table->unsignedBigInteger('amount_cents');
            $table->string('status')->default('pending')->index();
            $table->unsignedInteger('processed_by')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->foreign('creator_id')->references('id')->on('users')->restrictOnDelete();
            $table->foreign('processed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_requests');
        Schema::dropIfExists('download_entitlements');
        Schema::dropIfExists('storefront_order_items');
        Schema::dropIfExists('storefront_orders');
        Schema::dropIfExists('digital_product_files');
        Schema::dropIfExists('digital_products');
        if (Schema::hasColumn('products', 'storefront_benefits')) {
            Schema::table('products', fn(Blueprint $table) => $table->dropColumn('storefront_benefits'));
        }
    }
};
