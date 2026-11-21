<?php

namespace Tests\Feature;

use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationItem;
use App\Models\User;
use Common\Files\FileEntry;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Database\Seeders\SupportDefaultsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ConversationAttachmentAuthorizationTest extends TestCase
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

    public function test_customer_cannot_attach_another_users_file_entry_to_a_reply(): void
    {
        $customer = User::factory()->create();
        $victim = User::factory()->create();
        $this->grantPermission($customer, 'conversations.create');

        $ticket = Conversation::query()->create([
            'user_id' => $customer->id,
            'subject' => 'Attachment IDOR ticket',
            'type' => 'ticket',
            'assigned_to' => Conversation::ASSIGNED_AGENT,
            'status_category' => Conversation::STATUS_OPEN,
        ]);

        $victimEntry = $this->createFileEntry($victim->id);

        $this->stateful()
            ->actingAs($customer)
            ->postJson("/api/v1/helpdesk/customer/conversations/{$ticket->id}/messages", [
                'body' => '<p>Please see this file</p>',
                'attachments' => [$victimEntry->id],
            ])
            ->assertForbidden();

        $this->assertFalse(
            DB::table('file_entry_models')
                ->where('file_entry_id', $victimEntry->id)
                ->where('model_type', ConversationItem::MODEL_TYPE)
                ->exists(),
        );
    }

    public function test_agent_cannot_sync_another_users_file_entry_onto_a_message(): void
    {
        $customer = User::factory()->create();
        $victim = User::factory()->create();
        $agent = $this->createPlatformAgent();

        $ticket = Conversation::query()->create([
            'user_id' => $customer->id,
            'subject' => 'Agent sync IDOR ticket',
            'type' => 'ticket',
            'assigned_to' => Conversation::ASSIGNED_AGENT,
            'status_category' => Conversation::STATUS_OPEN,
        ]);
        $message = ConversationItem::query()->create([
            'conversation_id' => $ticket->id,
            'user_id' => $agent->id,
            'type' => 'message',
            'author' => Conversation::AUTHOR_AGENT,
            'body' => '<p>Agent note</p>',
        ]);
        $victimEntry = $this->createFileEntry($victim->id);

        $this->stateful()
            ->actingAs($agent)
            ->putJson("/api/v1/helpdesk/agent/messages/{$message->id}", [
                'attachments' => [$victimEntry->id],
            ])
            ->assertForbidden();

        $this->assertFalse(
            DB::table('file_entry_models')
                ->where('file_entry_id', $victimEntry->id)
                ->where('model_type', ConversationItem::MODEL_TYPE)
                ->where('model_id', $message->id)
                ->exists(),
        );
    }

    public function test_customer_can_attach_their_own_file_entry(): void
    {
        $customer = User::factory()->create();
        $this->grantPermission($customer, 'conversations.create');

        $ticket = Conversation::query()->create([
            'user_id' => $customer->id,
            'subject' => 'Own attachment ticket',
            'type' => 'ticket',
            'assigned_to' => Conversation::ASSIGNED_AGENT,
            'status_category' => Conversation::STATUS_OPEN,
        ]);
        $ownEntry = $this->createFileEntry($customer->id);

        $this->stateful()
            ->actingAs($customer)
            ->postJson("/api/v1/helpdesk/customer/conversations/{$ticket->id}/messages", [
                'body' => '<p>My receipt</p>',
                'attachments' => [$ownEntry->id],
            ])
            ->assertCreated();

        $this->assertTrue(
            DB::table('file_entry_models')
                ->where('file_entry_id', $ownEntry->id)
                ->where('model_type', ConversationItem::MODEL_TYPE)
                ->exists(),
        );
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
