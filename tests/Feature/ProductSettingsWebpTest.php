<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Jobs\ConvertProductCoverToWebp;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\ProductSettings;
use Common\Files\FileEntry;
use Common\Roles\Models\Role;
use Common\Settings\Models\Setting;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductSettingsWebpTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Setting::query()->where('name', 'like', 'product.%')->delete();
        settings()->loadSettings();
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testConvertsJpgCoverToWebpAndKeepsOriginal(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $cover = $this->createImageEntry($creator, $workspace, 'jpg');
        $product = $this->product($workspace, $creator, ['cover_file_entry_id' => $cover->id]);

        (new ConvertProductCoverToWebp($product->id, $cover->id))->handle();

        $fresh = $product->fresh();
        $this->assertNotSame($cover->id, $fresh->cover_file_entry_id);

        $newCover = FileEntry::query()->findOrFail($fresh->cover_file_entry_id);
        $this->assertSame('image/webp', $newCover->mime);
        $this->assertSame('webp', $newCover->extension);

        // Original is retained.
        $this->assertNotNull(FileEntry::query()->find($cover->id));
    }

    public function testDoesNothingWhenSettingDisabled(): void
    {
        settings()->save(['product.convert_covers_to_webp' => 0]);
        [$creator, $workspace] = $this->creatorContext();
        $cover = $this->createImageEntry($creator, $workspace, 'jpg');
        $product = $this->product($workspace, $creator, ['cover_file_entry_id' => $cover->id]);

        (new ConvertProductCoverToWebp($product->id, $cover->id))->handle();

        $this->assertSame($cover->id, $product->fresh()->cover_file_entry_id);
    }

    public function testSkipsAlreadyWebpCover(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $cover = FileEntry::query()->create([
            'name' => 'cover.webp',
            'file_name' => 'cover.webp',
            'mime' => 'image/webp',
            'extension' => 'webp',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
            'upload_type' => 'linkImages',
            'public' => true,
        ]);
        $product = $this->product($workspace, $creator, ['cover_file_entry_id' => $cover->id]);

        (new ConvertProductCoverToWebp($product->id, $cover->id))->handle();

        $this->assertSame($cover->id, $product->fresh()->cover_file_entry_id);
    }

    public function testRaceGuardDoesNotClobberANewerCover(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $first = $this->createImageEntry($creator, $workspace, 'jpg');
        $second = $this->createImageEntry($creator, $workspace, 'jpg');
        $product = $this->product($workspace, $creator, ['cover_file_entry_id' => $second->id]);

        // Job was dispatched for $first, but the cover is now $second.
        (new ConvertProductCoverToWebp($product->id, $first->id))->handle();

        $this->assertSame($second->id, $product->fresh()->cover_file_entry_id);
    }

    public function testDefaultConversionIsEnabled(): void
    {
        Setting::query()->where('name', 'product.convert_covers_to_webp')->delete();
        settings()->loadSettings();

        $this->assertTrue(app(ProductSettings::class)->convertsCoversToWebp());
    }

    public function testCreateWithCoverDispatchesConversion(): void
    {
        Queue::fake();
        [$creator, $workspace] = $this->creatorContext();
        $cover = $this->createImageEntry($creator, $workspace, 'jpg');

        $this->stateful()->actingAs($creator)->postJson('/api/v1/digital-products', [
            'title' => 'With Cover',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'file_ids' => [$this->createPdfEntry($creator, $workspace)->id],
            'cover_file_entry_id' => $cover->id,
        ])->assertCreated();

        $product = DigitalProduct::query()->where('title', 'With Cover')->firstOrFail();

        Queue::assertPushed(
            ConvertProductCoverToWebp::class,
            fn ($job) => $job->productId === $product->id && $job->coverFileEntryId === $cover->id,
        );
    }

    public function testUpdateWithoutCoverChangeDoesNotDispatch(): void
    {
        Queue::fake();
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createPdfEntry($creator, $workspace);
        $product = $this->product($workspace, $creator);
        $product->files()->attach($file->id);

        $this->stateful()->actingAs($creator)->putJson("/api/v1/digital-products/{$product->id}", [
            'title' => 'Renamed',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'file_ids' => [$file->id],
        ])->assertOk();

        Queue::assertNotPushed(ConvertProductCoverToWebp::class);
    }

    public function testUpdateChangingCoverDispatchesConversion(): void
    {
        Queue::fake();
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createPdfEntry($creator, $workspace);
        $cover = $this->createImageEntry($creator, $workspace, 'jpg');
        $product = $this->product($workspace, $creator);
        $product->files()->attach($file->id);

        $this->stateful()->actingAs($creator)->putJson("/api/v1/digital-products/{$product->id}", [
            'title' => $product->title,
            'price_cents' => 1000,
            'currency' => 'ETB',
            'file_ids' => [$file->id],
            'cover_file_entry_id' => $cover->id,
        ])->assertOk();

        Queue::assertPushed(
            ConvertProductCoverToWebp::class,
            fn ($job) => $job->productId === $product->id && $job->coverFileEntryId === $cover->id,
        );
    }

    public function testUpdateChangingCoverWithSettingDisabledDoesNotDispatch(): void
    {
        Queue::fake();
        settings()->save(['product.convert_covers_to_webp' => 0]);
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createPdfEntry($creator, $workspace);
        $cover = $this->createImageEntry($creator, $workspace, 'jpg');
        $product = $this->product($workspace, $creator);
        $product->files()->attach($file->id);

        $this->stateful()->actingAs($creator)->putJson("/api/v1/digital-products/{$product->id}", [
            'title' => $product->title,
            'price_cents' => 1000,
            'currency' => 'ETB',
            'file_ids' => [$file->id],
            'cover_file_entry_id' => $cover->id,
        ])->assertOk();

        Queue::assertNotPushed(ConvertProductCoverToWebp::class);
    }

    private function createPdfEntry(User $creator, Workspace $workspace): FileEntry
    {
        return FileEntry::query()->create([
            'name' => 'guide.pdf',
            'file_name' => 'guide.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 1024,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
            'upload_type' => 'digitalProductFiles',
        ]);
    }

    private function product(Workspace $workspace, User $creator, array $attributes = []): DigitalProduct
    {
        return DigitalProduct::query()->create(array_merge([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Product ' . Str::random(6),
            'price_cents' => 1000,
            'currency' => 'ETB',
            'type' => 'digital',
        ], $attributes));
    }

    private function createImageEntry(User $creator, Workspace $workspace, string $extension): FileEntry
    {
        $image = imagecreatetruecolor(12, 12);
        imagefilledrectangle($image, 0, 0, 12, 12, imagecolorallocate($image, 200, 20, 20));

        ob_start();
        $extension === 'png' ? imagepng($image) : imagejpeg($image);
        $bytes = ob_get_clean();
        imagedestroy($image);

        $response = $this->stateful()->actingAs($creator)->post('/api/v1/file-entries', [
            'file' => UploadedFile::fake()->createWithContent("cover.{$extension}", $bytes),
            'workspaceId' => $workspace->id,
            'uploadType' => 'linkImages',
        ]);
        $response->assertOk();

        return FileEntry::query()->findOrFail($response->json('fileEntry.id'));
    }

    private function creatorContext(): array
    {
        $creator = User::query()->forceCreate([
            'name' => 'Creator ' . Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        if (!Workspace::query()->where('owner_id', $creator->id)->where('is_personal', true)->exists()) {
            (new CreateWorkspace())->createPersonalWorkspace($creator);
        }
        $creator->roles()->attach(
            Role::query()->where('default', true)->firstOrFail(),
        );
        ActiveWorkspace::clearCache();

        return [$creator, $creator->workspaces()->first()];
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
