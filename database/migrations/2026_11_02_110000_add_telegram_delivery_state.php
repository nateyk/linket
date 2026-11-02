<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('telegram_connections', function (Blueprint $table): void {
            $table->timestamp('last_delivery_at')->nullable();
            $table->timestamp('last_failed_at')->nullable();
            $table->unsignedSmallInteger('consecutive_failures')->default(0);
            $table->string('delivery_status', 32)->default('healthy');
        });
    }

    public function down(): void
    {
        Schema::table('telegram_connections', function (Blueprint $table): void {
            $table->dropColumn([
                'last_delivery_at',
                'last_failed_at',
                'consecutive_failures',
                'delivery_status',
            ]);
        });
    }
};
