<?php

namespace Tests\Feature\Help;

use App\Models\User;
use Common\Help\Models\HelpArticle;
use Common\Help\Models\HelpCategory;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminHelpTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_can_create_category(): void
    {
        $this->actingAs($this->createAdmin());

        $response = $this->stateful()->postJson('/api/v1/admin/help/categories', [
            'name' => 'Getting Started',
        ]);

        $response->assertCreated()->assertJsonPath('data.slug', 'getting-started');
    }

    public function test_admin_can_sort_categories(): void
    {
        $this->actingAs($this->createAdmin());
        $a = HelpCategory::create(['name' => 'Alpha']);
        $b = HelpCategory::create(['name' => 'Beta']);

        $response = $this->stateful()->postJson('/api/v1/admin/help/categories/sort', [
            'ids' => [$b->id, $a->id],
        ]);

        $response->assertOk();
        $this->assertEquals(1, $b->fresh()->sort_id);
        $this->assertEquals(2, $a->fresh()->sort_id);
    }

    public function test_cannot_delete_category_with_articles(): void
    {
        $this->actingAs($this->createAdmin());
        $category = HelpCategory::create(['name' => 'General']);
        HelpArticle::create([
            'title' => 'How to start',
            'body' => '<p>Body</p>',
            'short_description' => 'Short',
            'help_category_id' => $category->id,
        ]);

        $response = $this->stateful()->deleteJson("/api/v1/admin/help/categories/{$category->id}");

        $response->assertStatus(422);
        $this->assertDatabaseHas('help_categories', ['id' => $category->id]);
    }

    public function test_admin_can_create_article(): void
    {
        $this->actingAs($this->createAdmin());
        $category = HelpCategory::create(['name' => 'General']);

        $response = $this->stateful()->postJson('/api/v1/admin/help/articles', [
            'title' => 'How to start',
            'body' => '<p>Body</p>',
            'short_description' => 'Short description',
            'help_category_id' => $category->id,
        ]);

        $response->assertCreated()->assertJsonPath('data.slug', 'how-to-start');
    }

    public function test_admin_article_responses_include_body(): void
    {
        $this->actingAs($this->createAdmin());
        $category = HelpCategory::create(['name' => 'General']);
        $article = HelpArticle::create([
            'title' => 'How to start',
            'body' => '<p>Body</p>',
            'short_description' => 'Short',
            'help_category_id' => $category->id,
        ]);

        $this->stateful()->getJson('/api/v1/admin/help/articles')
            ->assertOk()
            ->assertJsonPath('data.0.body', '<p>Body</p>');

        $this->stateful()->getJson("/api/v1/admin/help/articles/{$article->id}")
            ->assertOk()
            ->assertJsonPath('data.body', '<p>Body</p>');
    }

    public function test_admin_can_update_and_delete_article(): void
    {
        $this->actingAs($this->createAdmin());
        $category = HelpCategory::create(['name' => 'General']);
        $article = HelpArticle::create([
            'title' => 'How to start',
            'body' => '<p>Body</p>',
            'short_description' => 'Short',
            'help_category_id' => $category->id,
        ]);

        $this->stateful()->patchJson("/api/v1/admin/help/articles/{$article->id}", [
            'title' => 'Updated title',
            'slug' => $article->slug,
            'body' => '<p>Updated</p>',
            'short_description' => 'Short',
            'help_category_id' => $category->id,
        ])->assertOk();

        $this->assertSame('Updated title', $article->fresh()->title);

        $this->stateful()->deleteJson("/api/v1/admin/help/articles/{$article->id}")->assertOk();
        $this->assertDatabaseMissing('help_articles', ['id' => $article->id]);
    }

    public function test_guest_cannot_create_article(): void
    {
        $this->stateful()->postJson('/api/v1/admin/help/articles', [])->assertForbidden();
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        $this->flushSession();

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
}
