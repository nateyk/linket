<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (
            !Schema::hasTable('custom_pages') ||
            !Schema::hasTable('link_pages') ||
            !Schema::hasColumn('custom_pages', 'type')
        ) {
            return;
        }

        DB::table('custom_pages')
            ->where('type', 'link_page')
            ->orderBy('id')
            ->chunkById(500, function (Collection $pages) {
                $existingIds = DB::table('link_pages')
                    ->whereIn('id', $pages->pluck('id'))
                    ->pluck('id');

                $rows = $pages
                    ->reject(fn($page) => $existingIds->contains($page->id))
                    ->map(
                        fn($page) => [
                            'id' => $page->id,
                            'title' => $page->title,
                            'body' => $page->body,
                            'hide_footer' =>
                                $page->meta['hide_footer'] ?? false,
                            'hide_navbar' =>
                                $page->meta['hide_navbar'] ?? false,
                            'user_id' => $page->user_id,
                            'workspace_id' => $page->workspace_id,
                            'created_at' => $page->created_at,
                            'updated_at' => $page->updated_at,
                            'deleted_at' => $page->deleted_at,
                        ],
                    )
                    ->values()
                    ->all();

                if ($rows) {
                    DB::table('link_pages')->insert($rows);
                }

                DB::table('custom_pages')
                    ->whereIn('id', $pages->pluck('id'))
                    ->delete();
            });
    }
};
