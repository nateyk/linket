<?php

namespace Tests\Feature;

use App\Models\User;
use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminBlogArticleApiTest extends TestCase
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

    private function createAdmin(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'Admin '.Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $user->permissions()->attach(
            Permission::query()->firstOrCreate(['name' => 'admin']),
        );

        return $user;
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

    private function createArticle(array $overrides = []): BlogArticle
    {
        return BlogArticle::create(
            array_merge(
                [
                    'title' => 'Article '.Str::random(6),
                    'body' => '<p>Body</p>',
                    'blog_category_id' => BlogCategory::create([
                        'name' => 'Guides',
                    ])->id,
                ],
                $overrides,
            ),
        );
    }

    public function test_guests_cannot_list_articles(): void
    {
        // Guests are unauthenticated (401); authenticated non-admins are
        // forbidden (403). Matches AdminProductReviewsTest.
        $this->getJson('/api/v1/blog/admin/articles')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_articles(): void
    {
        $this->stateful()
            ->actingAs($this->createUser())
            ->getJson('/api/v1/blog/admin/articles')
            ->assertForbidden();
    }

    public function test_admin_can_create_an_article(): void
    {
        $category = BlogCategory::create(['name' => 'Guides']);

        $response = $this->stateful()->actingAs($this->createAdmin())
            ->postJson('/api/v1/blog/admin/articles', [
                'title' => 'First post',
                'body' => '<p>Hello</p>',
                'blog_category_id' => $category->id,
            ]);

        $response->assertCreated()
            ->assertJsonPath('article.title', 'First post')
            ->assertJsonPath('article.status', 'draft');
    }

    public function test_creating_an_article_sanitises_the_body(): void
    {
        $category = BlogCategory::create(['name' => 'Guides']);

        $response = $this->stateful()->actingAs($this->createAdmin())
            ->postJson('/api/v1/blog/admin/articles', [
                'title' => 'XSS attempt',
                'body' => '<p>ok</p><script>alert(1)</script>',
                'blog_category_id' => $category->id,
            ]);

        $this->assertStringNotContainsString(
            '<script',
            $response->json('article.body'),
        );
    }

    public function test_publishing_requires_a_valid_date(): void
    {
        $category = BlogCategory::create(['name' => 'Guides']);

        $this->stateful()->actingAs($this->createAdmin())
            ->postJson('/api/v1/blog/admin/articles', [
                'title' => 'Bad date',
                'body' => '<p>x</p>',
                'blog_category_id' => $category->id,
                'status' => 'published',
                'published_at' => 'not-a-date',
            ])
            ->assertJsonValidationErrors('published_at');
    }

    public function test_creating_an_article_requires_a_real_category(): void
    {
        $this->stateful()->actingAs($this->createAdmin())
            ->postJson('/api/v1/blog/admin/articles', [
                'title' => 'Orphan',
                'body' => '<p>x</p>',
                'blog_category_id' => 999999,
            ])
            ->assertJsonValidationErrors('blog_category_id');
    }

    public function test_admin_can_update_an_article(): void
    {
        $article = $this->createArticle();

        $this->stateful()->actingAs($this->createAdmin())
            ->putJson("/api/v1/blog/admin/articles/{$article->id}", [
                'title' => 'Updated title',
            ])
            ->assertOk()
            ->assertJsonPath('article.title', 'Updated title');
    }

    public function test_admin_can_delete_an_article(): void
    {
        $article = $this->createArticle();

        $this->stateful()->actingAs($this->createAdmin())
            ->deleteJson("/api/v1/blog/admin/articles/{$article->id}")
            ->assertNoContent();

        $this->assertNull(BlogArticle::find($article->id));
    }

    public function test_index_returns_articles_with_their_category(): void
    {
        $article = $this->createArticle(['title' => 'Included']);

        $this->stateful()->actingAs($this->createAdmin())
            ->getJson('/api/v1/blog/admin/articles')
            ->assertOk()
            ->assertJsonPath('data.0.id', $article->id)
            ->assertJsonPath(
                'data.0.category.name',
                'Guides',
            );
    }
}