<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('subscriptions')) {
            return;
        }

        if (Schema::hasColumn('subscriptions', 'open_user_gateway')) {
            return;
        }

        // Keep at most one open subscription per (user, gateway). Ended rows
        // leave the generated column NULL so historical renewals remain valid.
        DB::statement(<<<'SQL'
ALTER TABLE `subscriptions`
    ADD COLUMN `open_user_gateway` VARCHAR(191)
        GENERATED ALWAYS AS (
            CASE
                WHEN `ends_at` IS NULL THEN CONCAT(`user_id`, ':', `gateway_name`)
                ELSE NULL
            END
        ) STORED,
    ADD UNIQUE KEY `subscriptions_open_user_gateway_unique` (`open_user_gateway`)
SQL);
    }

    public function down(): void
    {
        if (! Schema::hasTable('subscriptions') || ! Schema::hasColumn('subscriptions', 'open_user_gateway')) {
            return;
        }

        DB::statement('ALTER TABLE `subscriptions` DROP INDEX `subscriptions_open_user_gateway_unique`, DROP COLUMN `open_user_gateway`');
    }
};
