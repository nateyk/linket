<?php

use Common\Database\Seeders\UploadBackendsSeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * Assigns a storage backend to digitalProductSamples. UploadBackendsSeeder
 * is idempotent: it fills any upload type that config defines but the
 * uploading setting does not yet point at a backend.
 */
return new class extends Migration
{
    public function up(): void
    {
        app(UploadBackendsSeeder::class)->run();
    }

    public function down(): void
    {
        // Leaving the backend assignment in place matches the earlier
        // upload-type backfill. Removing it would break in-flight uploads.
    }
};
