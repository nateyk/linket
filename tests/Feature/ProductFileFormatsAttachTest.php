<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\DigitalProductMutationService;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ProductFileFormatsAttachTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    /**
     * Every sellable format from App\Storefront\ProductFileFormats attaches.
     *
     * @test
     *
     * @dataProvider sellableFormatProvider
     */
    public function testSellableFormatAttaches(string $extension, string $mime): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $file = $this->createFile($creator, $workspace, $extension, $mime);
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

        $this->assertSame([$file->id], $product->files()->pluck('file_entries.id')->all());
    }

    public static function sellableFormatProvider(): array
    {
        return [
            'pdf' => ['pdf', 'application/pdf'],
            'epub' => ['epub', 'application/epub+zip'],
            'zip' => ['zip', 'application/zip'],
            'txt' => ['txt', 'text/plain'],
            'mp3' => ['mp3', 'audio/mpeg'],
            'm4a' => ['m4a', 'audio/mp4'],
            'wav' => ['wav', 'audio/wav'],
        ];
    }

    /**
     * @test
     *
     * @dataProvider rejectedFormatProvider
     */
    public function testNonSellableFormatIsRejected(string $extension, string $mime): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $file = $this->createFile($creator, $workspace, $extension, $mime);
        ActiveWorkspace::clearCache();
        $this->actingAs($creator);

        try {
            app(DigitalProductMutationService::class)->create(
                [
                    'title' => 'Guide',
                    'price_cents' => 1000,
                    'file_ids' => [$file->id],
                ],
                $creator,
                null,
            );

            $this->fail("Expected a .{$extension} file to be rejected.");
        } catch (HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
        }
    }

    public static function rejectedFormatProvider(): array
    {
        return [
            'aac (advertised by old UI, never sellable)' => ['aac', 'audio/aac'],
            'mobi (advertised by old ebook copy, never sellable)' => ['mobi', 'application/x-mobipocket-ebook'],
            'mp4 (legacy attach-list format, not a product format)' => ['mp4', 'video/mp4'],
            'png (legacy attach-list format, not a product format)' => ['png', 'image/png'],
        ];
    }

    /** @test */
    public function testLegacyAttachedFilesKeepWorkingOnUpdate(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $pdf = $this->createFile($creator, $workspace, 'pdf', 'application/pdf');
        $legacyPng = $this->createFile($creator, $workspace, 'png', 'image/png');
        ActiveWorkspace::clearCache();
        $this->actingAs($creator);

        $product = app(DigitalProductMutationService::class)->create(
            [
                'title' => 'Guide',
                'price_cents' => 1000,
                'file_ids' => [$pdf->id],
            ],
            $creator,
            null,
        );

        // Simulate a file attached before the sellable set was tightened.
        $product->files()->attach($legacyPng->id);

        $updated = app(DigitalProductMutationService::class)->update(
            $product->fresh(),
            [
                'title' => 'Guide v2',
                'file_ids' => [$pdf->id, $legacyPng->id],
            ],
            null,
        );

        $this->assertEqualsCanonicalizing(
            [$pdf->id, $legacyPng->id],
            $updated->files()->pluck('file_entries.id')->all(),
        );
    }

    /** @test */
    public function testNewLegacyFileCannotBeAttached(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $pdf = $this->createFile($creator, $workspace, 'pdf', 'application/pdf');
        $newPng = $this->createFile($creator, $workspace, 'png', 'image/png');
        ActiveWorkspace::clearCache();
        $this->actingAs($creator);

        $product = app(DigitalProductMutationService::class)->create(
            [
                'title' => 'Guide',
                'price_cents' => 1000,
                'file_ids' => [$pdf->id],
            ],
            $creator,
            null,
        );

        try {
            app(DigitalProductMutationService::class)->update(
                $product->fresh(),
                ['file_ids' => [$pdf->id, $newPng->id]],
                null,
            );

            $this->fail('Expected a newly attached legacy file to be rejected.');
        } catch (HttpException $exception) {
            $this->assertSame(422, $exception->getStatusCode());
        }
    }

    /** @test */
    public function testTypedProductsAttachTheirKindFormats(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $pdf = $this->createFile($creator, $workspace, 'pdf', 'application/pdf');
        $mp3 = $this->createFile($creator, $workspace, 'mp3', 'audio/mpeg');
        ActiveWorkspace::clearCache();
        $this->actingAs($creator);

        // Attachment enforces the sellable union; per-type guidance lives in
        // the UI. An mp3 is sellable regardless of the product type label.
        $ebook = app(DigitalProductMutationService::class)->create(
            [
                'title' => 'E-book',
                'price_cents' => 1000,
                'type' => 'ebook',
                'file_ids' => [$pdf->id],
            ],
            $creator,
            null,
        );
        $this->assertSame('ebook', $ebook->type);

        $audio = app(DigitalProductMutationService::class)->create(
            [
                'title' => 'Audio',
                'price_cents' => 1000,
                'type' => 'audio',
                'file_ids' => [$mp3->id],
            ],
            $creator,
            null,
        );
        $this->assertSame('audio', $audio->type);
    }

    /** @test */
    public function testEndpointRejectsAacButAcceptsPdf(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $aac = $this->createFile($creator, $workspace, 'aac', 'audio/aac');
        $pdf = $this->createFile($creator, $workspace, 'pdf', 'application/pdf');
        ActiveWorkspace::clearCache();

        $rejected = $this->stateful()->actingAs($creator)
            ->postJson("/api/v1/items?workspace_id={$workspace->id}", [
                'title' => 'AAC Product',
                'price_cents' => 1000,
                'file_ids' => [$aac->id],
            ]);
        $rejected->assertStatus(422);

        $accepted = $this->stateful()->actingAs($creator)
            ->postJson("/api/v1/items?workspace_id={$workspace->id}", [
                'title' => 'PDF Product',
                'price_cents' => 1000,
                'file_ids' => [$pdf->id],
            ]);
        $accepted->assertCreated();
    }

    private function createCreator(): User
    {
        $token = Str::lower(Str::random(12));

        return User::query()->forceCreate([
            'name' => 'Creator '.$token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }

    private function createFile(User $creator, Workspace $workspace, string $extension, string $mime): FileEntry
    {
        return FileEntry::query()->create([
            'name' => "file.{$extension}",
            'file_name' => "file.{$extension}",
            'file_size' => 1024,
            'mime' => $mime,
            'extension' => $extension,
            'type' => 'file',
            'public' => false,
            'user_id' => (string) $creator->id,
            'disk_prefix' => 'digital-products',
            'workspace_id' => $workspace->id,
        ]);
    }
}
