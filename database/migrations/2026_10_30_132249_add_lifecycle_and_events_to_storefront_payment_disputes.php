<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storefront_payment_disputes', function (Blueprint $table) {
            if (! Schema::hasColumn('storefront_payment_disputes', 'lifecycle_status')) {
                $table->string('lifecycle_status', 32)->default('open')->after('reason');
                $table->index(['lifecycle_status', 'created_at'], 'spd_lifecycle_created_idx');
                $table->index(['storefront_order_id', 'reason', 'lifecycle_status'], 'spd_order_reason_lifecycle_idx');
            }
        });

        if (! Schema::hasTable('storefront_payment_dispute_events')) {
            Schema::create('storefront_payment_dispute_events', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('storefront_payment_dispute_id');
                $table->string('from_status', 32)->nullable();
                $table->string('to_status', 32);
                $table->unsignedInteger('actor_user_id')->nullable();
                $table->string('actor_role', 16);
                $table->text('note')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('storefront_payment_dispute_id', 'spd_events_dispute_fk')
                    ->references('id')
                    ->on('storefront_payment_disputes')
                    ->cascadeOnDelete();
                $table->foreign('actor_user_id', 'spd_events_actor_fk')
                    ->references('id')
                    ->on('users')
                    ->nullOnDelete();
                $table->index(['storefront_payment_dispute_id', 'created_at'], 'spd_events_dispute_created_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('storefront_payment_dispute_events');

        Schema::table('storefront_payment_disputes', function (Blueprint $table) {
            if (Schema::hasColumn('storefront_payment_disputes', 'lifecycle_status')) {
                $table->dropIndex('spd_order_reason_lifecycle_idx');
                $table->dropIndex('spd_lifecycle_created_idx');
                $table->dropColumn('lifecycle_status');
            }
        });
    }
};
