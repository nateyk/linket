<?php

use Common\Database\Seeders\UploadBackendsSeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * Assign a storage backend to conversationAttachments after it was added
 * to config('filesystems.upload_types').
 */
return new class extends Migration {
    public function up(): void
    {
        app(UploadBackendsSeeder::class)->run();
    }

    public function down(): void
    {
        // Intentionally not reversible.
    }
};
