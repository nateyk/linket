<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table): void {
            $table->string('monetization_policy', 32)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('storefront_orders', fn (Blueprint $table) => $table->dropColumn('monetization_policy'));
    }
};
