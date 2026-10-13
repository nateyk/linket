<?php

namespace Tests\Unit\Blog;

use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Common\Core\Prerender\BaseUrlGenerator;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class UrlGeneratorTest extends TestCase
{
    use DatabaseTransactions;

    private function article(): BlogArticle
    {
        return BlogArticle::create([
            'title' => 'Test Article',
            'slug' => 'test-article',
            'body' => '<p>Body</p>',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'blog_category_id' => BlogCategory::create(['name' => 'Guides', 'slug' => 'guides'])->id,
        ]);
    }

    private function category(): BlogCategory
    {
        return BlogCategory::create(['name' => 'Guides', 'slug' => 'guides']);
    }

    public function test_blog_index_url(): void
    {
        $url = app(BaseUrlGenerator::class)->blogIndex();
        $this->assertEquals(url('blog'), $url);
    }

    public function test_blog_category_url(): void
    {
        $category = $this->category();
        $url = app(BaseUrlGenerator::class)->blogCategory($category);
        $this->assertEquals(url("blog/categories/{$category->slug}"), $url);
    }

    public function test_blog_article_url(): void
    {
        $article = $this->article();
        $url = app(BaseUrlGenerator::class)->blogArticle($article);
        $this->assertEquals(url("blog/{$article->slug}"), $url);
    }
}