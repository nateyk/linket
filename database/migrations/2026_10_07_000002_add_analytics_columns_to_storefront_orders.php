<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table) {
            $table->char('buyer_country', 2)->nullable()->after('buyer_email')->index();
            $table->string('buyer_referrer', 255)->nullable()->after('buyer_country');
        });
    }

    public function down(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table) {
            $table->dropIndex(['buyer_country']);
            $table->dropColumn(['buyer_referrer', 'buyer_country']);
        });
    }
};