<?php

namespace Tests\Feature;

use App\Conversations\Models\Conversation;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Common\Workspaces\Actions\CreateWorkspace;
use Database\Seeders\SupportDefaultsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class CreatorTicketLeakAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SupportDefaultsSeeder::class);
    }

    public function test_recent_customer_conversations_hide_creator_owned_tickets(): void
    {
        [$customer, $agent] = $this->seedPlatformAndCreatorTickets();

        $subjects = $this->subjectsFrom(
            $this->stateful()
                ->actingAs($agent)
                ->getJson("/api/v1/helpdesk/agent/conversations/recent/{$customer->id}")
                ->assertOk(),
            'conversations',
        );

        $this->assertTrue($subjects->contains('Platform ticket'));
        $this->assertFalse($subjects->contains('Private creator ticket'));
    }

    public function test_customer_profile_conversations_hide_creator_owned_tickets(): void
    {
        [$customer, $agent] = $this->seedPlatformAndCreatorTickets();
        $this->grantPermission($agent, 'users.update');
        $this->grantPermission($agent, 'api.access');
        $agent = $agent->fresh(['roles', 'permissions']);

        $subjects = $this->subjectsFrom(
            $this->stateful()
                ->actingAs($agent)
                ->getJson("/api/v1/helpdesk/customers/{$customer->id}/conversations")
                ->assertOk(),
            'pagination.data',
        );

        $this->assertTrue($subjects->contains('Platform ticket'));
        $this->assertFalse($subjects->contains('Private creator ticket'));
    }

    public function test_support_owner_id_rejects_non_creators(): void
    {
        $customer = User::factory()->create();
        $randomUser = User::factory()->create();
        $this->grantPermission($customer, 'conversations.create');

        $this->stateful()
            ->actingAs($customer)
            ->postJson('/api/v1/helpdesk/customer/tickets', [
                'subject' => 'Spoofed owner ticket',
                'message' => ['body' => '<p>Hello</p>'],
                'support_owner_id' => $randomUser->id,
            ])
            ->assertStatus(422);
    }

    public function test_support_owner_id_accepts_product_creators(): void
    {
        $customer = User::factory()->create();
        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Creator product',
            'status' => 'approved',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'type' => 'digital',
        ]);
        $this->grantPermission($customer, 'conversations.create');

        $this->stateful()
            ->actingAs($customer)
            ->postJson('/api/v1/helpdesk/customer/tickets', [
                'subject' => 'Valid creator support',
                'message' => ['body' => '<p>Need help</p>'],
                'support_owner_id' => $creator->id,
            ])
            ->assertOk();
    }

    /** @return array{0: User, 1: User} */
    private function seedPlatformAndCreatorTickets(): array
    {
        $customer = User::factory()->create();
        $creator = User::factory()->create();
        $agent = $this->createPlatformAgent();

        Conversation::query()->create([
            'user_id' => $customer->id,
            'support_owner_id' => $creator->id,
            'subject' => 'Private creator ticket',
            'type' => 'ticket',
            'assigned_to' => Conversation::ASSIGNED_AGENT,
            'status_category' => Conversation::STATUS_OPEN,
        ]);
        Conversation::query()->create([
            'user_id' => $customer->id,
            'subject' => 'Platform ticket',
            'type' => 'ticket',
            'assigned_to' => Conversation::ASSIGNED_AGENT,
            'status_category' => Conversation::STATUS_OPEN,
        ]);

        return [$customer, $agent];
    }

    private function subjectsFrom(TestResponse $response, string $jsonPath): \Illuminate\Support\Collection
    {
        return collect($response->json($jsonPath))->pluck('subject');
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
        $this->grantPermission($user, 'conversations.index');
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
