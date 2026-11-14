<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('storefront_payment_attempts')) {
            Schema::create('storefront_payment_attempts', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('order_id')->constrained('storefront_orders')->cascadeOnDelete();
                $table->string('merchant_reference', 20)->unique();
                $table->string('chapa_reference', 64)->nullable()->index();
                $table->uuid('idempotency_key')->unique();
                $table->unsignedInteger('amount_cents');
                $table->string('currency', 12)->default('ETB');
                $table->string('status', 32)->default('created')->index();
                $table->text('checkout_url')->nullable();
                $table->timestamp('verified_at')->nullable();
                $table->text('error_message')->nullable();
                $table->json('verification_data')->nullable();
                $table->timestamps();

                $table->index(['order_id', 'status'], 'sf_attempts_order_status_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_payment_attempts');
    }
};
