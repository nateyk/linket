<?php

use App\Models\User;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function statefulAiSettings()
{
    $csrfToken = 'test-csrf-token';

    return test()
        ->withSession(['_token' => $csrfToken])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', $csrfToken);
}

function createAiAgentAdmin(): User
{
    $user = User::query()->forceCreate([
        'name' => 'AI Admin '.Str::random(6),
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

test('guest cannot load ai agent settings', function () {
    statefulAiSettings()
        ->getJson('/api/v1/lc/ai-agent/settings')
        ->assertForbidden();
});

test('admin can load ai agent settings', function () {
    $admin = createAiAgentAdmin();

    statefulAiSettings()
        ->actingAs($admin)
        ->getJson('/api/v1/lc/ai-agent/settings')
        ->assertOk()
        ->assertJsonStructure(['settings', 'flows']);
});
