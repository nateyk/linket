<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Align search_terms with BeDesk HC analytics columns used by demo + HC search.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('search_terms')) {
            return;
        }

        Schema::table('search_terms', function (Blueprint $table) {
            if (! Schema::hasColumn('search_terms', 'normalized_term')) {
                $table->string('normalized_term')->nullable()->after('term');
            }
            if (! Schema::hasColumn('search_terms', 'result_count')) {
                $table->unsignedInteger('result_count')->default(0)->after('normalized_term');
            }
            if (! Schema::hasColumn('search_terms', 'clicked_article')) {
                $table->boolean('clicked_article')->default(false)->after('result_count');
            }
            if (! Schema::hasColumn('search_terms', 'created_ticket')) {
                $table->boolean('created_ticket')->default(false)->after('clicked_article');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('search_terms')) {
            return;
        }

        Schema::table('search_terms', function (Blueprint $table) {
            foreach (['normalized_term', 'result_count', 'clicked_article', 'created_ticket'] as $column) {
                if (Schema::hasColumn('search_terms', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
