<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table): void {
            if (!Schema::hasColumn('storefront_orders', 'last_counted_attempt_key')) {
                $table->string('last_counted_attempt_key', 64)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table): void {
            if (Schema::hasColumn('storefront_orders', 'last_counted_attempt_key')) {
                $table->dropColumn('last_counted_attempt_key');
            }
        });
    }
};
