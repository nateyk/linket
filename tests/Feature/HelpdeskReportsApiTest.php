<?php

use App\Models\User;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function statefulReports()
{
    $csrfToken = 'test-csrf-token';

    return test()
        ->withSession(['_token' => $csrfToken])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', $csrfToken);
}

function createReportsAgent(): User
{
    $user = User::query()->forceCreate([
        'name' => 'Reports Agent '.Str::random(6),
        'username' => Str::lower(Str::random(10)),
        'email' => Str::random(8).'@example.test',
        'password' => bcrypt('password'),
        'email_verified_at' => now(),
    ]);

    $user->permissions()->attach(
        Permission::query()->firstOrCreate(['name' => 'reports.view']),
    );

    return $user;
}

test('agent can load conversations tickets report', function () {
    $agent = createReportsAgent();

    statefulReports()
        ->actingAs($agent)
        ->getJson('/api/v1/reports/conversations/tickets')
        ->assertOk();
});

test('agent can load ai agent report overview', function () {
    $agent = createReportsAgent();

    statefulReports()
        ->actingAs($agent)
        ->getJson('/api/v1/reports/ai-agent')
        ->assertOk()
        ->assertJsonStructure([
            'aiAgentConversations',
            'aiAgentInvolvment',
            'aiAgentInvolvmentOverTime',
        ]);
});

test('guest cannot load helpdesk reports', function () {
    statefulReports()
        ->getJson('/api/v1/reports/conversations/tickets')
        ->assertForbidden();
});
