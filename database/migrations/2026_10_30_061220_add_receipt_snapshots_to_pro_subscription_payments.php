<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pro_subscription_payments', function (Blueprint $table) {
            $table->string('receipt_number', 48)->nullable()->unique();
            $table->timestamp('subscription_period_start')->nullable();
            $table->timestamp('subscription_period_end')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pro_subscription_payments', function (Blueprint $table) {
            $table->dropUnique(['receipt_number']);
            $table->dropColumn(['receipt_number', 'subscription_period_start', 'subscription_period_end']);
        });
    }
};
