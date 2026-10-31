<?php

namespace Tests\Feature\Support;

use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationItem;
use App\Models\User;
use Common\Files\FileEntry;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Database\Seeders\SupportDefaultsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TicketAclStaffNotesAndAttachmentsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SupportDefaultsSeeder::class);
        if (! is_dir(storage_path('app/purifier'))) {
            mkdir(storage_path('app/purifier'), 0775, true);
        }
    }

    public function test_customer_cannot_view_another_customers_ticket(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $this->grantPermission($owner, 'conversations.create');
        $this->grantPermission($intruder, 'conversations.create');

        $ticket = Conversation::query()->create([
            'user_id' => $owner->id,
            'subject' => 'Private owner ticket',
            'type' => 'ticket',
            'assigned_to' => Conversation::ASSIGNED_AGENT,
            'status_category' => Conversation::STATUS_OPEN,
        ]);

        $this->stateful()
            ->actingAs($intruder)
            ->getJson("/api/v1/helpdesk/customer/tickets/{$ticket->id}")
            ->assertNotFound();
    }

    public function test_guest_cannot_list_or_show_tickets(): void
    {
        $customer = User::factory()->create();
        $ticket = Conversation::query()->create([
            'user_id' => $customer->id,
            'subject' => 'Guest blocked',
            'type' => 'ticket',
            'assigned_to' => Conversation::ASSIGNED_AGENT,
            'status_category' => Conversation::STATUS_OPEN,
        ]);

        $this->stateful()
            ->getJson('/api/v1/helpdesk/customer/tickets')
            ->assertUnauthorized();

        $this->stateful()
            ->getJson("/api/v1/helpdesk/customer/tickets/{$ticket->id}")
            ->assertUnauthorized();
    }

    public function test_customer_cannot_see_private_staff_notes(): void
    {
        $customer = User::factory()->create();
        $agent = $this->createPlatformAgent();
        $this->grantPermission($customer, 'conversations.create');

        $ticket = Conversation::query()->create([
            'user_id' => $customer->id,
            'subject' => 'Notes ACL ticket',
            'type' => 'ticket',
            'assigned_to' => Conversation::ASSIGNED_AGENT,
            'status_category' => Conversation::STATUS_OPEN,
            'assignee_id' => $agent->id,
        ]);

        ConversationItem::query()->create([
            'conversation_id' => $ticket->id,
            'user_id' => $customer->id,
            'type' => 'message',
            'body' => '<p>Customer visible message</p>',
        ]);

        ConversationItem::query()->create([
            'conversation_id' => $ticket->id,
            'user_id' => $agent->id,
            'type' => ConversationItem::NOTE_TYPE,
            'body' => '<p>SECRET staff note — refund override</p>',
        ]);

        ConversationItem::query()->create([
            'conversation_id' => $ticket->id,
            'user_id' => $agent->id,
            'type' => 'message',
            'body' => '<p>Public agent reply</p>',
        ]);

        $customerPayload = $this->stateful()
            ->actingAs($customer)
            ->getJson("/api/v1/helpdesk/customer/conversations/{$ticket->id}/messages")
            ->assertOk()
            ->json();

        $customerBodies = json_encode($customerPayload);
        $this->assertStringContainsString('Customer visible message', $customerBodies);
        $this->assertStringContainsString('Public agent reply', $customerBodies);
        $this->assertStringNotContainsString('SECRET staff note', $customerBodies);

        $agentPayload = $this->stateful()
            ->actingAs($agent)
            ->getJson("/api/v1/helpdesk/agent/conversations/{$ticket->id}/messages")
            ->assertOk()
            ->json();

        $this->assertStringContainsString('SECRET staff note', json_encode($agentPayload));
    }

    public function test_platform_agent_can_assign_reply_and_close_ticket(): void
    {
        $customer = User::factory()->create();
        $agent = $this->createPlatformAgent();
        $this->grantPermission($customer, 'conversations.create');

        $create = $this->stateful()
            ->actingAs($customer)
            ->postJson('/api/v1/helpdesk/customer/tickets', [
                'subject' => 'Lifecycle ticket subject',
                'message' => ['body' => '<p>Need help with billing</p>'],
            ])
            ->assertSuccessful();

        $ticketId = $create->json('conversation.id')
            ?? $create->json('ticket.id')
            ?? Conversation::query()->where('subject', 'Lifecycle ticket subject')->value('id');
        $this->assertNotNull($ticketId);

        $this->stateful()
            ->actingAs($agent)
            ->postJson('/api/v1/helpdesk/agent/conversations/assignee/change', [
                'conversationIds' => [$ticketId],
                'userId' => $agent->id,
                'privateNote' => 'Assigning to myself for review',
            ])
            ->assertSuccessful();

        $this->stateful()
            ->actingAs($agent)
            ->postJson("/api/v1/helpdesk/agent/conversations/{$ticketId}/messages", [
                'body' => '<p>We are looking into this.</p>',
                'type' => 'message',
            ])
            ->assertSuccessful();

        $this->stateful()
            ->actingAs($agent)
            ->postJson('/api/v1/helpdesk/agent/conversations/status/change', [
                'conversationIds' => [$ticketId],
                'statusName' => 'closed',
            ])
            ->assertSuccessful();

        $this->stateful()
            ->actingAs($customer)
            ->getJson("/api/v1/helpdesk/customer/tickets/{$ticketId}")
            ->assertOk()
            ->assertJsonPath('conversation.subject', 'Lifecycle ticket subject');
    }

    public function test_customer_cannot_download_another_tickets_attachment(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $ticket = Conversation::query()->create([
            'user_id' => $owner->id,
            'subject' => 'Attachment owner ticket',
            'type' => 'ticket',
            'assigned_to' => Conversation::ASSIGNED_AGENT,
            'status_category' => Conversation::STATUS_OPEN,
        ]);
        $message = ConversationItem::query()->create([
            'conversation_id' => $ticket->id,
            'user_id' => $owner->id,
            'type' => 'message',
            'body' => '<p>See attachment</p>',
        ]);
        $entry = $this->createFileEntry($owner->id);
        $message->attachments()->attach($entry->id);

        $this->stateful()
            ->actingAs($intruder)
            ->getJson("/api/v1/file-entries/{$entry->id}?policy=conversationFileEntry")
            ->assertForbidden();
    }

    public function test_platform_agent_can_access_ticket_attachment_via_policy(): void
    {
        $customer = User::factory()->create();
        $agent = $this->createPlatformAgent();
        $ticket = Conversation::query()->create([
            'user_id' => $customer->id,
            'subject' => 'Agent attachment ticket',
            'type' => 'ticket',
            'assigned_to' => Conversation::ASSIGNED_AGENT,
            'status_category' => Conversation::STATUS_OPEN,
        ]);
        $message = ConversationItem::query()->create([
            'conversation_id' => $ticket->id,
            'user_id' => $customer->id,
            'type' => 'message',
            'body' => '<p>Receipt attached</p>',
        ]);
        $entry = $this->createFileEntry($customer->id);
        $message->attachments()->attach($entry->id);

        $this->stateful()
            ->actingAs($agent)
            ->getJson("/api/v1/file-entries/{$entry->id}?policy=conversationFileEntry")
            ->assertOk();
    }

    public function test_support_owner_can_access_owned_ticket_attachment(): void
    {
        $customer = User::factory()->create();
        $creator = User::factory()->create();
        $ticket = Conversation::query()->create([
            'user_id' => $customer->id,
            'support_owner_id' => $creator->id,
            'subject' => 'Creator-owned attachment ticket',
            'type' => 'ticket',
            'assigned_to' => Conversation::ASSIGNED_AGENT,
            'status_category' => Conversation::STATUS_OPEN,
        ]);
        $message = ConversationItem::query()->create([
            'conversation_id' => $ticket->id,
            'user_id' => $customer->id,
            'type' => 'message',
            'body' => '<p>Order question</p>',
        ]);
        $entry = $this->createFileEntry($customer->id);
        $message->attachments()->attach($entry->id);

        $this->stateful()
            ->actingAs($creator)
            ->getJson("/api/v1/file-entries/{$entry->id}?policy=conversationFileEntry")
            ->assertOk();
    }

    public function test_platform_agent_cannot_update_creator_owned_ticket(): void
    {
        $customer = User::factory()->create();
        $creator = User::factory()->create();
        $agent = $this->createPlatformAgent();

        $ticket = Conversation::query()->create([
            'user_id' => $customer->id,
            'support_owner_id' => $creator->id,
            'subject' => 'Creator inbox only',
            'type' => 'ticket',
            'assigned_to' => Conversation::ASSIGNED_AGENT,
            'status_category' => Conversation::STATUS_OPEN,
        ]);

        $this->stateful()
            ->actingAs($agent)
            ->postJson("/api/v1/helpdesk/agent/conversations/{$ticket->id}/messages", [
                'body' => '<p>Platform agent should not reply here</p>',
                'type' => 'message',
            ])
            ->assertForbidden();
    }

    private function createFileEntry(int $ownerId): FileEntry
    {
        return FileEntry::query()->create([
            'name' => 'ticket-proof.pdf',
            'file_name' => Str::random(20),
            'file_size' => 256,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'disk_prefix' => 'uploads',
            'owner_id' => $ownerId,
            'user_id' => $ownerId,
            'workspace_id' => 0,
        ]);
    }

    private function createPlatformAgent(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'Platform Agent '.Str::random(4),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
            'type' => 'agent',
        ]);

        $this->grantPermission($user, 'conversations.update');
        $this->grantPermission($user, 'tickets.update');

        $role = Role::query()->firstOrCreate(
            ['name' => 'Agents'],
            [
                'type' => 'agents',
                'default' => false,
                'guests' => false,
                'internal' => true,
                'agents' => true,
            ],
        );
        if (isset($role->agents) && ! $role->agents) {
            $role->update(['agents' => true]);
        }
        $user->roles()->syncWithoutDetaching([$role->id]);

        return $user->fresh(['roles', 'permissions']);
    }

    private function grantPermission(User $user, string $name): void
    {
        $permission = Permission::query()->firstOrCreate(['name' => $name]);
        $user->permissions()->syncWithoutDetaching([$permission->id]);
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';
        $this->flushSession();

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
