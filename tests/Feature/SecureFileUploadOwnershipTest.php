<?php

namespace Tests\Feature;

use App\Models\User;
use Common\Database\Seeders\RolesTableSeeder;
use Common\Roles\Models\Role;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Tests\TestCase;

class SecureFileUploadOwnershipTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesTableSeeder::class);
    }

    public function test_creator_cannot_upload_into_another_creators_workspace(): void
    {
        [$attacker] = $this->creator();
        [, $victimWorkspace] = $this->creator();

        $this->actingAs($attacker)->post('/api/v1/file-entries', [
            'file' => UploadedFile::fake()->image('photo.png'),
            'workspaceId' => $victimWorkspace->id,
            'uploadType' => 'linkImages',
        ])->assertForbidden();
    }

    public function test_untrusted_storage_name_never_controls_object_key(): void
    {
        [$creator, $workspace] = $this->creator();
        $response = $this->actingAs($creator)->post('/api/v1/file-entries', [
            'file' => UploadedFile::fake()->image('photo.png'),
            'filename' => 'predictable-shared-name.png',
            'workspaceId' => $workspace->id,
            'uploadType' => 'linkImages',
        ]);

        $response->assertSuccessful();
        $name = $response->json('fileEntry.file_name');
        $this->assertNotEquals('predictable-shared-name.png', $name);
        $this->assertNotEmpty($name);
    }

    public function test_tus_entry_must_have_a_server_issued_upload(): void
    {
        [$creator] = $this->creator();
        $this->actingAs($creator)->post('/api/v1/tus/entries', [
            'uploadKey' => 'forged-'.Str::random(24),
        ])->assertNotFound();
    }

    private function creator(): array
    {
        $user = User::query()->forceCreate([
            'name' => 'Security upload tester',
            'username' => Str::lower(Str::random(12)),
            'email' => Str::random(12).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        (new CreateWorkspace())->createPersonalWorkspace($user);
        $user->roles()->attach(Role::query()->where('default', true)->firstOrFail());
        return [$user, $user->workspaces()->firstOrFail()];
    }
}
