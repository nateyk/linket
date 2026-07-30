<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('payment_transactions')) Schema::create('payment_transactions', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('gateway')->default('chapa')->index();
            $table->string('payable_type');
            $table->unsignedBigInteger('payable_id');
            $table->string('purpose')->index();
            $table->string('tx_ref')->unique();
            $table->decimal('amount', 18, 2);
            $table->string('currency', 12);
            $table->string('status')->default('pending')->index();
            $table->string('checkout_url')->nullable();
            $table->string('gateway_transaction_id')->nullable()->unique();
            $table->string('buyer_email')->nullable()->index();
            $table->json('verification_data')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->index(['payable_type', 'payable_id']);
        });

        if (!Schema::hasColumn('storefront_orders', 'payment_gateway')) {
            Schema::table('storefront_orders', function (Blueprint $table): void {
                $table->string('payment_gateway')->nullable()->after('status');
            });
        }
        if (!Schema::hasColumn('storefront_orders', 'chapa_tx_ref')) {
            Schema::table('storefront_orders', function (Blueprint $table): void {
                $table->string('chapa_tx_ref')->nullable()->unique()->after('payment_gateway');
            });
        }

        if (!Schema::hasColumn('subscriptions', 'pending_product_id')) {
            Schema::table('subscriptions', function (Blueprint $table): void {
                $table->unsignedInteger('pending_product_id')->nullable()->after('product_id');
            });
        }
        if (!Schema::hasColumn('subscriptions', 'pending_price_id')) {
            Schema::table('subscriptions', function (Blueprint $table): void {
                $table->unsignedInteger('pending_price_id')->nullable()->after('price_id');
            });
        }

        if (!Schema::hasTable('subscription_renewal_reminders')) Schema::create('subscription_renewal_reminders', function (Blueprint $table): void {
            $table->id();
            $table->unsignedInteger('subscription_id');
            $table->unsignedTinyInteger('days_before');
            $table->timestamp('sent_at');
            $table->timestamps();
            $table->unique(['subscription_id', 'days_before'], 'subscription_reminder_days_unique');
            $table->foreign('subscription_id')->references('id')->on('subscriptions')->cascadeOnDelete();
        });
        elseif (Schema::hasTable('subscription_renewal_reminders')) {
            Schema::table('subscription_renewal_reminders', function (Blueprint $table): void {
                $table->unique(['subscription_id', 'days_before'], 'subscription_reminder_days_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_renewal_reminders');
        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->dropColumn(['pending_product_id', 'pending_price_id']);
        });
        Schema::table('storefront_orders', function (Blueprint $table): void {
            $table->dropUnique(['chapa_tx_ref']);
            $table->dropColumn(['payment_gateway', 'chapa_tx_ref']);
        });
        Schema::dropIfExists('payment_transactions');
    }
};
