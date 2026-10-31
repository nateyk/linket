<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table): void {
            $table->string('payment_provider_snapshot', 32)->nullable();
            $table->text('payment_account_snapshot')->nullable();
            $table->string('payment_account_name_snapshot')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table): void {
            $table->dropColumn(['payment_provider_snapshot', 'payment_account_snapshot', 'payment_account_name_snapshot']);
        });
    }
};
