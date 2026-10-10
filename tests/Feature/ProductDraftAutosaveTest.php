<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductDraftAutosaveTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function test_owner_can_autosave_draft_with_empty_title_and_no_files(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $product = $this->draftProduct($workspace, $creator);
        $product->files()->attach($file->id);

        $this->draftResponse($creator, $product, [
            'title' => '',
            'price_cents' => 0,
            'file_ids' => [],
        ])->assertOk();

        $fresh = $product->fresh();
        $this->assertSame('Original Draft', $fresh->title);
        $this->assertSame(0, $fresh->price_cents);
        $this->assertSame([], $fresh->files()->pluck('file_entries.id')->all());
    }

    public function test_draft_endpoint_accepts_payload_that_strict_update_rejects(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->draftProduct($workspace, $creator);
        $payload = ['title' => '', 'price_cents' => 0, 'file_ids' => []];

        $this->stateful()->actingAs($creator)->putJson("/api/v1/items/{$product->id}", $payload)
            ->assertStatus(422);

        $this->draftResponse($creator, $product, $payload)->assertOk();
    }

    public function test_non_owner_cannot_autosave_draft(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->draftProduct($workspace, $creator);
        [$otherUser] = $this->creatorContext();

        $this->draftResponse($otherUser, $product, ['title' => 'Hijack', 'file_ids' => []])
            ->assertStatus(403);

        $this->assertSame('Original Draft', $product->fresh()->title);
    }

    public function test_draft_route_exists_and_is_not_spa_fallback(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->draftProduct($workspace, $creator);

        $response = $this->draftResponse($creator, $product, [
            'title' => 'Saved by autosave',
            'price_cents' => 0,
            'file_ids' => [],
        ]);

        $response->assertOk();
        // The SPA fallback answers unmatched routes with 200 text/html, so the
        // content type (not the status code alone) proves the real route ran.
        $this->assertStringContainsString('json', (string) $response->headers->get('Content-Type'));
        $this->assertSame('Saved by autosave', $product->fresh()->title);
    }

    private function draftResponse(User $user, DigitalProduct $product, array $payload)
    {
        return $this->stateful()->actingAs($user)->putJson(
            "/api/v1/items/{$product->id}/draft",
            $payload,
        );
    }

    private function draftProduct(Workspace $workspace, User $creator): DigitalProduct
    {
        return DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Original Draft',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'type' => 'digital',
            'status' => 'draft',
        ]);
    }

    private function createFile(User $creator, Workspace $workspace, array $attributes = []): FileEntry
    {
        return FileEntry::query()->create(array_merge([
            'name' => 'download.pdf',
            'file_name' => 'download.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 1024,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ], $attributes));
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
        ActiveWorkspace::clearCache();

        return [$creator, $creator->workspaces()->first()];
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
