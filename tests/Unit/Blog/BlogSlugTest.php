<?php

namespace Tests\Unit\Blog;

use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BlogSlugTest extends TestCase
{
    use DatabaseTransactions;

    private function category(): BlogCategory
    {
        return BlogCategory::create(['name' => 'Guides']);
    }

    public function test_duplicate_titles_produce_unique_slugs(): void
    {
        $category = $this->category();

        $a = BlogArticle::create([
            'title' => 'How to start',
            'body' => '<p>x</p>',
            'blog_category_id' => $category->id,
        ]);
        $b = BlogArticle::create([
            'title' => 'How to start',
            'body' => '<p>x</p>',
            'blog_category_id' => $category->id,
        ]);

        $this->assertSame('how-to-start', $a->slug);
        $this->assertNotEquals($a->slug, $b->slug);
    }

    public function test_duplicate_category_names_produce_unique_slugs(): void
    {
        $a = BlogCategory::create(['name' => 'Getting Started']);
        $b = BlogCategory::create(['name' => 'Getting Started']);

        $this->assertSame('getting-started', $a->slug);
        $this->assertNotEquals($a->slug, $b->slug);
    }

    public function test_umlauts_are_transliterated(): void
    {
        $article = BlogArticle::create([
            'title' => 'Größe und Maß',
            'body' => '<p>x</p>',
            'blog_category_id' => $this->category()->id,
        ]);

        $this->assertSame('groesse-und-mass', $article->slug);
    }

    public function test_sharp_s_becomes_ss(): void
    {
        $article = BlogArticle::create([
            'title' => 'Straße',
            'body' => '<p>x</p>',
            'blog_category_id' => $this->category()->id,
        ]);

        $this->assertSame('strasse', $article->slug);
    }

    public function test_non_latin_title_still_produces_a_usable_slug(): void
    {
        $article = BlogArticle::create([
            'title' => '日本語',
            'body' => '<p>x</p>',
            'blog_category_id' => $this->category()->id,
        ]);

        $this->assertNotSame('', $article->slug);
        $this->assertMatchesRegularExpression(
            '/^[a-z0-9-]+$/',
            $article->slug,
        );
    }

    public function test_emoji_only_title_still_produces_a_usable_slug(): void
    {
        $article = BlogArticle::create([
            'title' => '🎉🎉🎉',
            'body' => '<p>x</p>',
            'blog_category_id' => $this->category()->id,
        ]);

        $this->assertNotSame('', $article->slug);
    }

    public function test_slug_survives_a_title_edit(): void
    {
        $article = BlogArticle::create([
            'title' => 'Original title',
            'body' => '<p>x</p>',
            'blog_category_id' => $this->category()->id,
        ]);
        $original = $article->slug;

        $article->update(['title' => 'Completely different title']);

        $this->assertSame($original, $article->fresh()->slug);
    }

    public function test_explicit_slug_is_respected(): void
    {
        $article = BlogArticle::create([
            'title' => 'Anything',
            'slug' => 'my-custom-slug',
            'body' => '<p>x</p>',
            'blog_category_id' => $this->category()->id,
        ]);

        $this->assertSame('my-custom-slug', $article->slug);
    }
}