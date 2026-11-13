<?php

namespace App\HelpCenter\Actions;

use App\Core\Modules;
use App\HelpCenter\Models\HcArticle;
use Illuminate\Support\Facades\DB;

class DeleteMultipleArticles
{
    public function execute(array $articleIds, bool $syncSearchIndex = true): void
    {
        $articleIds = collect($articleIds)
            ->filter(fn ($id) => filter_var($id, FILTER_VALIDATE_INT, [
                'options' => ['min_range' => 1],
            ]) !== false)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if ($articleIds === []) {
            return;
        }

        DB::transaction(function () use ($articleIds, $syncSearchIndex) {
            // Retain searchable model IDs before deleting database records.
            // Scout does not fire model events for mass SQL deletes.
            $articles = $syncSearchIndex
                ? HcArticle::query()->whereKey($articleIds)->get()
                : null;

            DB::table('category_article')
                ->whereIn('article_id', $articleIds)
                ->delete();

            DB::table('taggables')
                ->whereIn('taggable_id', $articleIds)
                ->where('taggable_type', HcArticle::MODEL_TYPE)
                ->delete();

            DB::table('article_feedback')
                ->whereIn('article_id', $articleIds)
                ->delete();

            if (Modules::aiInstalled()) {
                DB::table('ai_agent_chunks')
                    ->where('chunkable_type', HcArticle::MODEL_TYPE)
                    ->whereIn('chunkable_id', $articleIds)
                    ->delete();
            }

            DB::table('file_entry_models')
                ->where('model_type', HcArticle::MODEL_TYPE)
                ->whereIn('model_id', $articleIds)
                ->delete();

            HcArticle::whereIn('id', $articleIds)->delete();

            if ($syncSearchIndex && $articles->isNotEmpty()) {
                // Never remove index entries for a transaction that rolls back.
                DB::afterCommit(fn () => $articles->unsearchable());
            }
        });
    }
}
