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

    public function test_creator_cannot_assign_uploaded_entry_to_another_owner(): void
    {
        [$creator, $workspace] = $this->creator();
        [$victim] = $this->creator();
        $this->actingAs($creator)->post('/api/v1/file-entries', [
            'file' => UploadedFile::fake()->image('forged.png'),
            'ownerId' => $victim->id,
            'workspaceId' => $workspace->id,
            'uploadType' => 'linkImages',
        ])->assertForbidden();
    }

    public function test_tus_registration_rejects_a_different_authenticated_owner(): void
    {
        [$uploader] = $this->creator();
        [$attacker] = $this->creator();
        $key = 'uploaded-'.Str::random(16);
        app(\\Common\\Files\\Tus\\TusCache::class)->set($key, [
            'owner_id' => $uploader->id,
            'file_path' => storage_path('tus/unused-test'),
            'size' => 10,
            'offset' => 10,
            'metadata' => ['uploadType' => 'linkImages'],
            'expires_at' => now()->addMinutes(10)->toRfc7231String(),
        ], now()->addMinutes(10));
        try {
            $this->actingAs($attacker)->post('/api/v1/tus/entries', [
                'uploadKey' => $key,
            ])->assertForbidden();
        } finally {
            app(\\Common\\Files\\Tus\\TusCache::class)->delete($key);
        }
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
