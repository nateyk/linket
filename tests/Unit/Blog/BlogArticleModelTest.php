<?php

namespace Tests\Unit\Blog;

use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BlogArticleModelTest extends TestCase
{
    use DatabaseTransactions;

    private function category(): BlogCategory
    {
        return BlogCategory::create(['name' => 'Guides']);
    }

    private function article(array $overrides = []): BlogArticle
    {
        return BlogArticle::create(
            array_merge(
                [
                    'title' => 'How to start',
                    'body' => '<p>Body</p>',
                    'blog_category_id' => $this->category()->id,
                ],
                $overrides,
            ),
        );
    }

    public function test_reading_time_is_computed_from_body_text(): void
    {
        $words = implode(' ', array_fill(0, 400, 'word'));
        $article = $this->article(['body' => "<p>{$words}</p>"]);

        $this->assertSame(2, $article->fresh()->reading_time_minutes);
    }

    public function test_reading_time_is_never_zero_for_empty_body(): void
    {
        $article = $this->article(['body' => '']);

        $this->assertSame(1, $article->fresh()->reading_time_minutes);
    }

    public function test_body_text_is_stripped_of_markup(): void
    {
        $article = $this->article(['body' => '<h2>Hi</h2><p>There</p>']);

        $this->assertSame('Hi There', trim($article->fresh()->body_text));
    }

    public function test_body_is_sanitised_on_save(): void
    {
        $article = $this->article([
            'body' => '<p>ok</p><script>alert(1)</script>',
        ]);

        $this->assertStringNotContainsString(
            '<script',
            $article->fresh()->body,
        );
    }

    public function test_published_scope_excludes_drafts(): void
    {
        $draft = $this->article(['status' => 'draft']);

        $this->assertFalse(
            BlogArticle::published()->get()->contains($draft),
        );
    }

    public function test_published_scope_excludes_future_articles(): void
    {
        $future = $this->article([
            'status' => 'published',
            'published_at' => now()->addWeek(),
        ]);

        $this->assertFalse(
            BlogArticle::published()->get()->contains($future),
        );
    }

    public function test_published_scope_includes_published_articles(): void
    {
        $live = $this->article([
            'status' => 'published',
            'published_at' => now()->subDay(),
        ]);

        $this->assertTrue(BlogArticle::published()->get()->contains($live));
    }

    public function test_deleting_a_category_cascades_to_its_articles(): void
    {
        $category = $this->category();
        $article = BlogArticle::create([
            'title' => 'Doomed',
            'body' => '<p>x</p>',
            'blog_category_id' => $category->id,
        ]);

        $category->delete();

        $this->assertNull(BlogArticle::find($article->id));
    }
}