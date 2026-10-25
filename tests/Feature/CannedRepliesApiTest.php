<?php

use App\CannedReplies\Models\CannedReply;
use App\Models\User;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function statefulCanned()
{
    $csrfToken = 'test-csrf-token';

    return test()
        ->withSession(['_token' => $csrfToken])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', $csrfToken);
}

function createCannedAgent(): User
{
    $user = User::query()->forceCreate([
        'name' => 'Canned Agent '.Str::random(6),
        'username' => Str::lower(Str::random(10)),
        'email' => Str::random(8).'@example.test',
        'password' => bcrypt('password'),
        'email_verified_at' => now(),
    ]);

    $user->permissions()->attach(
        Permission::query()->firstOrCreate(['name' => 'canned_replies.update']),
    );

    return $user;
}

test('agent can list create update and delete canned replies', function () {
    $agent = createCannedAgent();

    statefulCanned()
        ->actingAs($agent)
        ->getJson('/api/v1/helpdesk/canned-replies')
        ->assertOk()
        ->assertJsonStructure(['pagination']);

    $create = statefulCanned()
        ->actingAs($agent)
        ->postJson('/api/v1/helpdesk/canned-replies', [
            'name' => 'Greeting '.Str::random(4),
            'body' => '<p>Hello, thanks for writing in.</p>',
            'shared' => true,
        ])
        ->assertCreated();

    $id = $create->json('cannedReply.id');
    expect($id)->not->toBeNull();

    statefulCanned()
        ->actingAs($agent)
        ->putJson("/api/v1/helpdesk/canned-replies/{$id}", [
            'name' => 'Greeting updated',
            'body' => '<p>Updated body</p>',
            'shared' => false,
        ])
        ->assertOk();

    expect(CannedReply::query()->find($id)?->name)->toBe('Greeting updated');

    statefulCanned()
        ->actingAs($agent)
        ->deleteJson("/api/v1/helpdesk/canned-replies/{$id}")
        ->assertOk();

    expect(CannedReply::query()->find($id))->toBeNull();
});

test('guest cannot list canned replies', function () {
    statefulCanned()
        ->getJson('/api/v1/helpdesk/canned-replies')
        ->assertForbidden();
});
