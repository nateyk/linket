<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table): void {
            $table->foreignId('biolink_id')
                ->nullable()
                ->after('digital_product_id')
                ->constrained()
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('storefront_orders', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('biolink_id');
        });
    }
};
