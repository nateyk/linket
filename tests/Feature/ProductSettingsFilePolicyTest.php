<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Database\Seeders\RolesTableSeeder;
use Common\Files\FileEntry;
use Common\Settings\Models\Setting;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductSettingsFilePolicyTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesTableSeeder::class);
        settings()->save(['billing.enable' => true]);

        if (!\Common\Billing\Models\Product::where('is_default', true)->exists()) {
            $existing = \Common\Billing\Models\Product::where('free', true)->first();
            if ($existing) {
                $existing->update(['is_default' => true]);
            } else {
                \Common\Billing\Models\Product::create([
                    'name' => 'Free',
                    'uuid' => Str::uuid(),
                    'free' => true,
                    'is_default' => true,
                    'position' => 1,
                    'storefront_benefits' => config('storefront.default_benefits'),
                ]);
            }
        }
    }

    protected function tearDown(): void
    {
        Setting::query()
            ->whereIn('name', ['product.max_file_bytes'])
            ->delete();
        settings()->loadSettings();
        ActiveWorkspace::clearCache();

        parent::tearDown();
    }

    public function testUploadTimePlatformCapEnforced(): void
    {
        [$creator, $workspace] = $this->createCreatorWithRole();
        settings()->save(['product.max_file_bytes' => 100]);

        $oversized = \Illuminate\Http\UploadedFile::fake()->createWithContent(
            'big.pdf',
            "%PDF-1.4\n% Linket test PDF\n" . str_repeat('A', 1024),
        );

        $rejected = $this->stateful()->actingAs($creator)->post(
            '/api/v1/file-entries',
            [
                'file' => $oversized,
                'workspaceId' => $workspace->id,
                'uploadType' => 'digitalProductFiles',
            ],
        );
        $rejected->assertStatus(422);

        $small = \Illuminate\Http\UploadedFile::fake()->createWithContent(
            'small.pdf',
            "%PDF-1.4\n% Linket test PDF",
        );

        $accepted = $this->stateful()->actingAs($creator)->post(
            '/api/v1/file-entries',
            [
                'file' => $small,
                'workspaceId' => $workspace->id,
                'uploadType' => 'digitalProductFiles',
            ],
        );
        $accepted->assertStatus(200);
    }

    public function testAttachTimePlatformCapEnforced(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $file = $this->createFile($creator, $workspace, 1024);
        settings()->save(['product.max_file_bytes' => 100]);

        $rejected = $this->stateful()->actingAs($creator)->post(
            '/api/v1/items',
            [
                'title' => 'Heavy Guide',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $rejected->assertStatus(422);

        Setting::query()->where('name', 'product.max_file_bytes')->delete();
        settings()->loadSettings();

        $accepted = $this->stateful()->actingAs($creator)->post(
            '/api/v1/items',
            [
                'title' => 'Heavy Guide',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $accepted->assertStatus(201);
    }

    public function testPlatformCapNeverLoosensEntitlement(): void
    {
        [$creator, $workspace] = $this->createCreatorWithRole();

        $plan = $creator->getSubscriptionProduct();
        $plan->update(['storefront_benefits' => array_merge($plan->storefront_benefits ?? [], [
            'max_upload_bytes' => 200,
        ])]);
        $creator->refresh();
        settings()->save(['product.max_file_bytes' => 1073741824]);

        $file = \Illuminate\Http\UploadedFile::fake()->createWithContent(
            'file.pdf',
            "%PDF-1.4\n% Linket test PDF\n" . str_repeat('B', 1024),
        );

        $response = $this->stateful()->actingAs($creator)->post(
            '/api/v1/file-entries',
            [
                'file' => $file,
                'workspaceId' => $workspace->id,
                'uploadType' => 'digitalProductFiles',
            ],
        );
        $response->assertStatus(422);
    }

    public function testUnderCapFileAttachesFine(): void
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        $file = $this->createFile($creator, $workspace, 1024);
        settings()->save(['product.max_file_bytes' => 10485760]);

        $response = $this->stateful()->actingAs($creator)->post(
            '/api/v1/items',
            [
                'title' => 'Light Guide',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$file->id],
            ],
        );
        $response->assertStatus(201);
    }

    public function testUnsetCapPreservesBehavior(): void
    {
        [$creator, $workspace] = $this->createCreatorWithRole();

        $file = \Illuminate\Http\UploadedFile::fake()->createWithContent(
            'file.pdf',
            "%PDF-1.4\n% Linket test PDF",
        );

        $upload = $this->stateful()->actingAs($creator)->post(
            '/api/v1/file-entries',
            [
                'file' => $file,
                'workspaceId' => $workspace->id,
                'uploadType' => 'digitalProductFiles',
            ],
        );
        $upload->assertStatus(200);

        $entryId = $upload->json('fileEntry.id');
        $this->assertNotNull($entryId);

        $created = $this->stateful()->actingAs($creator)->post(
            '/api/v1/items',
            [
                'title' => 'Guide',
                'price_cents' => 1000,
                'currency' => 'ETB',
                'file_ids' => [$entryId],
            ],
        );
        $created->assertStatus(201);
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    /**
     * @return array{User, Workspace}
     */
    private function createCreatorWithRole(): array
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();

        $role = \Common\Roles\Models\Role::where('default', true)->first();
        $creator->roles()->attach($role->id);

        return [$creator, $workspace];
    }

    private function createCreator(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'Creator ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        if (!Workspace::query()->where('owner_id', $user->id)->where('is_personal', true)->exists()) {
            (new CreateWorkspace())->createPersonalWorkspace($user);
        }

        return $user;
    }

    private function createFile(User $creator, Workspace $workspace, int $size = 100): FileEntry
    {
        return FileEntry::query()->create([
            'name' => 'test.pdf',
            'file_name' => 'test.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => $size,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
    }
}
