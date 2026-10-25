<?php

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(DatabaseTransactions::class);

beforeEach(function () {
    seedGuestHelpCenterRole();
});

function seedGuestHelpCenterRole(): void
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

    // guestRole is a singleton — clear cached null/stale instance from earlier bootstraps
    app()->forgetInstance('guestRole');
}

function statefulHcPublic(): TestCase
{
    $csrfToken = 'test-csrf-token';

    /** @var TestCase $test */
    $test = test();

    return $test->withSession(['_token' => $csrfToken])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', $csrfToken);
}

function seedPublishedHcArticle(): array
{
    $category = HcCategory::query()->create([
        'name' => 'Getting Started',
        'position' => 1,
    ]);
    $section = HcCategory::query()->create([
        'name' => 'Basics',
        'parent_id' => $category->id,
        'position' => 1,
    ]);
    $slug = 'public-article-'.Str::random(6);
    $article = HcArticle::query()->create([
        'title' => 'Public help article',
        'body' => '<p>Visible to guests</p>',
        'slug' => $slug,
        'draft' => false,
    ]);
    $article->categories()->attach([
        $section->id => ['position' => 1],
    ]);

    return compact('category', 'section', 'article', 'slug');
}
test('guest can load help center landing', function () {
    seedPublishedHcArticle();

    statefulHcPublic()
        ->getJson('/api/v1/hc')
        ->assertOk()
        ->assertJsonPath('loader', 'hcLandingPage')
        ->assertJsonFragment(['title' => 'Public help article']);
});

test('guest can show a published article', function () {
    ['article' => $article] = seedPublishedHcArticle();

    statefulHcPublic()
        ->getJson("/api/v1/hc/articles/{$article->id}")
        ->assertOk()
        ->assertJsonFragment(['title' => 'Public help article']);
});

test('guest can show a category', function () {
    ['category' => $category] = seedPublishedHcArticle();

    statefulHcPublic()
        ->getJson("/api/v1/hc/categories/{$category->id}")
        ->assertOk()
        ->assertJsonFragment(['name' => 'Getting Started']);
});

test('guest can search published articles', function () {
    seedPublishedHcArticle();

    statefulHcPublic()
        ->getJson('/api/v1/search/articles?query=Public+help')
        ->assertOk()
        ->assertJsonFragment(['title' => 'Public help article']);
});

test('legacy help article slug redirects to hc article', function () {
    ['article' => $article, 'slug' => $slug] = seedPublishedHcArticle();

    $this->get("/help/articles/{$slug}")
        ->assertRedirect("/hc/articles/{$article->id}/{$slug}");
});

test('legacy help category slug redirects to hc category', function () {
    ['category' => $category] = seedPublishedHcArticle();

    $this->get('/help/categories/getting-started')
        ->assertRedirect("/hc/categories/{$category->id}/getting-started");
});
