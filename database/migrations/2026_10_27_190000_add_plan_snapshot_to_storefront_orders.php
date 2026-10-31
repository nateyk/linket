<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table): void {
            $table->unsignedInteger('commission_plan_id')->nullable()->after('commission_bps');
        });
    }

    public function down(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table): void {
            $table->dropColumn('commission_plan_id');
        });
    }
};
