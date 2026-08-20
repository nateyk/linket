<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('digital_product_order_recoveries')) {
            Schema::create('digital_product_order_recoveries', function (Blueprint $table): void {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->text('email');
                $table->string('email_hash', 64)->index();
                $table->string('token_hash', 64)->unique();
                $table->timestamp('expires_at')->index();
                $table->timestamp('redeemed_at')->nullable();
                $table->string('session_token_hash', 64)->nullable();
                $table->timestamp('session_expires_at')->nullable()->index();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('digital_product_order_recovery_deliveries')) {
            Schema::create('digital_product_order_recovery_deliveries', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('digital_product_order_recovery_id')->nullable()->constrained(table: 'digital_product_order_recoveries', indexName: 'dprod_recov_deliv_recov_id_fk')->nullOnDelete();
                $table->foreignId('storefront_order_id')->nullable()->constrained(table: 'storefront_orders', indexName: 'dprod_recov_deliv_order_id_fk')->nullOnDelete();
                $table->string('email_hash', 64)->index();
                $table->string('masked_email');
                $table->string('event')->index();
                $table->string('status')->index();
                $table->string('failure_code')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('digital_product_order_recovery_deliveries');
        Schema::dropIfExists('digital_product_order_recoveries');
    }
};
