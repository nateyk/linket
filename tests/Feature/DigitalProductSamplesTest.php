<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Files\FileEntry;
use Common\Files\Uploads\Uploads;
use Common\Settings\Models\Setting;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class DigitalProductSamplesTest extends TestCase
{
    use DatabaseTransactions;

    /** @var list<array{0: mixed, 1: string}> */
    private array $fixturePaths = [];

    protected function tearDown(): void
    {
        foreach ($this->fixturePaths as [$disk, $path]) {
            try {
                $disk->delete($path);
            } catch (\Throwable) {
            }
        }

        Setting::query()->where('name', 'like', 'product.%')->delete();
        settings()->loadSettings();
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function test_creator_can_attach_reorder_and_read_preview_tracks(): void
    {
        [$creator, $workspace, $biolink, $product, $paid] = $this->sellableProduct('audio');
        $first = $this->sampleFile($creator, $workspace, 'mp3', 'audio/mpeg', 'Midnight Signals.mp3');
        $second = $this->sampleFile($creator, $workspace, 'wav', 'audio/wav', 'Rooftop Rain.wav');

        $this->updateProduct($creator, $product, $paid, [
            'type' => 'audio',
            'sample_file_ids' => [$second->id, $first->id],
            'sample_titles' => [
                $first->id => 'Midnight Signals',
                $second->id => 'Rooftop Rain',
            ],
            'sample_durations' => [
                $second->id => 152000,
            ],
        ]);

        $shown = $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/items/{$product->id}")
            ->assertOk()
            ->json('data.samples');

        $this->assertSame(
            ['Rooftop Rain', 'Midnight Signals'],
            array_column($shown, 'title'),
        );
        $this->assertSame(['audio', 'audio'], array_column($shown, 'kind'));
        $this->assertSame([0, 1], array_column($shown, 'position'));
        $this->assertSame(152000, $shown[0]['duration_ms']);
        $this->assertSame($second->id, $shown[0]['file_entry_id']);
        $this->assertNotContains($paid->id, array_column($shown, 'file_entry_id'));
    }

    public function test_public_product_exposes_sample_url_and_hides_paid_file(): void
    {
        [$creator, $workspace, $biolink, $product, $paid] = $this->sellableProduct('audio', 'SECRET-PAID-album.zip', 'zip', 'application/zip');
        $clip = $this->sampleFile($creator, $workspace, 'mp3', 'audio/mpeg', 'preview-clip.mp3');
        $this->putSampleBytes($clip);

        $this->updateProduct($creator, $product, $paid, [
            'type' => 'audio',
            'sample_file_ids' => [$clip->id],
            'sample_titles' => [$clip->id => 'Midnight Signals'],
        ]);

        $response = $this->stateful()->getJson(
            "/api/v1/public/stores/{$biolink->id}/digital-products/{$product->id}",
        );

        $response->assertOk();
        $response->assertJsonPath('data.samples.0.title', 'Midnight Signals');
        $response->assertJsonPath('data.samples.0.kind', 'audio');
        $response->assertJsonPath('data.samples.0.position', 0);
        $response->assertJsonMissingPath('data.files');
        $response->assertJsonMissingPath('data.samples.0.file_entry_id');
        $response->assertJsonMissingPath('data.samples.0.name');

        $body = $response->getContent();
        $url = $response->json('data.samples.0.url');
        $this->assertIsString($url);
        $this->assertStringContainsString('signature=', $url);
        $this->assertStringNotContainsString('file-entries/', $url);
        $this->assertStringNotContainsString('SECRET-PAID-album.zip', $body);
        $this->assertStringNotContainsString($paid->file_name, $body);
        $this->assertStringNotContainsString('digital-product-samples', $body);
    }

    public function test_signed_sample_stream_plays_only_while_the_product_is_public(): void
    {
        [$creator, $workspace, $biolink, $product, $paid] = $this->sellableProduct('ebook');
        $pdf = $this->sampleFile($creator, $workspace, 'pdf', 'application/pdf', 'sample-pages.pdf');
        $this->putSampleBytes($pdf, '%PDF-sample');

        $this->updateProduct($creator, $product, $paid, [
            'type' => 'ebook',
            'sample_file_ids' => [$pdf->id],
            'sample_titles' => [$pdf->id => 'Chapter 1'],
        ]);

        $payload = $this->stateful()->getJson(
            "/api/v1/public/stores/{$biolink->id}/digital-products/{$product->id}",
        )->assertOk();
        $url = $payload->json('data.samples.0.url');
        $sampleId = $payload->json('data.samples.0.id');

        $stream = $this->stateful()->get($url);
        $stream->assertOk();
        ob_start();
        $stream->baseResponse->sendContent();
        $printed = ob_get_clean();
        $this->assertStringContainsString('%PDF-sample', $printed);

        $this->stateful()->get(
            "/api/v1/public/stores/{$biolink->id}/digital-products/{$product->id}/samples/{$sampleId}",
        )->assertForbidden();

        $product->update(['status' => 'draft']);
        $this->stateful()->get($url)->assertNotFound();

        $this->travel(4)->hours();
        $product->update(['status' => 'approved']);
        $this->stateful()->get($url)->assertForbidden();
    }

    public function test_raw_file_entry_url_does_not_stream_a_sample(): void
    {
        [$creator, $workspace, $biolink, $product, $paid] = $this->sellableProduct('audio');
        $clip = $this->sampleFile($creator, $workspace, 'mp3', 'audio/mpeg', 'preview-clip.mp3');
        $this->putSampleBytes($clip, 'preview-bytes');

        $this->updateProduct($creator, $product, $paid, [
            'type' => 'audio',
            'sample_file_ids' => [$clip->id],
        ]);

        $this->stateful()->actingAs($creator)
            ->get("/api/v1/file-entries/{$clip->id}")
            ->assertForbidden();
        $this->stateful()->get("/api/v1/file-entries/{$clip->id}")->assertForbidden();
    }

    public function test_rejects_sample_that_does_not_match_product_type(): void
    {
        [$creator, $workspace, , $audioProduct, $paid] = $this->sellableProduct('audio');
        $pdf = $this->sampleFile($creator, $workspace, 'pdf', 'application/pdf', 'pages.pdf');

        $this->stateful()->actingAs($creator)->putJson("/api/v1/items/{$audioProduct->id}", [
            'title' => $audioProduct->title,
            'price_cents' => $audioProduct->price_cents,
            'currency' => 'ETB',
            'type' => 'audio',
            'file_ids' => [$paid->id],
            'sample_file_ids' => [$pdf->id],
        ])->assertJsonValidationErrors('sample_file_ids');

        [$ebookCreator, $ebookWorkspace, , $ebook, $ebookPaid] = $this->sellableProduct('ebook');
        $clip = $this->sampleFile($ebookCreator, $ebookWorkspace, 'mp3', 'audio/mpeg', 'clip.mp3');
        $this->stateful()->actingAs($ebookCreator)->putJson("/api/v1/items/{$ebook->id}", [
            'title' => $ebook->title,
            'price_cents' => $ebook->price_cents,
            'currency' => 'ETB',
            'type' => 'ebook',
            'file_ids' => [$ebookPaid->id],
            'sample_file_ids' => [$clip->id],
        ])->assertJsonValidationErrors('sample_file_ids');
    }

    public function test_rejects_course_samples_over_cap_and_oversize(): void
    {
        [$creator, $workspace, , $course, $courseFile] = $this->sellableProduct('course');
        $clip = $this->sampleFile($creator, $workspace, 'mp3', 'audio/mpeg', 'clip.mp3');

        $this->stateful()->actingAs($creator)->putJson("/api/v1/items/{$course->id}", [
            'title' => $course->title,
            'price_cents' => $course->price_cents,
            'currency' => 'ETB',
            'type' => 'course',
            'file_ids' => [$courseFile->id],
            'sample_file_ids' => [$clip->id],
        ])->assertJsonValidationErrors('sample_file_ids');

        [$audioCreator, $audioWorkspace, , $audio, $paid] = $this->sellableProduct('audio');
        $ids = [];
        for ($i = 0; $i < 9; $i++) {
            $ids[] = $this->sampleFile($audioCreator, $audioWorkspace, 'mp3', 'audio/mpeg', "clip-{$i}.mp3")->id;
        }

        $this->stateful()->actingAs($audioCreator)->putJson("/api/v1/items/{$audio->id}", [
            'title' => $audio->title,
            'price_cents' => $audio->price_cents,
            'currency' => 'ETB',
            'type' => 'audio',
            'file_ids' => [$paid->id],
            'sample_file_ids' => $ids,
        ])->assertJsonValidationErrors('sample_file_ids');

        [$ebookCreator, $ebookWorkspace, , $ebook, $ebookPaid] = $this->sellableProduct('ebook');
        $huge = $this->sampleFile($ebookCreator, $ebookWorkspace, 'pdf', 'application/pdf', 'huge.pdf', (15 * 1024 * 1024) + 1);
        $this->stateful()->actingAs($ebookCreator)->putJson("/api/v1/items/{$ebook->id}", [
            'title' => $ebook->title,
            'price_cents' => $ebook->price_cents,
            'currency' => 'ETB',
            'type' => 'ebook',
            'file_ids' => [$ebookPaid->id],
            'sample_file_ids' => [$huge->id],
        ])->assertJsonValidationErrors('sample_file_ids');

        $paidAsSample = $this->sampleFile($ebookCreator, $ebookWorkspace, 'pdf', 'application/pdf', 'not-a-sample.pdf');
        $paidAsSample->update(['upload_type' => 'digitalProductFiles', 'disk_prefix' => 'digital-products']);
        $this->stateful()->actingAs($ebookCreator)->putJson("/api/v1/items/{$ebook->id}", [
            'title' => $ebook->title,
            'price_cents' => $ebook->price_cents,
            'currency' => 'ETB',
            'type' => 'ebook',
            'file_ids' => [$ebookPaid->id],
            'sample_file_ids' => [$paidAsSample->id],
        ])->assertJsonValidationErrors('sample_file_ids');
    }

    public function test_second_pdf_sample_is_rejected(): void
    {
        [$creator, $workspace, , $ebook, $paid] = $this->sellableProduct('ebook');
        $first = $this->sampleFile($creator, $workspace, 'pdf', 'application/pdf', 'one.pdf');
        $second = $this->sampleFile($creator, $workspace, 'pdf', 'application/pdf', 'two.pdf');

        $this->stateful()->actingAs($creator)->putJson("/api/v1/items/{$ebook->id}", [
            'title' => $ebook->title,
            'price_cents' => $ebook->price_cents,
            'currency' => 'ETB',
            'type' => 'ebook',
            'file_ids' => [$paid->id],
            'sample_file_ids' => [$first->id, $second->id],
        ])->assertJsonValidationErrors('sample_file_ids');
    }

    public function test_review_snapshot_restores_samples_when_an_update_is_rejected(): void
    {
        settings()->save(['product.updating_requires_review' => 1]);
        $admin = $this->createAdmin();
        [$creator, $workspace, , $product, $paid] = $this->sellableProduct('audio');
        $original = $this->sampleFile($creator, $workspace, 'mp3', 'audio/mpeg', 'original.mp3');
        $replacement = $this->sampleFile($creator, $workspace, 'mp3', 'audio/mpeg', 'replacement.mp3');

        $this->updateProduct($creator, $product, $paid, [
            'type' => 'audio',
            'sample_file_ids' => [$original->id],
            'sample_titles' => [$original->id => 'Original preview'],
        ]);
        $product->update([
            'status' => 'approved',
            'approved_at' => now(),
            'review_requested_at' => null,
            'pending_review_snapshot' => null,
        ]);

        $this->updateProduct($creator, $product, $paid, [
            'type' => 'audio',
            'sample_file_ids' => [$replacement->id],
            'sample_titles' => [$replacement->id => 'Replacement preview'],
        ]);

        $snapshot = $product->fresh()->pending_review_snapshot;
        $this->assertIsArray($snapshot);
        $this->assertSame([$original->id], $snapshot['sample_file_ids']);

        $this->stateful()->actingAs($admin)->postJson(
            "/api/v1/admin/items/{$product->id}/reject",
            ['reason' => 'Restore the original preview'],
        )->assertOk();

        $shown = $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/items/{$product->id}")
            ->assertOk()
            ->json('data.samples');

        $this->assertCount(1, $shown);
        $this->assertSame($original->id, $shown[0]['file_entry_id']);
        $this->assertSame('Original preview', $shown[0]['title']);
    }

    /**
     * @return array{User, Workspace, Biolink, DigitalProduct, FileEntry}
     */
    private function sellableProduct(
        string $type,
        string $paidName = 'download.pdf',
        string $extension = 'pdf',
        string $mime = 'application/pdf',
    ): array {
        $creator = User::query()->forceCreate([
            'name' => 'Creator '.Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        if (!Workspace::query()->where('owner_id', $creator->id)->where('is_personal', true)->exists()) {
            (new CreateWorkspace())->createPersonalWorkspace($creator);
        }
        ActiveWorkspace::clearCache();
        $workspace = $creator->workspaces()->first();

        $biolink = Biolink::query()->create([
            'back_half' => Str::random(8),
            'name' => 'Store '.Str::random(4),
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);

        $paid = FileEntry::query()->create([
            'name' => $paidName,
            'file_name' => 'paid-'.Str::random(12).'.'.$extension,
            'mime' => $mime,
            'extension' => $extension,
            'file_size' => 1024,
            'type' => 'file',
            'public' => false,
            'upload_type' => 'digitalProductFiles',
            'disk_prefix' => 'digital-products',
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
            'user_id' => (string) $creator->id,
        ]);

        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Product '.Str::random(6),
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => $type,
        ]);
        $product->files()->attach($paid->id);
        $product->biolinks()->attach($biolink->id);

        return [$creator, $workspace, $biolink, $product, $paid];
    }

    private function sampleFile(
        User $creator,
        Workspace $workspace,
        string $extension,
        string $mime,
        string $name,
        int $bytes = 2048,
    ): FileEntry {
        return FileEntry::query()->create([
            'name' => $name,
            'file_name' => 'sample-'.Str::random(12).'.'.$extension,
            'mime' => $mime,
            'extension' => $extension,
            'file_size' => $bytes,
            'type' => $extension === 'pdf' ? 'file' : 'audio',
            'public' => false,
            'upload_type' => 'digitalProductSamples',
            'disk_prefix' => 'digital-product-samples',
            'backend_id' => $this->localBackendId(),
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
            'user_id' => (string) $creator->id,
        ]);
    }

    private function putSampleBytes(FileEntry $file, string $bytes = 'preview-bytes'): void
    {
        $disk = $file->getDisk();
        $path = $file->getStoragePath();
        $disk->put($path, $bytes);
        $this->fixturePaths[] = [$disk, $path];
    }

    private function updateProduct(User $creator, DigitalProduct $product, FileEntry $paid, array $overrides): void
    {
        $this->stateful()->actingAs($creator)->putJson(
            "/api/v1/items/{$product->id}",
            array_merge([
                'title' => $product->title,
                'price_cents' => $product->price_cents,
                'currency' => 'ETB',
                'type' => $product->type,
                'file_ids' => [$paid->id],
            ], $overrides),
        )->assertOk();
    }

    private function localBackendId(): string
    {
        $backends = Uploads::getAllBackends();
        foreach ($backends as $backend) {
            if ($backend->type === 'local') {
                return $backend->id;
            }
        }

        return $backends[0]->id ?? 'local';
    }

    private function createAdmin(): User
    {
        $user = User::query()->forceCreate([
            'name' => 'Admin '.Str::random(6),
            'username' => Str::lower(Str::random(10)),
            'email' => Str::random(8).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $user->permissions()->attach(
            \Common\Permissions\Models\Permission::query()->firstOrCreate(['name' => 'admin']),
        );

        return $user;
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';
        $this->flushSession();

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
