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
