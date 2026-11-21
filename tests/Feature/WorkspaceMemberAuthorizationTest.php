<?php

namespace Tests\Feature;

use App\Models\User;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\WorkspaceMember;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class WorkspaceMemberAuthorizationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_change_role_cannot_mutate_member_from_another_workspace(): void
    {
        config()->set('app.workspaces_integrated', true);

        $ownerA = User::factory()->create();
        $ownerB = User::factory()->create();
        $member = User::factory()->create();
        $this->grantPermission($ownerA, 'api.access');

        $workspaceA = (new CreateWorkspace())->createPersonalWorkspace($ownerA);
        $workspaceB = (new CreateWorkspace())->createPersonalWorkspace($ownerB);

        $workspaceRole = Role::query()->firstOrCreate(
            ['name' => 'workspace-editor', 'type' => 'workspace'],
            ['default' => false, 'guests' => false, 'internal' => false],
        );
        $otherRole = Role::query()->firstOrCreate(
            ['name' => 'workspace-viewer', 'type' => 'workspace'],
            ['default' => false, 'guests' => false, 'internal' => false],
        );

        $pivotB = WorkspaceMember::query()->create([
            'workspace_id' => $workspaceB->id,
            'user_id' => $member->id,
            'role_id' => $workspaceRole->id,
            'is_owner' => false,
        ]);

        // Owner A is authorized on workspace A but must not touch B's pivot.
        $this->actingAs($ownerA)
            ->postJson("/api/v1/workspace/{$workspaceA->id}/member/{$pivotB->id}/change-role", [
                'roleId' => $otherRole->id,
            ])
            ->assertStatus(404);

        $this->assertSame($workspaceRole->id, (int) $pivotB->fresh()->role_id);
    }

    public function test_workspace_endpoints_are_unreachable_when_feature_disabled(): void
    {
        config()->set('app.workspaces_integrated', false);

        $owner = User::factory()->create();
        $this->grantPermission($owner, 'api.access');
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($owner);

        $this->actingAs($owner->fresh(['permissions', 'roles']))
            ->getJson("/api/v1/workspace/{$workspace->id}/members")
            ->assertNotFound();
    }

    private function grantPermission(User $user, string $name): void
    {
        $permission = Permission::query()->firstOrCreate(['name' => $name]);
        $user->permissions()->syncWithoutDetaching([$permission->id]);
    }
}
