<?php

namespace Tests\Feature;

use App\Models\User;
use Common\Database\Seeders\RolesTableSeeder;
use Common\Files\Uploads\SecureUpload;
use Common\Files\Uploads\UploadGrant;
use Common\Roles\Models\Role;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SecureUploadBoundaryTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesTableSeeder::class);
        Cache::flush();
    }

    public function testGuestCannotUploadFiles(): void
    {
        $this->stateful()
            ->post('/api/v1/file-entries', [
                'uploadType' => 'linkImages',
                'file' => UploadedFile::fake()->image('cover.png'),
            ])
            ->assertStatus(401);
    }

    public function testForgedOwnerIsRejectedBeforeStorage(): void
    {
        [$user, $workspace] = $this->creator();
        [$other] = $this->creator();

        $this->upload($user, [
            'workspaceId' => $workspace->id,
            'ownerId' => $other->id,
        ])->assertForbidden();
    }

    public function testClientProvidedStorageFilenameIsRejected(): void
    {
        [$user, $workspace] = $this->creator();

        $this->upload($user, [
            'workspaceId' => $workspace->id,
            'filename' => 'known-existing-asset.png',
        ])->assertForbidden();
    }

    public function testForeignWorkspaceIsRejected(): void
    {
        [$user] = $this->creator();
        [, $otherWorkspace] = $this->creator();

        $this->upload($user, [
            'workspaceId' => $otherWorkspace->id,
        ])->assertForbidden();
    }

    public function testUnknownBackendIsRejected(): void
    {
        [$user, $workspace] = $this->creator();

        $this->upload($user, [
            'workspaceId' => $workspace->id,
            'backendId' => 'nonexistent-attacker-backend',
        ])->assertStatus(422);
    }

    public function testOwnUploadHasServerGeneratedNameAndCorrectOwner(): void
    {
        [$user, $workspace] = $this->creator();

        $response = $this->upload($user, [
            'workspaceId' => $workspace->id,
        ]);
        $response->assertSuccessful();
        $this->assertDatabaseHas('file_entries', [
            'owner_id' => $user->id,
            'workspace_id' => $workspace->id,
        ]);
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f-]{36}\.[a-z0-9]+$/',
            (string) $response->json('fileEntry.file_name'),
        );
    }

    public function testS3UploadGrantCannotBeUsedByAnotherUserOrReplayed(): void
    {
        [$user, $workspace] = $this->creator();
        [$other] = $this->creator();

        $this->actingAs($user);
        $request = Request::create('/api/v1/s3/entries', 'POST');
        $request->setUserResolver(fn () => $user);
        $metadata = app(SecureUpload::class)->prepare($request, [
            'workspaceId' => $workspace->id,
            'uploadType' => 'linkImages',
            'clientName' => 'cover.png',
            'clientExtension' => 'png',
            'clientMime' => 'image/png',
            'clientSize' => 16,
        ])['metadata'];
        $grant = app(UploadGrant::class)->issue($request, $metadata, 'some-server-key', 'simple');

        $foreignRequest = Request::create('/api/v1/s3/entries', 'POST');
        $foreignRequest->setUserResolver(fn () => $other);
        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        app(UploadGrant::class)->resolve($foreignRequest, $grant, 'simple');
    }

    private function creator(): array
    {
        $user = User::query()->forceCreate([
            'name' => 'Uploader',
            'username' => 'upload'.strtolower(uniqid()),
            'email' => uniqid().'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($user);
        $user->roles()->attach(Role::query()->where('default', true)->firstOrFail());
        return [$user, $workspace];
    }

    private function upload(User $user, array $metadata)
    {
        return $this->stateful()->actingAs($user)->post(
            '/api/v1/file-entries',
            [
                'file' => UploadedFile::fake()->image('cover.png'),
                'uploadType' => 'linkImages',
                ...$metadata,
            ],
        );
    }

    private function stateful(): static
    {
        $token = 'test-csrf-token';
        return $this->withSession(['_token' => $token])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $token);
    }
}
