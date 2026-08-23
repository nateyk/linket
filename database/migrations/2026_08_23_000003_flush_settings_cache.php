<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;

/**
 * The settings table is cached wholesale under "settings.public" for 24h
 * (Settings::loadSettings). The upload-backend backfill wrote to the
 * settings table directly, so environments where that cache was already
 * warm keep serving the stale value (no per-type backends) until it
 * expires. Flush it explicitly.
 */
return new class extends Migration {
    public function up(): void
    {
        Cache::forget('settings.public');
    }

    public function down(): void
    {
        // Nothing to restore: the cache rebuilds from the database.
    }
};
