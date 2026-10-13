<?php

namespace Tests\Feature;

use App\Models\User;
use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminBlogCategoryApiTest extends TestCase
{
    use DatabaseTransactions;

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

    public function test_guests_cannot_list_categories(): void
    {
        $this->getJson('/api/v1/blog/admin/categories')->assertUnauthorized();
    }

    public function test_non_admin_cannot_list_categories(): void
    {
        $this->stateful()
            ->actingAs($this->createUser())
            ->getJson('/api/v1/blog/admin/categories')
            ->assertForbidden();
    }

    public function test_admin_can_create_a_category(): void
    {
        $response = $this->stateful()->actingAs($this->createAdmin())
            ->postJson('/api/v1/blog/admin/categories', [
                'name' => 'Guides',
            ]);

        $response->assertCreated()
            ->assertJsonPath('category.name', 'Guides')
            ->assertJsonPath('category.slug', 'guides');
    }

    public function test_duplicate_names_produce_unique_slugs(): void
    {
        $a = $this->stateful()->actingAs($this->createAdmin())
            ->postJson('/api/v1/blog/admin/categories', ['name' => 'Getting Started']);
        $b = $this->stateful()->actingAs($this->createAdmin())
            ->postJson('/api/v1/blog/admin/categories', ['name' => 'Getting Started']);

        $this->assertSame('getting-started', $a->json('category.slug'));
        $this->assertNotEquals($a->json('category.slug'), $b->json('category.slug'));
    }

    public function test_admin_can_update_a_category(): void
    {
        $category = BlogCategory::create(['name' => 'Old']);

        $this->stateful()->actingAs($this->createAdmin())
            ->putJson("/api/v1/blog/admin/categories/{$category->id}", [
                'name' => 'New',
            ])
            ->assertOk()
            ->assertJsonPath('category.name', 'New');
    }

    public function test_destroying_empty_category_succeeds(): void
    {
        $category = BlogCategory::create(['name' => 'Empty']);

        $this->stateful()->actingAs($this->createAdmin())
            ->deleteJson("/api/v1/blog/admin/categories/{$category->id}")
            ->assertNoContent();

        $this->assertNull(BlogCategory::find($category->id));
    }

    public function test_destroying_non_empty_category_returns_409(): void
    {
        $category = BlogCategory::create(['name' => 'Has Articles']);
        BlogArticle::create([
            'title' => 'An article',
            'body' => '<p>Body</p>',
            'blog_category_id' => $category->id,
        ]);

        $this->stateful()->actingAs($this->createAdmin())
            ->deleteJson("/api/v1/blog/admin/categories/{$category->id}")
            ->assertStatus(409)
            ->assertJsonPath('articles_count', 1);

        $this->assertNotNull(BlogCategory::find($category->id));
    }
}