<?php

namespace Tests\Feature;

use App\Models\User;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class HcBrowserWorkflowRegressionTest extends TestCase
{
    use DatabaseTransactions;

    private function agentWithPermissions(array $names): User
    {
        $user = User::factory()->create(['type' => 'agent']);
        foreach ($names as $name) {
            $permission = Permission::query()->firstOrCreate(['name' => $name]);
            $user->permissions()->syncWithoutDetaching([$permission->id]);
        }

        return $user;
    }

    private function stateful(): static
    {
        return $this->withSession(['_token' => 'hc-test-token'])
            ->withHeader('X-CSRF-TOKEN', 'hc-test-token')
            ->withHeader('Referer', config('app.url'));
    }

    public function test_agent_can_create_category_using_store_policy(): void
    {
        $agent = $this->agentWithPermissions(['articles.update']);
        $name = 'Browser category '.Str::random(10);

        $response = $this->stateful()->actingAs($agent)
            ->postJson('/api/v1/hc/categories', ['name' => $name])
            ->assertSuccessful()
            ->assertJsonPath('category.name', $name);

        $this->assertDatabaseHas('categories', [
            'id' => $response->json('category.id'),
            'name' => $name,
        ]);
    }

    public function test_customer_cannot_create_help_center_category(): void
    {
        $user = User::factory()->create();

        $this->stateful()->actingAs($user)
            ->postJson('/api/v1/hc/categories', ['name' => 'Private category'])
            ->assertForbidden();
    }

    public function test_role_autocomplete_uses_existing_role_model(): void
    {
        $agent = $this->agentWithPermissions(['conversations.view']);

        $this->stateful()->actingAs($agent)
            ->getJson('/api/v1/helpdesk/normalized-models/roles')
            ->assertOk()
            ->assertJsonStructure(['roles', 'defaultRoleId']);
    }
}
