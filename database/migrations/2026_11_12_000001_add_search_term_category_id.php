<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Search reports aggregate by category_id, but initial BeDesk migrations
 * never added it. Keep analytics optional in existing installations.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('search_terms') ||
            Schema::hasColumn('search_terms', 'category_id')) {
            return;
        }

        Schema::table('search_terms', function (Blueprint $table) {
            $table->unsignedBigInteger('category_id')->nullable()->index();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('search_terms') ||
            ! Schema::hasColumn('search_terms', 'category_id')) {
            return;
        }

        Schema::table('search_terms', function (Blueprint $table) {
            $table->dropColumn('category_id');
        });
    }
};
