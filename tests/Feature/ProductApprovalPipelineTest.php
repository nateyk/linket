<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Files\FileEntry;
use Common\Settings\Models\Setting;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductApprovalPipelineTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        Setting::query()->where('name', 'like', 'product.%')->delete();
        settings()->loadSettings();
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    public function testProductReviewHelpersAndCasts(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator, [
            'status' => 'approved',
            'approved_at' => now(),
            'review_requested_at' => now(),
            'review_requested_by' => $creator->id,
        ]);

        $fresh = DigitalProduct::find($product->id);
        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $fresh->review_requested_at);
        $this->assertTrue($fresh->hasPendingUpdate());

        $fresh->update(['status' => 'draft']);
        $this->assertFalse($fresh->fresh()->hasPendingUpdate());
    }

    public function testReviewEventsRelationAndMetaCast(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);

        $product->reviewEvents()->create([
            'actor_id' => $creator->id,
            'actor_role' => 'creator',
            'event' => 'created',
            'from_status' => null,
            'to_status' => 'draft',
            'meta' => ['changed' => ['title']],
        ]);

        $event = $product->reviewEvents()->first();
        $this->assertSame('created', $event->event);
        $this->assertSame(['changed' => ['title']], $event->meta);
        $this->assertSame($creator->id, $event->actor_id);
    }

    public function testRecordWritesActorRoleAndMeta(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);

        $history = app(\App\Storefront\ProductReviewHistory::class);
        $history->record($product, 'created', null, 'draft', $creator, 'creator');
        $history->record($product, 'approved', 'pending_approval', 'approved', $creator, 'admin');
        $history->record($product, 'updated', 'approved', 'approved', null, 'system', null, ['changed' => ['title']]);

        $events = $product->reviewEvents()->orderBy('id')->get();
        $this->assertSame(['creator', 'admin', 'system'], $events->pluck('actor_role')->all());
        $this->assertSame(['changed' => ['title']], $events->last()->meta);
        $this->assertNull($events->last()->actor_id);
        $this->assertSame('approved', $events->last()->to_status);
    }

    public function testRecordForcesSystemRoleWhenNoActor(): void
    {
        [$creator, $workspace] = $this->creatorContext();
        $product = $this->product($workspace, $creator);

        app(\App\Storefront\ProductReviewHistory::class)
            ->record($product, 'updated', 'approved', 'approved', null, 'creator');

        $this->assertSame('system', $product->reviewEvents()->first()->actor_role);
    }

    public function testPreviouslyApprovedResubmissionUsesUpdatePolicy(): void
    {
        settings()->save([
            'product.adding_requires_review' => 0,
            'product.updating_requires_review' => 1,
        ]);
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $product = $this->product($workspace, $creator, [
            'status' => 'rejected',
            'approved_at' => now(),
        ]);
        $product->files()->attach($file->id);

        $this->stateful()->actingAs($creator)
            ->postJson("/api/v1/digital-products/{$product->id}/submit")
            ->assertOk();

        $this->assertSame('pending_approval', $product->fresh()->status);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'update_submitted',
            'actor_role' => 'creator',
        ]);
    }

    public function testFirstSubmissionStillUsesAddingPolicy(): void
    {
        settings()->save([
            'product.adding_requires_review' => 0,
            'product.updating_requires_review' => 1,
        ]);
        [$creator, $workspace] = $this->creatorContext();
        $file = $this->createFile($creator, $workspace);
        $product = $this->product($workspace, $creator, ['status' => 'draft']);
        $product->files()->attach($file->id);

        $this->stateful()->actingAs($creator)
            ->postJson("/api/v1/digital-products/{$product->id}/submit")
            ->assertOk();

        $this->assertSame('approved', $product->fresh()->status);
        $this->assertDatabaseHas('digital_product_review_events', [
            'digital_product_id' => $product->id,
            'event' => 'submitted',
            'actor_role' => 'creator',
        ]);
    }

    private function creatorContext(): array
    {
        $creator = $this->createCreator();
        $workspace = $creator->workspaces()->first();
        ActiveWorkspace::clearCache();

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

    private function createFile(User $creator, Workspace $workspace): FileEntry
    {
        return FileEntry::query()->create([
            'name' => 'test.pdf',
            'file_name' => 'test.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
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

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
