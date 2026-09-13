<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('course_lessons', function (Blueprint $table) {
            $table->longText('summary')->nullable()->after('content');
        });

        // Migrate existing video lesson content to summary (so toggle doesn't lose data)
        DB::table('course_lessons')->where('content_type', 'video')->whereNotNull('content')->update([
            'summary' => DB::raw('content'),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('course_lessons', function (Blueprint $table) {
            $table->dropColumn('summary');
        });
    }
};
