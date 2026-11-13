<?php

namespace Tests\Feature;

use App\Conversations\Agent\Actions\ConversationsAssigner;
use App\Conversations\Agent\Notifications\Ticketing\ConversationCreatedNotif;
use App\Conversations\Customer\Actions\CreateTicketAsCustomer;
use App\Conversations\Events\ConversationCreated;
use App\Conversations\Events\ConversationMessageCreated;
use App\Conversations\Events\ConversationsAssignedToAgent;
use App\Conversations\Listeners\SendReplyCreatedNotif;
use App\Conversations\Agent\Notifications\Ticketing\Messages\Customer\CustomerRepliedToUnassignedConversationNotif;
use App\Conversations\Models\ConversationItem;
use App\Conversations\Events\ConversationsUpdated;
use App\Conversations\Models\Conversation;
use App\Models\User;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class CreatorOwnedTicketNotificationIsolationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_creator_owned_ticket_notifies_owner_but_never_platform_agents(): void
    {
        Notification::fake();
        Mail::fake();
        Event::fake([ConversationCreated::class]);

        $owner = User::factory()->create();
        $platformAgent = User::factory()->create(['type' => 'agent']);
        $customer = User::factory()->create();

        foreach ([$owner, $platformAgent] as $user) {
            $user->notificationSubscriptions()->create([
                'notif_id' => ConversationCreatedNotif::NOTIF_ID,
                'channels' => ['database'],
            ]);
        }

        try {
            $conversation = (new CreateTicketAsCustomer())->execute([
                'support_owner_id' => $owner->id,
                'subject' => 'Private creator help',
                'message' => ['body' => 'My private creator support details'],
            ], $customer);
        } finally {
            ConversationsUpdated::resumeDispatching();
        }

        $this->assertSame($owner->id, $conversation->support_owner_id);
        $this->assertNull($conversation->assignee_id);
        $this->assertNull($conversation->group_id);
        $this->assertSame(Conversation::ASSIGNED_AGENT, $conversation->assigned_to);

        Notification::assertSentTo($owner, ConversationCreatedNotif::class);
        Notification::assertNotSentTo($platformAgent, ConversationCreatedNotif::class);
    }

    public function test_global_creation_and_update_broadcasts_ignore_creator_owned_tickets(): void
    {
        $owner = User::factory()->create();
        $customer = User::factory()->create();

        $owned = Conversation::query()->create([
            'user_id' => $customer->id,
            'type' => 'ticket',
            'mode' => Conversation::MODE_NORMAL,
            'support_owner_id' => $owner->id,
        ]);

        $platform = Conversation::query()->create([
            'user_id' => $customer->id,
            'type' => 'ticket',
            'mode' => Conversation::MODE_NORMAL,
        ]);

        $this->assertFalse((new ConversationCreated($owned))->broadcastWhen());
        $this->assertTrue((new ConversationCreated($platform))->broadcastWhen());

        $message = new ConversationItem();
        $this->assertFalse((new ConversationMessageCreated($owned, $message))->broadcastWhen());
        $this->assertTrue((new ConversationMessageCreated($platform, $message))->broadcastWhen());
        $this->assertFalse((new ConversationsAssignedToAgent(collect([$owned])))->broadcastWhen());
        $this->assertTrue((new ConversationsAssignedToAgent(collect([$platform])))->broadcastWhen());

        $updated = new ConversationsUpdated([$owned]);
        $updated->conversationsAfterUpdate = collect([$owned]);
        $this->assertFalse($updated->broadcastWhen());

        $updated = new ConversationsUpdated([$platform]);
        $updated->conversationsAfterUpdate = collect([$platform]);
        $this->assertTrue($updated->broadcastWhen());
    }

    public function test_creator_reply_notification_is_sent_only_to_the_owner(): void
    {
        Notification::fake();
        $owner = User::factory()->create();
        $platformAgent = User::factory()->create(['type' => 'agent']);
        $customer = User::factory()->create();

        foreach ([$owner, $platformAgent] as $user) {
            $user->notificationSubscriptions()->create([
                'notif_id' => CustomerRepliedToUnassignedConversationNotif::NOTIF_ID,
                'channels' => ['database'],
            ]);
        }

        $conversation = Conversation::query()->create([
            'user_id' => $customer->id,
            'type' => 'ticket',
            'support_owner_id' => $owner->id,
        ]);
        $message = $conversation->items()->create([
            'type' => 'message',
            'body' => 'Private customer reply',
            'author' => Conversation::AUTHOR_USER,
            'user_id' => $customer->id,
        ]);

        (new SendReplyCreatedNotif())->handle(
            new ConversationMessageCreated($conversation, $message),
        );

        Notification::assertSentTo($owner, CustomerRepliedToUnassignedConversationNotif::class);
        Notification::assertNotSentTo($platformAgent, CustomerRepliedToUnassignedConversationNotif::class);
    }

    public function test_platform_auto_assignment_does_not_mutate_creator_ticket(): void
    {
        $owner = User::factory()->create();
        $customer = User::factory()->create();
        $owned = Conversation::query()->create([
            'user_id' => $customer->id,
            'type' => 'ticket',
            'support_owner_id' => $owner->id,
        ]);

        $result = ConversationsAssigner::assignConversationToFirstAvailableAgent($owned);

        $this->assertSame($owned->id, $result->id);
        $this->assertNull($result->fresh()->assignee_id);
    }

    public function test_platform_agent_cannot_bulk_delete_creator_ticket(): void
    {
        $owner = User::factory()->create();
        $customer = User::factory()->create();
        $agent = User::factory()->create(['type' => 'agent']);
        $agent->permissions()->syncWithoutDetaching([
            Permission::query()->firstOrCreate(['name' => 'conversations.destroy'])->id,
        ]);
        $conversation = Conversation::query()->create([
            'user_id' => $customer->id,
            'type' => 'ticket',
            'support_owner_id' => $owner->id,
        ]);

        $this->withSession(['_token' => 'hc-security-test'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'hc-security-test')
            ->actingAs($agent)
            ->deleteJson("/api/v1/helpdesk/agent/conversations/{$conversation->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('conversations', ['id' => $conversation->id]);
    }

    public function test_creator_cannot_route_ticket_into_platform_groups(): void
    {
        $owner = User::factory()->create();
        $customer = User::factory()->create();
        $conversation = Conversation::query()->create([
            'user_id' => $customer->id,
            'type' => 'ticket',
            'support_owner_id' => $owner->id,
        ]);

        $this->withSession(['_token' => 'hc-security-test'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'hc-security-test')
            ->actingAs($owner)
            ->postJson('/api/v1/helpdesk/agent/conversations/group/change', [
                'conversationIds' => [$conversation->id],
                'groupId' => 1,
            ])
            ->assertForbidden();
    }

    public function test_cannot_explicitly_assign_creator_ticket_to_a_platform_agent(): void
    {
        $owner = User::factory()->create();
        $platformAgent = User::factory()->create(['type' => 'agent']);
        $customer = User::factory()->create();

        $owned = Conversation::query()->create([
            'user_id' => $customer->id,
            'type' => 'ticket',
            'support_owner_id' => $owner->id,
        ]);

        $this->expectException(HttpException::class);
        ConversationsAssigner::assignConversationsToAgent([$owned], $platformAgent->id);
    }
}
