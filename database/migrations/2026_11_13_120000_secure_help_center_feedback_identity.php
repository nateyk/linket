<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('article_feedback', function (Blueprint $table) {
            $table->string('visitor_token_hash', 64)->nullable();
        });

        // Previous submissions could race and create duplicate user votes.
        // Preserve the newest answer before enforcing the database invariant.
        $duplicateUsers = DB::table('article_feedback')
            ->select('article_id', 'user_id')
            ->whereNotNull('user_id')
            ->groupBy('article_id', 'user_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicateUsers as $identity) {
            $ids = DB::table('article_feedback')
                ->where('article_id', $identity->article_id)
                ->where('user_id', $identity->user_id)
                ->orderByDesc('id')
                ->pluck('id')
                ->all();

            DB::table('article_feedback')->whereIn('id', array_slice($ids, 1))->delete();
        }

        Schema::table('article_feedback', function (Blueprint $table) {
            $table->unique(['article_id', 'user_id'], 'hc_feedback_article_user_unique');
            $table->unique(['article_id', 'visitor_token_hash'], 'hc_feedback_article_visitor_unique');
        });
    }

    public function down(): void
    {
        Schema::table('article_feedback', function (Blueprint $table) {
            $table->dropUnique('hc_feedback_article_user_unique');
            $table->dropUnique('hc_feedback_article_visitor_unique');
            $table->dropColumn('visitor_token_hash');
        });
    }
};
