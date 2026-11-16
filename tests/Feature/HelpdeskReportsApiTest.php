<?php

use App\Conversations\Events\ConversationCreated;
use App\Conversations\Models\Conversation;
use App\Reports\Actions\ConversationsOverviewReport\HelpdeskReportCache;
use App\Conversations\Models\ConversationItem;
use App\Models\User;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
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

test('only users with reports.view can access ticket and agent reports', function () {
    $user = User::factory()->create();

    statefulReports()
        ->actingAs($user)
        ->getJson('/api/v1/reports/conversations/ticket')
        ->assertForbidden();

    statefulReports()
        ->actingAs($user)
        ->getJson('/api/v1/reports/agents')
        ->assertForbidden();
});

test('platform ticket totals exclude creator-owned support tickets', function () {
    $agent = createReportsAgent();
    $customer = User::factory()->create();
    $creator = User::factory()->create();

    foreach ([null, $creator->id] as $supportOwnerId) {
        Conversation::query()->create([
            'user_id' => $customer->id,
            'support_owner_id' => $supportOwnerId,
            'subject' => 'Report scope validation',
            'type' => 'ticket',
            'assigned_to' => Conversation::ASSIGNED_AGENT,
            'status_category' => Conversation::STATUS_OPEN,
        ]);
    }

    // Reports cache by date range. Use fresh data for this isolation test.
    Cache::flush();

    statefulReports()
        ->actingAs($agent)
        ->getJson('/api/v1/reports/conversations/ticket')
        ->assertOk()
        ->assertJsonPath('newConversations.datasets.0.total', 1);
});

test('staff notes do not inflate public agent reply metrics', function () {
    $reporter = createReportsAgent();
    $agent = User::factory()->create(['type' => 'agent']);
    $customer = User::factory()->create();

    $ticket = Conversation::query()->create([
        'user_id' => $customer->id,
        'assignee_id' => $agent->id,
        'subject' => 'Agent metrics privacy',
        'type' => 'ticket',
        'assigned_to' => Conversation::ASSIGNED_AGENT,
        'status_category' => Conversation::STATUS_OPEN,
    ]);

    foreach ([
        ['user_id' => $customer->id, 'type' => 'message', 'body' => 'Request help'],
        ['user_id' => $agent->id, 'type' => 'note', 'body' => 'Private triage note'],
        ['user_id' => $agent->id, 'type' => 'message', 'body' => 'Public agent answer'],
    ] as $item) {
        ConversationItem::query()->create([
            'conversation_id' => $ticket->id,
            ...$item,
        ]);
    }

    Cache::flush();

    statefulReports()
        ->actingAs($reporter)
        ->getJson('/api/v1/reports/conversations/ticket')
        ->assertOk()
        ->assertJsonPath('newConversations.datasets.0.total', 1)
        ->assertJsonPath('agents.datasets.0.totalAgentReplies', 1);
});

test('creating a support ticket invalidates cached report totals immediately', function () {
    Cache::flush();
    $reporter = createReportsAgent();
    $customer = User::factory()->create();

    $before = statefulReports()
        ->actingAs($reporter)
        ->getJson('/api/v1/reports/conversations/ticket')
        ->assertOk()
        ->json('newConversations.datasets.0.total');
    $revision = HelpdeskReportCache::revision();

    $ticket = Conversation::query()->create([
        'user_id' => $customer->id,
        'subject' => 'New report cache invalidation ticket',
        'type' => 'ticket',
        'assigned_to' => Conversation::ASSIGNED_AGENT,
        'status_category' => Conversation::STATUS_OPEN,
    ]);
    event(new ConversationCreated($ticket));

    expect(HelpdeskReportCache::revision())->not->toBe($revision);

    statefulReports()
        ->actingAs($reporter)
        ->getJson('/api/v1/reports/conversations/ticket')
        ->assertOk()
        ->assertJsonPath('newConversations.datasets.0.total', $before + 1);
});

test('guest cannot load helpdesk reports', function () {
    statefulReports()
        ->getJson('/api/v1/reports/conversations/tickets')
        ->assertForbidden();
});
