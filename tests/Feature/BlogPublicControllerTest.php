<?php

namespace Tests\Feature;

use App\Models\User;
use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class BlogPublicControllerTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * Sanctum stateful requests: session + CSRF headers, matching
     * AdminProductReviewsTest::stateful(). Without these, actingAs() does
     * not authenticate and the middleware answers 401 rather than 403.
     */
    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    private function createUser(): User
    {
        return User::query()->forceCreate([
            'name' => 'User '.Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }

    private function createPublishedArticle(array $overrides = []): BlogArticle
    {
        static $categoryCounter = 0;
        $categoryCounter++;
        
        return BlogArticle::create(array_merge([
            'title' => 'Test Article ' . $categoryCounter,
            'slug' => 'test-article-' . $categoryCounter,
            'body' => '<p>Body</p>',
            'excerpt' => 'Excerpt',
            'status' => 'published',
            'published_at' => now()->subDay(),
            'blog_category_id' => BlogCategory::create(['name' => 'Guides ' . $categoryCounter, 'slug' => 'guides-' . $categoryCounter])->id,
        ], $overrides));
    }

    private function createDraftArticle(): BlogArticle
    {
        static $draftCounter = 0;
        $draftCounter++;
        
        return BlogArticle::create([
            'title' => 'Draft ' . $draftCounter,
            'slug' => 'draft-' . $draftCounter,
            'body' => '<p>Draft</p>',
            'status' => 'draft',
            'blog_category_id' => BlogCategory::create(['name' => 'Guides ' . $draftCounter, 'slug' => 'guides-draft-' . $draftCounter])->id,
        ]);
    }

    public function test_blog_index_returns_published_articles(): void
    {
        $published = $this->createPublishedArticle(['title' => 'Published']);
        $draft = $this->createDraftArticle();

        $response = $this->stateful()->getJson('/api/v1/blog');

        $response->assertOk()
            ->assertJsonPath('data.0.title', 'Published');
        $this->assertFalse($response->json('data') ? collect($response->json('data'))->contains('title', 'Draft') : true);
    }

    public function test_blog_index_excludes_future_articles(): void
    {
        $future = $this->createPublishedArticle([
            'title' => 'Future',
            'published_at' => now()->addWeek(),
        ]);

        $response = $this->stateful()->getJson('/api/v1/blog');

        $this->assertFalse(collect($response->json('data'))->contains('title', 'Future'));
    }

    public function test_category_page_returns_articles_in_category(): void
    {
        $cat1 = BlogCategory::create(['name' => 'Cat1', 'slug' => 'cat1']);
        $cat2 = BlogCategory::create(['name' => 'Cat2', 'slug' => 'cat2']);
        $this->createPublishedArticle(['title' => 'In Cat1', 'blog_category_id' => $cat1->id]);
        $this->createPublishedArticle(['title' => 'In Cat2', 'blog_category_id' => $cat2->id]);

        $response = $this->stateful()->getJson('/api/v1/blog/categories/cat1');

        $response->assertOk()
            ->assertJsonPath('category.slug', 'cat1')
            ->assertJsonPath('articles.0.title', 'In Cat1');
        $this->assertFalse($response->json('articles') ? collect($response->json('articles'))->contains('title', 'In Cat2') : true);
    }

    public function test_category_404s_on_unknown_slug(): void
    {
        $this->stateful()->getJson('/api/v1/blog/categories/unknown')->assertNotFound();
    }

    public function test_article_page_returns_published_article(): void
    {
        $article = $this->createPublishedArticle();

        $response = $this->stateful()->getJson("/api/v1/blog/{$article->slug}");

        $response->assertOk()
            ->assertJsonPath('article.title', $article->title)
            ->assertJsonPath('article.body', $article->body);
    }

    public function test_article_404s_on_draft_or_future(): void
    {
        $draft = $this->createDraftArticle();
        $future = $this->createPublishedArticle(['published_at' => now()->addWeek()]);

        $this->stateful()->getJson("/api/v1/blog/{$draft->slug}")->assertNotFound();
        $this->stateful()->getJson("/api/v1/blog/{$future->slug}")->assertNotFound();
    }

    public function test_article_increments_views_on_view(): void
    {
        $article = $this->createPublishedArticle(['views' => 5]);

        $this->stateful()->getJson("/api/v1/blog/{$article->slug}");

        $this->assertEquals(6, $article->fresh()->views);
    }

    public function test_category_increments_views_on_view(): void
    {
        $category = BlogCategory::create(['name' => 'Guides', 'slug' => 'guides-test', 'views' => 10]);
        $this->createPublishedArticle(['blog_category_id' => $category->id]);

        $response = $this->stateful()->getJson('/api/v1/blog/categories/guides-test');
        
        $response->assertOk();
        
        $category->refresh();
        
        $this->assertEquals(11, $category->views);
    }
}