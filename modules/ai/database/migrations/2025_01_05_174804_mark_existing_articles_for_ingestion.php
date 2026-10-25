<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (
            ! Schema::hasTable('articles') ||
            ! Schema::hasColumn('articles', 'scan_pending')
        ) {
            return;
        }

        DB::table('articles')
            ->where('draft', false)
            ->update([
                'scan_pending' => true,
            ]);
    }

    public function down(): void
    {
    }
};
