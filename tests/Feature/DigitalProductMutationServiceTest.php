<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\DigitalProductMutationService;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class DigitalProductMutationServiceTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();

        parent::tearDown();
    }

    public function testCreatesProductAndSynchronizesItsFiles(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $file = $this->createFile($creator, $workspace);
        ActiveWorkspace::clearCache();
        $this->actingAs($creator);

        $product = app(DigitalProductMutationService::class)->create(
            [
                'title' => 'Guide',
                'price_cents' => 1000,
                'file_ids' => [$file->id],
            ],
            $creator,
            null,
        );

        $this->assertSame($workspace->id, $product->workspace_id);
        $this->assertSame([$file->id], $product->files()->pluck('file_entries.id')->all());
    }

    public function testRejectsFileFromAnotherWorkspace(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $foreignCreator = $this->createCreator();
        $foreignWorkspace = (new CreateWorkspace())->createPersonalWorkspace($foreignCreator);
        $foreignFile = $this->createFile($foreignCreator, $foreignWorkspace);
        ActiveWorkspace::clearCache();
        $this->actingAs($creator);

        try {
            app(DigitalProductMutationService::class)->create(
                [
                    'title' => 'Guide',
                    'price_cents' => 1000,
                    'file_ids' => [$foreignFile->id],
                ],
                $creator,
                null,
            );

            $this->fail('Expected a cross-workspace file to be rejected.');
        } catch (HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
        }

        $this->assertDatabaseMissing('digital_products', [
            'workspace_id' => $workspace->id,
            'title' => 'Guide',
        ]);
    }

    public function testUpdatePreservesCourseFilesWhenFileIdsAreOmitted(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $file = $this->createFile($creator, $workspace);
        ActiveWorkspace::clearCache();
        $this->actingAs($creator);
        $product = $this->createCourseProduct($creator, $file);

        $updated = app(DigitalProductMutationService::class)->update(
            $product,
            ['title' => 'Updated course'],
            null,
        );

        $this->assertSame([$file->id], $updated->files()->pluck('file_entries.id')->all());
    }

    public function testUpdateClearsCourseFilesWhenFileIdsAreExplicitlyEmpty(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $file = $this->createFile($creator, $workspace);
        ActiveWorkspace::clearCache();
        $this->actingAs($creator);
        $product = $this->createCourseProduct($creator, $file);

        $updated = app(DigitalProductMutationService::class)->update(
            $product,
            ['file_ids' => []],
            null,
        );

        $this->assertSame([], $updated->files()->pluck('file_entries.id')->all());
    }

    private function createCreator(): User
    {
        $token = Str::lower(Str::random(12));

        return User::query()->forceCreate([
            'name' => 'Creator ' . $token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }

    private function createFile(User $creator, Workspace $workspace): FileEntry
    {
        return FileEntry::query()->create([
            'name' => 'guide.pdf',
            'file_name' => 'guide.pdf',
            'file_size' => 1024,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'public' => false,
            'user_id' => (string) $creator->id,
            'disk_prefix' => 'digital-products',
            'workspace_id' => $workspace->id,
        ]);
    }

    private function createCourseProduct(User $creator, FileEntry $file): \App\Storefront\Models\DigitalProduct
    {
        return app(DigitalProductMutationService::class)->create(
            [
                'title' => 'Course',
                'price_cents' => 1000,
                'type' => 'course',
                'file_ids' => [$file->id],
            ],
            $creator,
            null,
        );
    }
}
