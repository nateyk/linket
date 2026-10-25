<?php

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use App\Models\User;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(DatabaseTransactions::class);

function statefulHcManagerCategories(): TestCase
{
    $csrfToken = 'test-csrf-token';

    /** @var TestCase $test */
    $test = test();

    return $test->withSession(['_token' => $csrfToken])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', $csrfToken);
}

function createHcManagerAgent(): User
{
    $user = User::query()->forceCreate([
        'name' => 'Agent '.Str::random(6),
        'username' => Str::lower(Str::random(10)),
        'email' => Str::random(8).'@example.test',
        'password' => bcrypt('password'),
        'email_verified_at' => now(),
    ]);

    $user->permissions()->attach(
        Permission::query()->firstOrCreate(['name' => 'articles.update']),
    );

    return $user;
}

test('manager root categories aggregate article counts from sections', function () {
    $agent = createHcManagerAgent();

    $category = HcCategory::query()->create([
        'name' => 'Demo category '.Str::random(4),
        'position' => 1,
    ]);
    $section = HcCategory::query()->create([
        'name' => 'Demo section',
        'parent_id' => $category->id,
        'position' => 1,
    ]);
    $article = HcArticle::query()->create([
        'title' => 'Demo article',
        'body' => '<p>Body</p>',
        'slug' => 'demo-article-'.Str::random(6),
        'draft' => false,
        'author_id' => $agent->id,
    ]);
    $section->articles()->attach($article->id, ['position' => 1]);

    $payload = statefulHcManagerCategories()
        ->actingAs($agent)
        ->getJson('/api/v1/hc/manager/categories')
        ->json('categories');

    $row = collect($payload)->firstWhere('id', $category->id);
    expect($row)->not->toBeNull()
        ->and($row['articles_count'])->toBe(1)
        ->and($row['sections_count'])->toBe(1);
});

test('tag sync only accepts help center taggable types', function () {
    $agent = createHcManagerAgent();

    statefulHcManagerCategories()
        ->actingAs($agent)
        ->postJson('/api/v1/hc/taggables/sync-tags', [
            'taggableIds' => [1],
            'taggableType' => 'link',
            'tags' => ['demo'],
        ])
        ->assertUnprocessable();
});
