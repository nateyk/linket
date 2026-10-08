<?php

namespace Tests\Feature\Help;

use Common\Help\Models\HelpArticle;
use Common\Help\Models\HelpCategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PublicHelpTest extends TestCase
{
    use DatabaseTransactions;

    public function test_help_index_lists_categories_with_articles(): void
    {
        $category = HelpCategory::create(['name' => 'General']);
        HelpArticle::create([
            'title' => 'How to start',
            'body' => '<p>Body</p>',
            'short_description' => 'Short',
            'help_category_id' => $category->id,
        ]);

        $response = $this->stateful()->getJson('/api/v1/help');

        $response->assertOk()->assertJsonStructure(['categories', 'commonCategories']);
    }

    public function test_help_index_search_filters_results(): void
    {
        $category = HelpCategory::create(['name' => 'General']);
        HelpArticle::create([
            'title' => 'How to start',
            'body' => '<p>Body</p>',
            'short_description' => 'Short',
            'help_category_id' => $category->id,
        ]);

        $response = $this->stateful()->getJson('/api/v1/help?search=start');

        $response->assertOk();
        $this->assertNotEmpty($response->json('categories'));
    }

    public function test_help_category_shows_paginated_articles_and_increments_views(): void
    {
        $category = HelpCategory::create(['name' => 'General']);
        HelpArticle::create([
            'title' => 'How to start',
            'body' => '<p>Body</p>',
            'short_description' => 'Short',
            'help_category_id' => $category->id,
        ]);

        $response = $this->stateful()->getJson("/api/v1/help/categories/{$category->slug}");

        $response->assertOk()->assertJsonStructure(['category', 'articles']);
        $this->assertEquals(1, $category->fresh()->views);
    }

    public function test_help_article_shows_related_and_increments_views(): void
    {
        $category = HelpCategory::create(['name' => 'General']);
        $article = HelpArticle::create([
            'title' => 'How to start',
            'body' => '<p>Body</p>',
            'short_description' => 'Short',
            'help_category_id' => $category->id,
        ]);

        $response = $this->stateful()->getJson("/api/v1/help/articles/{$article->slug}");

        $response->assertOk()->assertJsonStructure(['article', 'relatedArticles']);
        $this->assertEquals(1, $article->fresh()->views);
    }

    public function test_react_records_like(): void
    {
        $category = HelpCategory::create(['name' => 'General']);
        $article = HelpArticle::create([
            'title' => 'How to start',
            'body' => '<p>Body</p>',
            'short_description' => 'Short',
            'help_category_id' => $category->id,
        ]);

        $response = $this->stateful()->postJson("/api/v1/help/articles/{$article->slug}/react", ['action' => 1]);

        $response->assertOk();
        $this->assertEquals(1, $article->fresh()->likes);
    }

    public function test_react_with_invalid_action_changes_nothing(): void
    {
        $category = HelpCategory::create(['name' => 'General']);
        $article = HelpArticle::create([
            'title' => 'How to start',
            'body' => '<p>Body</p>',
            'short_description' => 'Short',
            'help_category_id' => $category->id,
        ]);

        $this->stateful()->postJson("/api/v1/help/articles/{$article->slug}/react", ['action' => 99])->assertStatus(422);
        $this->assertEquals(0, $article->fresh()->likes + $article->fresh()->dislikes);
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        $this->flushSession();

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
