<?php

use Ai\AiAgent\Models\AiAgent;
use Ai\AiAgent\Models\AiAgentChunk;
use App\HelpCenter\Models\HcArticle;
use App\Models\User;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function statefulAiIngest()
{
    $csrfToken = 'test-csrf-token';

    return test()
        ->withSession(['_token' => $csrfToken])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', $csrfToken);
}

function createAiIngestAdmin(): User
{
    $user = User::query()->forceCreate([
        'name' => 'AI Ingest '.Str::random(6),
        'username' => Str::lower(Str::random(10)),
        'email' => Str::random(8).'@example.test',
        'password' => bcrypt('password'),
        'email_verified_at' => now(),
    ]);

    $user->permissions()->attach(
        Permission::query()->firstOrCreate(['name' => 'ai_agent.update']),
    );

    return $user;
}

function seedHcArticleForIngest(): HcArticle
{
    return HcArticle::query()->create([
        'title' => 'Ingest me',
        'body' => '<p>Knowledge body</p>',
        'slug' => 'ingest-me-'.Str::random(6),
        'draft' => false,
        'scan_pending' => false,
    ]);
}

test('admin can ingest article onto default ai agent pivot', function () {
    Queue::fake();

    $admin = createAiIngestAdmin();
    $article = seedHcArticleForIngest();
    $agent = AiAgent::query()->firstOrCreate(
        ['name' => 'Default'],
        ['enabled' => true],
    );

    statefulAiIngest()
        ->actingAs($admin)
        ->postJson('/api/v1/lc/ai-agent/articles/ingest', [
            'articleIds' => [$article->id],
        ])
        ->assertOk();

    expect($agent->articles()->where('articles.id', $article->id)->exists())->toBeTrue();
    expect($article->fresh()->scan_pending)->toBeTrue();
});

test('admin can uningest article and detach pivot', function () {
    $admin = createAiIngestAdmin();
    $article = seedHcArticleForIngest();
    $agent = AiAgent::query()->firstOrCreate(
        ['name' => 'Default'],
        ['enabled' => true],
    );
    $agent->articles()->syncWithoutDetaching([$article->id]);
    $article->update(['scan_pending' => true]);

    if (Schema::hasTable('ai_agent_chunks')) {
        $row = [
            'chunkable_type' => HcArticle::MODEL_TYPE,
            'chunkable_id' => $article->id,
            'content' => 'chunk',
            'created_at' => now(),
            'updated_at' => now(),
        ];
        if (Schema::hasColumn('ai_agent_chunks', 'content_hash')) {
            $row['content_hash'] = 'testhash';
        }
        DB::table('ai_agent_chunks')->insert($row);
    }

    statefulAiIngest()
        ->actingAs($admin)
        ->postJson('/api/v1/lc/ai-agent/articles/uningest', [
            'articleIds' => [$article->id],
        ])
        ->assertOk();

    expect($agent->articles()->where('articles.id', $article->id)->exists())->toBeFalse();
    expect(
        AiAgentChunk::query()->where('chunkable_id', $article->id)->exists(),
    )->toBeFalse();
    expect($article->fresh()->scan_pending)->toBeFalse();
});
