<?php

namespace Tests\Feature\Support;

use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationStatus;
use App\Models\User;
use App\Team\Models\Group;
use Common\Permissions\Models\Permission;
use Database\Seeders\SupportDefaultsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreateCustomerTicketTest extends TestCase
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

    public function test_authenticated_customer_can_create_ticket(): void
    {
        $user = User::factory()->create();
        $this->grantPermission($user, 'conversations.create');

        $response = $this->stateful()
            ->actingAs($user)
            ->postJson('/api/v1/helpdesk/customer/tickets', [
                'subject' => 'Need help with my store',
                'message' => [
                    'body' => '<p>Checkout is broken</p>',
                ],
            ]);

        $response->assertSuccessful();

        $this->assertDatabaseHas('conversations', [
            'user_id' => $user->id,
            'subject' => 'Need help with my store',
            'type' => 'ticket',
            'support_owner_id' => null,
        ]);

        $conversation = Conversation::query()->first();
        $this->assertNotNull($conversation);
        $this->assertNull($conversation->support_owner_id);
        $this->assertTrue(
            $conversation->items()->where('type', 'message')->exists(),
        );
    }

    public function test_guests_cannot_list_or_view_customer_tickets(): void
    {
        $this->stateful()
            ->getJson('/api/v1/helpdesk/customer/tickets')
            ->assertUnauthorized();

        $conversation = Conversation::query()->create([
            'subject' => 'Private ticket',
            'type' => 'ticket',
            'user_id' => User::factory()->create()->id,
            'assigned_to' => Conversation::ASSIGNED_AGENT,
            'status_category' => Conversation::STATUS_OPEN,
        ]);

        $this->stateful()
            ->getJson("/api/v1/helpdesk/customer/tickets/{$conversation->id}")
            ->assertUnauthorized();
    }

    public function test_customer_can_create_ticket_for_a_support_owner(): void
    {
        $user = User::factory()->create();
        $owner = User::factory()->create();
        $this->grantPermission($user, 'conversations.create');

        $this->stateful()
            ->actingAs($user)
            ->postJson('/api/v1/helpdesk/customer/tickets', [
                'subject' => 'Store question',
                'message' => ['body' => '<p>Hello</p>'],
                'support_owner_id' => $owner->id,
            ])
            ->assertSuccessful();

        $this->assertDatabaseHas('conversations', [
            'user_id' => $user->id,
            'support_owner_id' => $owner->id,
        ]);
    }

    public function test_non_agent_cannot_list_agent_inbox(): void
    {
        $user = User::factory()->create();
        $this->grantPermission($user, 'conversations.create');

        $response = $this->stateful()
            ->actingAs($user)
            ->getJson('/api/v1/helpdesk/agent/conversations');

        $response->assertForbidden();
    }

    public function test_support_defaults_seed_group_and_statuses(): void
    {
        $this->assertTrue(Group::query()->where('default', true)->exists());
        $this->assertGreaterThanOrEqual(4, ConversationStatus::query()->count());
    }

    protected function grantPermission(User $user, string $name): void
    {
        $permission = Permission::query()->firstOrCreate(
            ['name' => $name],
            ['display_name' => $name, 'description' => $name, 'group' => 'support'],
        );
        $user->permissions()->attach($permission->id);
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
