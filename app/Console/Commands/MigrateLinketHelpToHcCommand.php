<?php

namespace App\Console\Commands;

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class MigrateLinketHelpToHcCommand extends Command
{
    protected $signature = 'support:migrate-linket-help-to-hc {--force : Re-run even if articles already exist}';

    protected $description = 'Migrate Linket help_* knowledge base into BeDesk Help Center tables';

    public function handle(): int
    {
        if (! Schema::hasTable('help_articles') || ! Schema::hasTable('articles')) {
            $this->error('Required tables missing (help_articles / articles).');

            return self::FAILURE;
        }

        if (! $this->option('force') && HcArticle::query()->exists()) {
            $this->warn('HC articles already exist. Pass --force to merge Linket help content.');

            return self::SUCCESS;
        }

        $categoryMap = [];

        HcArticle::withoutSyncingToSearch(function () use (&$categoryMap) {
            DB::transaction(function () use (&$categoryMap) {
                foreach (
                    DB::table('help_categories')->orderBy('sort_id')->get()
                    as $old
                ) {
                    $category = HcCategory::query()->create([
                        'name' => $old->name,
                        'description' => null,
                        'position' => $old->sort_id ?? 0,
                        'parent_id' => null,
                    ]);
                    $categoryMap[$old->id] = $category->id;
                }

                foreach (DB::table('help_articles')->get() as $old) {
                    $slug = $this->uniqueArticleSlug(
                        $old->slug ?: Str::slug($old->title),
                        $old->id,
                    );
                    $article = HcArticle::query()->create([
                        'title' => $old->title,
                        'body' => $old->body,
                        'slug' => $slug,
                        'draft' => false,
                        'visibility' => 'public',
                        'views' => $old->views ?? 0,
                        'description' => $old->short_description ?? null,
                    ]);

                    $hcCategoryId = $categoryMap[$old->help_category_id] ?? null;
                    if ($hcCategoryId) {
                        DB::table('category_article')->insert([
                            'article_id' => $article->id,
                            'category_id' => $hcCategoryId,
                            'position' => 0,
                        ]);
                    }
                }
            });
        });

        $this->info('Migrated Linket Help Center into BeDesk HC tables.');

        return self::SUCCESS;
    }

    protected function uniqueArticleSlug(string $slug, int $id): string
    {
        $base = $slug ?: "article-{$id}";
        if (! HcArticle::query()->where('slug', $base)->exists()) {
            return $base;
        }

        return "{$base}-linket-{$id}";
    }
}
