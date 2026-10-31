<?php

namespace Tests\Feature;

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use App\Models\User;
use Common\Files\FileEntry;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class HcDraftVisibilityAndPermissionsTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedGuestHelpCenterRole();
    }

    public function test_guest_cannot_show_draft_article(): void
    {
        $article = $this->seedArticle(draft: true);

        $this->stateful()
            ->getJson("/api/v1/hc/articles/{$article->id}")
            ->assertForbidden();
    }

    public function test_guest_search_excludes_draft_articles(): void
    {
        $unique = 'DraftUnique'.Str::random(6);
        $this->seedArticle(draft: true, title: "{$unique} hidden draft");
        $published = $this->seedArticle(draft: false, title: "{$unique} published");

        $response = $this->stateful()
            ->getJson('/api/v1/search/articles?query='.urlencode($unique))
            ->assertOk();

        $payload = json_encode($response->json());
        $this->assertStringContainsString($published->title, $payload);
        $this->assertStringNotContainsString('hidden draft', $payload);
    }

    public function test_category_nav_excludes_draft_articles_for_guests(): void
    {
        ['category' => $category, 'section' => $section] = $this->seedCategoryTree();
        $draft = $this->attachArticle($section, draft: true, title: 'Secret draft nav');
        $published = $this->attachArticle($section, draft: false, title: 'Published nav article');

        // Public article page loads categoryNav via article loader
        $nav = $this->stateful()
            ->getJson("/api/v1/hc/articles/{$published->id}")
            ->assertOk()
            ->json('categoryNav');

        $titles = collect($nav)
            ->flatMap(fn (array $section) => collect($section['articles'] ?? [])->pluck('title'))
            ->all();

        $this->assertContains('Published nav article', $titles);
        $this->assertNotContains('Secret draft nav', $titles);
        $this->assertDatabaseHas('articles', ['id' => $draft->id, 'draft' => true]);
    }

    public function test_sidenav_excludes_draft_articles_for_guests(): void
    {
        ['category' => $category, 'section' => $section] = $this->seedCategoryTree();
        $this->attachArticle($section, draft: true, title: 'Draft in sidenav');
        $this->attachArticle($section, draft: false, title: 'Live in sidenav');

        $sections = $this->stateful()
            ->getJson("/api/v1/hc/sidenav/{$category->id}")
            ->assertOk()
            ->json('sections');

        $titles = collect($sections)
            ->flatMap(fn (array $section) => collect($section['articles'] ?? [])->pluck('title'))
            ->all();

        $this->assertContains('Live in sidenav', $titles);
        $this->assertNotContains('Draft in sidenav', $titles);
    }

    public function test_guest_cannot_download_draft_article_attachment(): void
    {
        $article = $this->seedArticle(draft: true);
        $entry = FileEntry::query()->create([
            'name' => 'secret.pdf',
            'file_name' => Str::random(20),
            'file_size' => 128,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'disk_prefix' => 'uploads',
            'workspace_id' => 0,
        ]);
        $article->attachments()->attach($entry->id);

        $response = $this->stateful()
            ->getJson("/api/v1/hc/articles/{$article->id}/download/{$entry->hash}");

        $this->assertTrue(
            in_array($response->status(), [403, 404], true),
            'Draft attachment download must be denied, got '.$response->status(),
        );
    }

    public function test_regular_user_cannot_create_or_publish_articles(): void
    {
        $user = User::factory()->create();
        $this->grantPermission($user, 'articles.view');

        ['section' => $section] = $this->seedCategoryTree();

        $this->stateful()
            ->actingAs($user)
            ->postJson('/api/v1/hc/articles', [
                'title' => 'Unauthorized publish',
                'body' => '<p>Nope</p>',
                'draft' => false,
                'author_id' => $user->id,
                'sections' => [$section->id],
            ])
            ->assertForbidden();
    }

    public function test_agent_can_create_draft_and_publish_article(): void
    {
        $agent = $this->createHcAgent();
        ['section' => $section] = $this->seedCategoryTree();

        $create = $this->stateful()
            ->actingAs($agent)
            ->postJson('/api/v1/hc/articles', [
                'title' => 'Agent draft article',
                'body' => '<p>Draft body with <strong>formatting</strong></p>',
                'draft' => true,
                'author_id' => $agent->id,
                'sections' => [$section->id],
            ])
            ->assertSuccessful();

        $articleId = $create->json('article.id');
        $this->assertNotNull($articleId);
        $this->assertDatabaseHas('articles', ['id' => $articleId, 'draft' => true]);

        $this->stateful()
            ->actingAs($agent)
            ->putJson("/api/v1/hc/articles/{$articleId}", [
                'title' => 'Agent published article',
                'body' => '<p>Published body</p>',
                'draft' => false,
                'sections' => [$section->id],
            ])
            ->assertSuccessful();

        $this->assertDatabaseHas('articles', ['id' => $articleId, 'draft' => false]);
    }

    public function test_manager_can_reorder_articles_in_section(): void
    {
        $agent = $this->createHcAgent();
        ['section' => $section] = $this->seedCategoryTree();
        $first = $this->attachArticle($section, draft: false, title: 'First', position: 1);
        $second = $this->attachArticle($section, draft: false, title: 'Second', position: 2);

        $this->stateful()
            ->actingAs($agent)
            ->postJson("/api/v1/hc/manager/sections/{$section->id}/articles/reorder", [
                'ids' => [$second->id, $first->id],
            ])
            ->assertSuccessful();

        $this->assertDatabaseHas('category_article', [
            'category_id' => $section->id,
            'article_id' => $second->id,
            'position' => 1,
        ]);
        $this->assertDatabaseHas('category_article', [
            'category_id' => $section->id,
            'article_id' => $first->id,
            'position' => 2,
        ]);
    }

    private function seedGuestHelpCenterRole(): void
    {
        $guestRole = Role::query()->firstOrCreate(
            ['guests' => true],
            [
                'name' => 'Guests',
                'type' => 'users',
                'internal' => true,
                'default' => false,
            ],
        );

        foreach (['articles.view', 'conversations.create', 'files.create'] as $name) {
            $permission = Permission::query()->firstOrCreate(['name' => $name]);
            if (! $guestRole->permissions()->where('permissions.id', $permission->id)->exists()) {
                $guestRole->permissions()->attach($permission->id);
            }
        }

        app()->forgetInstance('guestRole');
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    private function grantPermission(User $user, string $name): void
    {
        $permission = Permission::query()->firstOrCreate(['name' => $name]);
        $user->permissions()->syncWithoutDetaching([$permission->id]);
    }

    private function createHcAgent(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'HC Agent '.Str::random(4),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
            'type' => 'agent',
        ]);

        $this->grantPermission($user, 'articles.update');
        $this->grantPermission($user, 'articles.create');
        $this->grantPermission($user, 'articles.view');

        $role = Role::query()->firstOrCreate(
            ['name' => 'Agents'],
            [
                'type' => 'agents',
                'default' => false,
                'guests' => false,
                'internal' => true,
                'agents' => true,
            ],
        );
        if (isset($role->agents) && ! $role->agents) {
            $role->update(['agents' => true]);
        }
        $user->roles()->syncWithoutDetaching([$role->id]);

        return $user->fresh(['roles', 'permissions']);
    }

    /**
     * @return array{category: HcCategory, section: HcCategory}
     */
    private function seedCategoryTree(): array
    {
        $category = HcCategory::query()->create([
            'name' => 'E2E Category '.Str::random(4),
            'position' => 1,
        ]);
        $section = HcCategory::query()->create([
            'name' => 'E2E Section',
            'parent_id' => $category->id,
            'position' => 1,
        ]);

        return compact('category', 'section');
    }

    private function seedArticle(bool $draft, ?string $title = null): HcArticle
    {
        ['section' => $section] = $this->seedCategoryTree();

        return $this->attachArticle($section, $draft, $title ?? 'Article '.Str::random(4));
    }

    private function attachArticle(
        HcCategory $section,
        bool $draft,
        string $title,
        int $position = 1,
    ): HcArticle {
        $article = HcArticle::query()->create([
            'title' => $title,
            'body' => '<p>Body for '.$title.'</p>',
            'slug' => Str::slug($title).'-'.Str::random(4),
            'draft' => $draft,
        ]);
        $article->categories()->attach([
            $section->id => ['position' => $position],
        ]);
        if ($section->parent_id) {
            $article->categories()->attach([
                $section->parent_id => ['position' => $position],
            ]);
        }

        return $article;
    }
}
