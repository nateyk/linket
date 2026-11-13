<?php

namespace Tests\Feature;

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use App\Core\SitemapGenerator;
use App\Models\User;
use Common\Files\FileEntry;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Common\Tags\Tag;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Livechat\Widget\Controllers\WidgetHelpCenterController;
use Tests\TestCase;

class HcContentVisibilitySecurityTest extends TestCase
{
    use DatabaseTransactions;

    private Role $guestRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->guestRole = Role::query()->firstOrCreate(
            ['guests' => true],
            ['name' => 'Guests', 'type' => 'users', 'internal' => true, 'default' => false],
        );

        $permission = Permission::query()->firstOrCreate(['name' => 'articles.view']);
        $this->guestRole->permissions()->syncWithoutDetaching([$permission->id]);
        app()->forgetInstance('guestRole');
    }

    public function test_guest_cannot_retrieve_role_restricted_article_in_any_public_read_api(): void
    {
        $role = $this->privateRole();
        [, $section] = $this->categoryTree();
        $term = 'PrivateHelp'.Str::random(8);
        $article = $this->article($section, $term, roleId: $role->id);

        $entry = FileEntry::query()->create([
            'name' => 'restricted.pdf',
            'file_name' => Str::random(20),
            'file_size' => 128,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'disk_prefix' => 'uploads',
            'workspace_id' => 0,
        ]);
        $article->attachments()->attach($entry->id);

        $this->stateful()->getJson("/api/v1/hc/articles/{$article->id}")
            ->assertForbidden();
        $this->stateful()->getJson("/api/v1/hc/articles/{$article->id}?loader=updateArticle")
            ->assertForbidden();
        $this->stateful()->getJson("/api/v1/hc/articles/{$article->id}/download/{$entry->hash}")
            ->assertForbidden();
        $this->stateful()->getJson('/api/v1/hc/articles')
            ->assertOk()->assertDontSee($term);
        // The search response intentionally echoes the search query. Only results
        // are sensitive, so assert against pagination rather than response text.
        $this->stateful()->getJson('/api/v1/search/articles?query='.urlencode($term))
            ->assertOk()->assertJsonCount(0, 'pagination.data');
    }

    public function test_article_editor_payload_is_not_public_even_for_published_articles(): void
    {
        [, $section] = $this->categoryTree();
        $article = $this->article($section, 'Published '.Str::random(8));

        $this->stateful()->getJson("/api/v1/hc/articles/{$article->id}")
            ->assertOk();
        $this->stateful()->getJson("/api/v1/hc/articles/{$article->id}?loader=updateArticle")
            ->assertForbidden();
    }

    public function test_guest_role_can_access_explicitly_guest_visible_article(): void
    {
        [, $section] = $this->categoryTree();
        $article = $this->article($section, 'Guest visible '.Str::random(8), roleId: $this->guestRole->id);

        $this->stateful()->getJson("/api/v1/hc/articles/{$article->id}")
            ->assertOk()->assertJsonPath('article.id', $article->id);
    }

    public function test_only_matching_authenticated_role_can_read_restricted_article(): void
    {
        $role = $this->privateRole();
        [, $section] = $this->categoryTree();
        $article = $this->article($section, 'Roles '.Str::random(8), roleId: $role->id);
        $user = User::factory()->create();
        $user->permissions()->syncWithoutDetaching([
            Permission::query()->firstOrCreate(['name' => 'articles.view'])->id,
        ]);

        $this->stateful()->actingAs($user)
            ->getJson("/api/v1/hc/articles/{$article->id}")
            ->assertForbidden();

        $user->roles()->syncWithoutDetaching([$role->id]);
        $user->unsetRelation('roles');

        $this->stateful()->actingAs($user)
            ->getJson("/api/v1/hc/articles/{$article->id}")
            ->assertOk();
    }

    public function test_role_restricted_root_and_its_public_section_are_not_public(): void
    {
        $role = $this->privateRole();
        [$root, $section] = $this->categoryTree(rootRoleId: $role->id);
        $article = $this->article($section, 'Secret category '.Str::random(8));

        $this->stateful()->getJson("/api/v1/hc/categories/{$root->id}")
            ->assertForbidden();
        $this->stateful()->getJson("/api/v1/hc/categories/{$section->id}")
            ->assertForbidden();
        $this->stateful()->getJson("/api/v1/hc/sidenav/{$root->id}")
            ->assertForbidden();
        $this->stateful()->getJson("/api/v1/hc/articles/{$article->id}")
            ->assertForbidden();

        $this->assertFalse(HcCategory::query()
            ->filterByVisibleToRole()
            ->whereKey($section->id)
            ->exists());
    }

    public function test_public_root_does_not_expose_articles_in_private_section(): void
    {
        $role = $this->privateRole();
        [$root, $section] = $this->categoryTree(sectionRoleId: $role->id);
        $title = 'SectionSecret'.Str::random(8);
        $article = $this->article($section, $title);

        $this->stateful()->getJson("/api/v1/hc/articles/{$article->id}")
            ->assertForbidden();
        $this->stateful()->getJson("/api/v1/hc/sidenav/{$root->id}")
            ->assertOk()->assertDontSee($title);
        $this->stateful()->getJson('/api/v1/search/articles?query='.urlencode($title))
            ->assertOk()->assertJsonCount(0, 'pagination.data');
    }

    public function test_tagged_private_content_cannot_bypass_search_visibility_filters(): void
    {
        $role = $this->privateRole();
        [, $section] = $this->categoryTree();
        $term = 'TaggedHelp'.Str::random(8);
        $private = $this->article($section, $term.' private', roleId: $role->id);
        $public = $this->article($section, $term.' public');
        $tag = Tag::query()->create([
            'name' => Str::lower('hctag'.Str::random(10)),
            'type' => 'custom',
        ]);
        $section->tags()->sync([$tag->id]);
        $public->tags()->sync([$tag->id]);

        $response = $this->stateful()
            ->getJson('/api/v1/search/articles?query='.urlencode($term).'&tag='.urlencode($tag->name))
            ->assertOk();
        $payload = json_encode($response->json());
        $this->assertStringContainsString($public->title, $payload);
        $this->assertStringNotContainsString($private->title, $payload);
    }

    public function test_livechat_popular_article_list_excludes_drafts_and_role_restricted_content(): void
    {
        $role = $this->privateRole();
        [, $section] = $this->categoryTree();
        $private = $this->article($section, 'WidgetPrivate'.Str::random(8), roleId: $role->id);
        $draft = $this->article($section, 'WidgetDraft'.Str::random(8), draft: true);
        $public = $this->article($section, 'WidgetPublic'.Str::random(8));
        $private->update(['views' => 999998]);
        $draft->update(['views' => 999999]);
        $public->update(['views' => 999997]);

        $payload = app(WidgetHelpCenterController::class)->homeArticleList()->getData(true);
        $titles = collect($payload['articles'])->pluck('title');

        $this->assertContains($public->title, $titles);
        $this->assertNotContains($private->title, $titles);
        $this->assertNotContains($draft->title, $titles);
    }

    public function test_sitemap_never_indexes_private_or_draft_content_even_for_agents(): void
    {
        $role = $this->privateRole();
        [$root, $section] = $this->categoryTree();
        $public = $this->article($section, 'Sitemap public '.Str::random(8));
        $private = $this->article($section, 'Sitemap private '.Str::random(8), roleId: $role->id);
        $draft = $this->article($section, 'Sitemap draft '.Str::random(8), draft: true);
        [$privateRoot, $privateSection] = $this->categoryTree(rootRoleId: $role->id);
        $privatePlacement = $this->article($privateSection, 'Sitemap private section '.Str::random(8));

        $agent = User::query()->forceCreate([
            'name' => 'HC agent '.Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(10).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
            'type' => 'agent',
        ]);
        $this->actingAs($agent);
        $this->assertTrue($agent->isAgent());

        $generator = new class extends SitemapGenerator {
            public function queriesForTesting(): array
            {
                return $this->getAppQueries();
            }
        };
        [$articles, $categories] = $generator->queriesForTesting();
        $articleIds = $articles->pluck('id')->all();
        $categoryIds = $categories->pluck('id')->all();

        $this->assertContains($public->id, $articleIds);
        $this->assertNotContains($private->id, $articleIds);
        $this->assertNotContains($draft->id, $articleIds);
        $this->assertNotContains($privatePlacement->id, $articleIds);
        $this->assertContains($root->id, $categoryIds);
        $this->assertNotContains($privateRoot->id, $categoryIds);
        $this->assertNotContains($privateSection->id, $categoryIds);
    }

    private function privateRole(): Role
    {
        return Role::query()->create([
            'name' => 'HC restricted '.Str::random(10),
            'type' => 'users',
            'default' => false,
            'guests' => false,
            'internal' => false,
        ]);
    }

    /** @return array{HcCategory, HcCategory} */
    private function categoryTree(?int $rootRoleId = null, ?int $sectionRoleId = null): array
    {
        $root = HcCategory::query()->create([
            'name' => 'HC test root '.Str::random(10),
            'position' => 1,
            'visible_to_role' => $rootRoleId,
        ]);
        $section = HcCategory::query()->create([
            'name' => 'HC test section '.Str::random(10),
            'parent_id' => $root->id,
            'position' => 1,
            'visible_to_role' => $sectionRoleId,
        ]);

        return [$root, $section];
    }

    private function article(HcCategory $section, string $title, ?int $roleId = null, bool $draft = false): HcArticle
    {
        $article = HcArticle::query()->create([
            'title' => $title,
            'body' => '<p>Help text</p>',
            'slug' => Str::slug($title),
            'draft' => $draft,
            'visible_to_role' => $roleId,
        ]);
        $article->categories()->attach([
            $section->id => ['position' => 1],
            $section->parent_id => ['position' => 1],
        ]);

        return $article;
    }

    private function stateful(): static
    {
        return $this->withSession(['_token' => 'hc-test-csrf'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'hc-test-csrf');
    }
}
