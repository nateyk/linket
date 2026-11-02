<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('telegram_connections', function (Blueprint $table): void {
            $table->boolean('notifications_enabled')
                ->default(true)
                ->after('last_seen_at');
            $table->json('notification_preferences')
                ->nullable()
                ->after('notifications_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('telegram_connections', function (Blueprint $table): void {
            $table->dropColumn([
                'notification_preferences',
                'notifications_enabled',
            ]);
        });
    }
};
