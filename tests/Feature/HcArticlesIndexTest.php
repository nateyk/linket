<?php

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use App\Models\User;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(DatabaseTransactions::class);

function statefulHcArticles(): TestCase
{
    $csrfToken = 'test-csrf-token';

    /** @var TestCase $test */
    $test = test();

    return $test->withSession(['_token' => $csrfToken])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', $csrfToken);
}

function createHcArticlesAgent(): User
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

test('agent can list help center articles that belong to categories', function () {
    $agent = createHcArticlesAgent();

    $category = HcCategory::query()->create([
        'name' => 'Getting Started',
        'position' => 1,
    ]);
    $section = HcCategory::query()->create([
        'name' => 'Basics',
        'parent_id' => $category->id,
        'position' => 1,
    ]);
    $article = HcArticle::query()->create([
        'title' => 'Reset your password',
        'body' => '<p>Steps</p>',
        'slug' => 'reset-your-password-'.Str::random(4),
        'draft' => false,
        'author_id' => $agent->id,
    ]);
    $article->categories()->attach([
        $category->id => ['position' => 1],
        $section->id => ['position' => 1],
    ]);

    statefulHcArticles()
        ->actingAs($agent)
        ->getJson('/api/v1/hc/articles')
        ->assertOk()
        ->assertJsonPath('pagination.data.0.id', $article->id)
        ->assertJsonPath('pagination.data.0.title', $article->title);
});
