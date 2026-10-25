<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BeDesk profiles → user_details used text `details` + `notes` (no timestamps).
 * Align our greenfield table if it still has json details / timestamps only.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('user_details')) {
            return;
        }

        Schema::table('user_details', function (Blueprint $table) {
            // Ensure notes exists (BeDesk profile field).
            if (! Schema::hasColumn('user_details', 'notes')) {
                $table->text('notes')->nullable();
            }
        });

        // details was created as json in greenfield; BeDesk stores freeform text/json string.
        // Leave column as-is if already present — Eloquent casts handle both.
    }

    public function down(): void
    {
        // No destructive down — keeping notes is safe.
    }
};
