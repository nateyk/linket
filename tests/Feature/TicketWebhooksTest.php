<?php

use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationStatus;
use App\Models\User;
use App\Team\Models\Group;
use App\Webhooks\Jobs\DispatchWebhooksForEvent;
use App\Webhooks\Models\Webhook;
use Database\Seeders\SupportDefaultsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(SupportDefaultsSeeder::class);
    if (! is_dir(storage_path('app/purifier'))) {
        mkdir(storage_path('app/purifier'), 0775, true);
    }
});

test('creating a customer ticket dispatches ticket.created webhook for support owner', function () {
    Queue::fake();

    $owner = User::factory()->create();
    $customer = User::factory()->create();
    $customer->permissions()->attach(
        \Common\Permissions\Models\Permission::query()->firstOrCreate([
            'name' => 'conversations.create',
        ]),
    );

    Webhook::query()->create([
        'user_id' => $owner->id,
        'name' => 'Owner hook',
        'url' => 'https://example.test/hook',
        'signing_secret' => str_repeat('a', 32),
        'selected_events' => ['ticket.created'],
    ]);

    statefulTicket()
        ->actingAs($customer)
        ->postJson('/api/v1/helpdesk/customer/tickets', [
            'subject' => 'Store question',
            'support_owner_id' => $owner->id,
            'message' => ['body' => '<p>Hello</p>'],
        ])
        ->assertSuccessful();

    Queue::assertPushed(DispatchWebhooksForEvent::class);
});

test('creator scope lists only owned support conversations', function () {
    $owner = User::factory()->create();
    $otherOwner = User::factory()->create();
    $customer = User::factory()->create();
    $status = ConversationStatus::getDefaultOpen();
    $groupId = Group::findDefault()?->id;

    Conversation::query()->create([
        'user_id' => $customer->id,
        'type' => 'ticket',
        'subject' => 'Platform',
        'status_id' => $status->id,
        'status_category' => $status->category,
        'group_id' => $groupId,
        'assigned_to' => Conversation::ASSIGNED_AGENT,
        'support_owner_id' => null,
    ]);

    $owned = Conversation::query()->create([
        'user_id' => $customer->id,
        'type' => 'ticket',
        'subject' => 'Creator owned',
        'status_id' => $status->id,
        'status_category' => $status->category,
        'group_id' => $groupId,
        'assigned_to' => Conversation::ASSIGNED_AGENT,
        'support_owner_id' => $owner->id,
    ]);

    Conversation::query()->create([
        'user_id' => $customer->id,
        'type' => 'ticket',
        'subject' => 'Other creator',
        'status_id' => $status->id,
        'status_category' => $status->category,
        'group_id' => $groupId,
        'assigned_to' => Conversation::ASSIGNED_AGENT,
        'support_owner_id' => $otherOwner->id,
    ]);

    $response = statefulTicket()
        ->actingAs($owner)
        ->getJson('/api/v1/helpdesk/agent/conversations?scope=creator&viewId=all')
        ->assertOk();

    $ids = collect($response->json('pagination.data'))->pluck('id')->all();

    expect($ids)->toBe([$owned->id]);
});

function statefulTicket()
{
    $csrfToken = 'test-csrf-token';

    return test()
        ->withSession(['_token' => $csrfToken])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', $csrfToken);
}
