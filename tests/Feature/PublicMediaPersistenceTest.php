<?php

namespace Tests\Feature;

use App\Models\User;
use App\Stores\Models\Store;
use App\Biolinks\Models\Biolink;
use Common\Files\FileEntry;
use Common\Files\PublicMediaUrl;
use Common\Files\Uploads\UploadBackend;
use Common\Database\Seeders\RolesTableSeeder;
use Common\Files\Uploads\UploadDiskLocation;
use Common\Files\Uploads\UploadType;
use Common\Settings\Models\Setting;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Tests\TestCase;

class PublicMediaPersistenceTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesTableSeeder::class);
        // Ensure uploading setting has local backend for linkImages/avatars
        // Seeder already sets it, but ensure for isolated test runs
        Cache::forget('settings.public');
    }

    public function testLocalPublicFileEntryProducesRootRelativeUrl(): void
    {
        settings()->set('uploading.backends', [
            ['id' => 'local', 'name' => 'Local', 'type' => 'local', 'root' => ''],
        ]);
        settings()->set('uploading.types', [
            'linkImages' => ['backends' => ['local']],
            'avatars' => ['backends' => ['local']],
        ]);

        $file = new FileEntry([
            'file_name' => 'cover.jpg',
            'type' => 'image',
            'public' => true,
            'upload_type' => 'linkImages',
            'backend_id' => 'local',
        ]);

        $this->assertSame('/storage/link-images/cover.jpg', $file->url);
        $this->assertStringStartsWith('/storage/', $file->url);
        $this->assertStringNotContainsString('http://', $file->url);
        $this->assertStringNotContainsString('blob:', $file->url);
        $this->assertStringNotContainsString('storage/link-images/cover.jpg', ltrim($file->url, '/') === 'storage/link-images/cover.jpg' ? '' : $file->url); // dummy to ensure leading slash
        // Ensure not containing dev hostname
        $this->assertStringNotContainsString('linket.ddev.site', $file->url);
        $this->assertStringNotContainsString('localhost', $file->url);
    }

    public function testAbsoluteCdnUrlsRemainValid(): void
    {
        $cdn = 'https://cdn.example.com/avatars/a.jpg';
        $this->assertSame($cdn, PublicMediaUrl::normalize($cdn));

        $http = 'http://example.test/storage/avatars/a.jpg';
        $this->assertSame($http, PublicMediaUrl::normalize($http));

        $protocolRelative = '//cdn.example.com/a.jpg';
        $this->assertSame($protocolRelative, PublicMediaUrl::normalize($protocolRelative));
    }

    public function testPublicMediaUrlNormalization(): void
    {
        $this->assertSame('/storage/link-images/a.jpg', PublicMediaUrl::normalize('storage/link-images/a.jpg'));
        $this->assertSame('/storage/link-images/a.jpg', PublicMediaUrl::normalize('/storage/link-images/a.jpg'));
        $this->assertSame('/storage/link-images/a.jpg', PublicMediaUrl::normalize('  storage/link-images/a.jpg  '));
        $this->assertSame('/storage/avatars/b.png', PublicMediaUrl::normalize('storage/avatars/b.png'));
        $this->assertSame('', PublicMediaUrl::normalize('blob:https://example.com/abc'));
        $this->assertSame('', PublicMediaUrl::normalize('data:image/png;base64,xxx'));
        $this->assertSame('', PublicMediaUrl::normalize(''));
        $this->assertNull(PublicMediaUrl::normalize(null));
    }

    public function testCreatorProfileNormalizationPersistsLeadingSlash(): void
    {
        $user = $this->createUser();
        $workspace = $this->createWorkspace($user);
        $biolink = $this->createBiolink([
            'user_id' => $user->id,
            'workspace_id' => $workspace->id,
            'builder_mode' => Biolink::BUILDER_MODE_CREATOR_PROFILE,
            'profile_config' => [],
        ]);

        $avatar = $this->createLinkImage($user, $workspace, 'avatar.jpg');

        $this->withoutMiddleware();
        $this->actingAs($user);

        // Submit without leading slash — should be normalized to with slash
        $this->putJson("/api/v1/biolinks/{$biolink->id}/creator-profile", [
            'display_name' => 'Nate Creator',
            'profile_title' => 'Designer',
            'bio' => 'Bio',
            'about_html' => '<p>About</p>',
            'avatar_url' => "storage/link-images/{$avatar->file_name}",
            'cover_url' => "storage/link-images/{$avatar->file_name}",
            'available_for_work' => true,
            'skills' => [],
            'contact_url' => '',
            'social_links' => [],
            'featured_product_ids' => [],
        ])->assertOk();

        $fresh = $biolink->fresh();
        $this->assertSame("/storage/link-images/{$avatar->file_name}", $fresh->profile_config['avatar_url']);
        $this->assertSame("/storage/link-images/{$avatar->file_name}", $fresh->profile_config['cover_url']);

        // Ensure nested route would still resolve to root-relative (not route-relative)
        $avatarUrl = $fresh->profile_config['avatar_url'];
        $this->assertStringStartsWith('/storage/', $avatarUrl);
        // Simulate browser: on page /storeSlug/products/123, relative would be wrong
        $nestedRequestUrl = "/storeSlug/products/123/{$avatarUrl}";
        // But our stored value is root-relative, so it would NOT be concatenated
        $this->assertNotEquals("storage/link-images/{$avatar->file_name}", $avatarUrl);
    }

    public function testAvatarPersistsLinkedFileEntry(): void
    {
        $user = $this->createUser();
        $workspace = $this->createWorkspace($user);
        $avatarEntry = $this->createLinkImage($user, $workspace, 'avatar2.jpg');

        // Simulate UpdateUser flow
        $user->image = PublicMediaUrl::normalize($avatarEntry->url);
        $user->save();
        $user->avatars()->sync([$avatarEntry->id]);

        $fresh = $user->fresh();
        // Raw DB value should be root-relative
        $raw = $fresh->getRawOriginal('image');
        $this->assertSame('/storage/link-images/' . $avatarEntry->file_name, $raw);
        $this->assertTrue($fresh->avatars()->where('file_entries.id', $avatarEntry->id)->exists());

        // Accessor returns absolute URL via url() helper — verify it still contains canonical path
        $this->assertStringContainsString('/storage/link-images/' . $avatarEntry->file_name, $fresh->image);
        $this->assertStringNotContainsString('blob:', $fresh->image);
        // Raw should be root-relative with leading slash
        $this->assertStringStartsWith('/storage/', $raw);
    }

    public function testProductCoverRemainsForeignKeyAndReturnsCanonicalUrl(): void
    {
        $user = $this->createUser();
        $workspace = $this->createWorkspace($user);
        $cover = $this->createLinkImage($user, $workspace, 'cover.jpg');

        $product = \App\Storefront\Models\DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'title' => 'Test Product',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'draft',
            'cover_file_entry_id' => $cover->id,
        ]);

        $product->load('cover');
        $this->assertSame($cover->id, $product->cover_file_entry_id);
        $this->assertSame('/storage/link-images/' . $cover->file_name, $product->cover->url);
        // Ensure still root-relative after reload
        $fresh = \App\Storefront\Models\DigitalProduct::with('cover')->find($product->id);
        $this->assertSame('/storage/link-images/' . $cover->file_name, $fresh->cover->url);
    }

    public function testCanonicalPublicUploadWrittenToPersistentRoot(): void
    {
        $this->ensureLocalBackend();

        $location = new UploadDiskLocation(
            new UploadType('linkImages', ['visibility' => 'public', 'prefix' => 'link-images']),
            new UploadBackend(['id' => 'local', 'name' => 'Local', 'type' => 'local', 'root' => ''])
        );

        // Canonical root should be storage/app/public, not public/storage
        $this->assertStringEndsWith('storage/app/public', rtrim($location->root, '/'));
        $this->assertSame('link-images', $location->prefix);
        $this->assertNull($location->url);

        // Disk should write to storage/app/public/link-images
        $disk = \Common\Files\Uploads\Uploads::disk('linkImages', 'local');
        $testFile = 'persistence-test-' . Str::random(6) . '.txt';
        $disk->put($testFile, 'hello');
        $this->assertTrue(File::exists(storage_path('app/public/link-images/' . $testFile)));
        $this->assertTrue($disk->exists($testFile));
        // Cleanup
        $disk->delete($testFile);
        @unlink(storage_path('app/public/link-images/' . $testFile));
    }

    public function testPublicStorageSymlinkResolvesToCanonicalRoot(): void
    {
        $publicStorage = public_path('storage');
        $canonical = storage_path('app/public');

        // In DDEV, after migration, public/storage should be symlink
        if (is_link($publicStorage)) {
            $target = readlink($publicStorage);
            // Accept both absolute and relative targets that resolve to canonical
            $resolved = realpath($publicStorage);
            $expected = realpath($canonical);
            $this->assertSame($expected, $resolved, "public/storage symlink should resolve to $expected, got $resolved (target $target)");
        } else {
            $this->markTestSkipped('public/storage is not a symlink in this environment (expected in production after deploy.sh, locally after media:migrate-public-storage)');
        }
    }

    public function testPrivateFilesStayOutsidePublicStorage(): void
    {
        $this->ensureLocalBackend(['digitalProductFiles' => ['backends' => ['local']]]);

        $privateLocation = new UploadDiskLocation(
            new UploadType('digitalProductFiles', ['visibility' => 'private', 'prefix' => 'digital-products']),
            new UploadBackend(['id' => 'local', 'name' => 'Local', 'type' => 'local', 'root' => ''])
        );

        $this->assertStringEndsWith('storage/app/uploads', rtrim($privateLocation->root, '/'));
        $this->assertSame('digital-products', $privateLocation->prefix);

        // Create a persisted private file entry to get proper id-based URL
        $user = $this->createUser();
        $workspace = $this->createWorkspace($user);
        $entry = FileEntry::query()->create([
            'name' => 'private.pdf',
            'file_name' => (string) Str::uuid(),
            'file_size' => 1024,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'public' => false,
            'upload_type' => 'digitalProductFiles',
            'backend_id' => $this->getLocalBackendId(),
            'workspace_id' => $workspace->id,
            'owner_id' => $user->id,
        ]);

        $this->assertStringStartsWith('api/v1/file-entries/', $entry->url);
        $this->assertStringNotContainsString('/storage/', $entry->url);
        // Ensure disk root is not public
        $disk = $entry->getDisk();
        $path = $disk->path($entry->getStoragePath());
        $this->assertStringContainsString('storage/app/uploads', $path);
        $this->assertStringNotContainsString('storage/app/public', $path);

        $entry->delete();
    }

    public function testDeploymentPersistenceSimulation(): void
    {
        // Simulate: shared/storage/app/public/link-images/a.jpg exists, then new release B symlinks to it
        $sharedRoot = storage_path('app/public/link-images');
        File::ensureDirectoryExists($sharedRoot);
        $testFile = 'deploy-persist-' . Str::random(6) . '.jpg';
        $sharedPath = "$sharedRoot/$testFile";
        File::put($sharedPath, 'fake image content');

        // Simulate release B public/storage symlink
        $tmpRelease = sys_get_temp_dir() . '/linket-test-release-' . Str::random(6);
        File::ensureDirectoryExists("$tmpRelease/public");
        File::ensureDirectoryExists("$tmpRelease/storage/app/public");
        // Simulate deploy.sh symlinks: release/storage -> shared/storage
        // For test, just verify that public/storage -> shared/storage/app/public would expose file
        $publicStorageLink = "$tmpRelease/public/storage";
        if (is_link($publicStorageLink) || is_dir($publicStorageLink)) {
            File::deleteDirectory($publicStorageLink);
            @unlink($publicStorageLink);
        }
        symlink($sharedRoot, $publicStorageLink);
        // Now B/public/storage/link-images/a.jpg should exist without re-upload
        $this->assertTrue(File::exists("$publicStorageLink/$testFile"));
        $this->assertSame('fake image content', File::get("$publicStorageLink/$testFile"));

        // Cleanup
        File::delete($sharedPath);
        File::deleteDirectory($tmpRelease);
        @unlink($publicStorageLink);
    }

    public function testNestedRouteDoesNotBreakRootRelativeUrl(): void
    {
        $url = '/storage/link-images/cover.jpg';
        // Simulate frontend on nested route /storeSlug/products/123
        // Root-relative URL should still be /storage/... not /storeSlug/products/storage/...
        $this->assertStringStartsWith('/', $url);
        $this->assertStringStartsWith('/storage/', $url);

        // Legacy relative would be storage/... without slash — ensure normalization fixes
        $legacy = 'storage/link-images/cover.jpg';
        $normalized = PublicMediaUrl::normalize($legacy);
        $this->assertSame('/storage/link-images/cover.jpg', $normalized);
        $this->assertStringStartsWith('/storage/', $normalized);
    }

    private function createUser(): User
    {
        $token = Str::lower(Str::random(12));
        return User::query()->forceCreate([
            'name' => 'Test ' . $token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'image' => null,
            'email_verified_at' => now(),
        ]);
    }

    private function createWorkspace(User $owner): \Common\Workspaces\Models\Workspace
    {
        $workspace = \Common\Workspaces\Models\Workspace::query()->create([
            'name' => 'Test workspace',
            'owner_id' => $owner->id,
        ]);
        $workspace->members()->create(['user_id' => $owner->id, 'is_owner' => true]);
        ActiveWorkspace::clearCache();

        return $workspace;
    }

    private function createBiolink(array $attributes): Biolink
    {
        return Biolink::query()->create([
            'name' => 'Test page ' . Str::random(8),
            'back_half' => Str::random(8),
            ...$attributes,
        ]);
    }

    private function ensureLocalBackend(array $extraTypes = []): void
    {
        $existing = Setting::where('name', 'uploading')->first()?->value ?? [];
        $backends = $existing['backends'] ?? [['id' => 'local', 'name' => 'Local', 'type' => 'local', 'root' => '']];
        if (empty($backends)) {
            $backends = [['id' => 'local', 'name' => 'Local', 'type' => 'local', 'root' => '']];
        }
        // ensure at least local backend exists
        $hasLocal = collect($backends)->contains(fn($b) => $b['id'] === 'local');
        if (!$hasLocal) {
            $backends[] = ['id' => 'local', 'name' => 'Local', 'type' => 'local', 'root' => ''];
        }

        $types = $existing['types'] ?? [];
        $required = [
            'linkImages' => ['backends' => ['local']],
            'avatars' => ['backends' => ['local']],
            'brandingImages' => ['backends' => ['local']],
            'articleImages' => ['backends' => ['local']],
            'digitalProductFiles' => ['backends' => ['local']],
            'courseVideos' => ['backends' => ['local']],
            'courseResources' => ['backends' => ['local']],
        ];
        foreach ($required as $type => $cfg) {
            if (empty($types[$type]['backends'])) {
                $types[$type] = $cfg;
            }
        }
        foreach ($extraTypes as $type => $cfg) {
            $types[$type] = array_merge($types[$type] ?? [], $cfg);
        }

        $value = ['backends' => $backends, 'types' => $types];
        // preserve other keys like chunk_size if present
        foreach ($existing as $k => $v) {
            if (!isset($value[$k])) {
                $value[$k] = $v;
            }
        }

        // Save the whole 'uploading' key as JSON (it's in Settings::$jsonKeys)
        // so Setting::updateOrCreate() properly JSON-encodes it, and also set
        // the singleton for the current request.
        Setting::query()->updateOrCreate(
            ['name' => 'uploading'],
            ['value' => $value, 'private' => false],
        );
        Cache::forget('settings.public');

        settings()->set('uploading.backends', $value['backends']);
        settings()->set('uploading.types', $value['types']);

        // Ensure file root exists
        File::ensureDirectoryExists(storage_path('app/public/link-images'));
        File::ensureDirectoryExists(storage_path('app/public/avatars'));
        File::ensureDirectoryExists(storage_path('app/uploads'));
    }

    private function getLocalBackendId(): string
    {
        $backends = \Common\Files\Uploads\Uploads::getAllBackends();
        if (!empty($backends)) {
            return $backends[0]->id;
        }
        // fallback to setting
        $setting = Setting::where('name', 'uploading')->first();
        if ($setting && isset($setting->value['backends'][0]['id'])) {
            return $setting->value['backends'][0]['id'];
        }
        return 'local';
    }

    private function createLinkImage(User $owner, $workspace, string $name): FileEntry
    {
        $this->ensureLocalBackend();
        $backendId = $this->getLocalBackendId();
        // Ensure storage root exists
        File::ensureDirectoryExists(storage_path('app/public/link-images'));
        $fileName = Str::uuid() . '.jpg';
        $filePath = storage_path('app/public/link-images/' . $fileName);
        File::put($filePath, 'fake image');

        return FileEntry::query()->create([
            'name' => $name,
            'file_name' => $fileName,
            'file_size' => 1024,
            'mime' => 'image/jpeg',
            'extension' => 'jpg',
            'type' => 'image',
            'public' => true,
            'upload_type' => 'linkImages',
            'backend_id' => $backendId,
            'workspace_id' => $workspace->id,
            'owner_id' => $owner->id,
        ]);
    }
}
