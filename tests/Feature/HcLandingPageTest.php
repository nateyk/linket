<?php

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(DatabaseTransactions::class);

function statefulHcLanding(): TestCase
{
    $csrfToken = 'test-csrf-token';

    /** @var TestCase $test */
    $test = test();

    return $test->withSession(['_token' => $csrfToken])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', $csrfToken);
}

test('public help center landing api returns categories with section articles', function () {
    $category = HcCategory::query()->create([
        'name' => 'Getting Started',
        'position' => 1,
    ]);
    $section = HcCategory::query()->create([
        'name' => 'Installation',
        'parent_id' => $category->id,
        'position' => 1,
    ]);
    $article = HcArticle::query()->create([
        'title' => 'How to use this documentation?',
        'body' => '<p>Steps</p>',
        'slug' => 'how-to-use-docs-'.Str::random(4),
        'draft' => false,
    ]);
    $article->categories()->attach([
        $section->id => ['position' => 1],
    ]);

    statefulHcLanding()
        ->getJson('/api/v1/hc')
        ->assertOk()
        ->assertJsonPath('loader', 'hcLandingPage')
        ->assertJsonFragment(['title' => 'How to use this documentation?']);
});
