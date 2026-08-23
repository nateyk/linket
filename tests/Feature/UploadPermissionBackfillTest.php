<?php

namespace Tests\Feature;

use App\Models\User;
use Common\Roles\Models\Role;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class UploadPermissionBackfillTest extends TestCase
{
    use DatabaseTransactions;

    public function testUploadForbiddenWhenRoleLacksFilesCreatePermission(): void
    {
        [$creator, $workspace] = $this->createCreatorWithWorkspace();

        $this->detachFilesCreateFromUsersRole();

        $response = $this->uploadImage($workspace, $creator);

        $response->assertForbidden();
    }

    public function testBackfillMigrationRestoresUploadPermission(): void
    {
        [$creator, $workspace] = $this->createCreatorWithWorkspace();

        $this->detachFilesCreateFromUsersRole();

        $migration = require glob(
            database_path('migrations/*_backfill_default_role_permissions.php'),
        )[0];
        $migration->up();

        $response = $this->uploadImage($workspace, $creator);

        $response->assertSuccessful();
        $this->assertDatabaseHas('file_entries', [
            'owner_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);
    }

    /**
     * @return array{User, Workspace}
     */
    private function createCreatorWithWorkspace(): array
    {
        $creator = User::query()->forceCreate([
            'name' => 'Uploader',
            'username' => 'uploader-'.strtolower(uniqid()),
            'email' => uniqid().'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $creator->roles()->attach(
            Role::query()->where('default', true)->firstOrFail(),
        );

        return [$creator, $workspace];
    }

    private function detachFilesCreateFromUsersRole(): void
    {
        $role = Role::query()->where('name', 'Users')->firstOrFail();
        $permissionIds = $role
            ->permissions()
            ->whereIn('name', ['files.create', 'files.update'])
            ->pluck('permissions.id');
        $role->permissions()->detach($permissionIds);
    }

    private function uploadImage(Workspace $workspace, User $creator)
    {
        return $this->stateful()
            ->actingAs($creator)
            ->post('/api/v1/file-entries', [
                'file' => UploadedFile::fake()->image('cover.png'),
                'workspaceId' => $workspace->id,
                'uploadType' => 'linkImages',
            ]);
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
