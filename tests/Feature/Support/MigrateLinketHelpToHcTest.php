<?php

namespace Tests\Feature\Support;

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MigrateLinketHelpToHcTest extends TestCase
{
    use RefreshDatabase;

    public function test_migrate_command_copies_help_articles_into_hc(): void
    {
        $categoryId = DB::table('help_categories')->insertGetId([
            'name' => 'Getting started',
            'slug' => 'getting-started',
            'sort_id' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('help_articles')->insert([
            'title' => 'How to publish',
            'slug' => 'how-to-publish',
            'body' => '<p>Click publish</p>',
            'short_description' => 'Publish your store',
            'help_category_id' => $categoryId,
            'views' => 3,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('support:migrate-linket-help-to-hc')
            ->assertSuccessful();

        $this->assertDatabaseHas('categories', [
            'name' => 'Getting started',
        ]);
        $this->assertDatabaseHas('articles', [
            'title' => 'How to publish',
            'slug' => 'how-to-publish',
        ]);

        $this->assertTrue(
            HcArticle::query()->where('slug', 'how-to-publish')->exists(),
        );
        $this->assertDatabaseHas('category_article', [
            'article_id' => HcArticle::query()->where('slug', 'how-to-publish')->value('id'),
            'category_id' => HcCategory::query()->where('name', 'Getting started')->value('id'),
        ]);
    }
}
