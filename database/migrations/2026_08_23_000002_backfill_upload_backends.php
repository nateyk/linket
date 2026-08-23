<?php

use Common\Database\Seeders\UploadBackendsSeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * Existing installs never receive upload-backend assignments for upload
 * types added to config('filesystems.upload_types') after their initial
 * seed: production deploys run migrations without seeding, so the
 * "uploading" setting lacks per-type backends and the frontend fails with
 * "No backend found for upload type ..." before any request is made.
 *
 * Runs the idempotent UploadBackendsSeeder to create a local backend (if
 * missing) and assign every configured upload type a backend.
 */
return new class extends Migration {
    public function up(): void
    {
        app(UploadBackendsSeeder::class)->run();
    }

    public function down(): void
    {
        // Intentionally not reversible: restoring required upload
        // configuration should not be rolled back.
    }
};
