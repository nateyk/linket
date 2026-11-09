<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table): void {
            if (!Schema::hasColumn('storefront_orders', 'verification_attempts')) {
                $table->unsignedTinyInteger('verification_attempts')->default(0);
            }
            if (!Schema::hasColumn('storefront_orders', 'delivery_status')) {
                $table->string('delivery_status', 32)->default('awaiting_payment')->index();
            }
            if (!Schema::hasColumn('storefront_orders', 'delivered_at')) {
                $table->timestamp('delivered_at')->nullable();
            }
            if (!Schema::hasColumn('storefront_orders', 'delivery_error')) {
                $table->string('delivery_error', 255)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table): void {
            $columns = [];
            foreach (['verification_attempts', 'delivery_status', 'delivered_at', 'delivery_error'] as $column) {
                if (Schema::hasColumn('storefront_orders', $column)) {
                    $columns[] = $column;
                }
            }
            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
