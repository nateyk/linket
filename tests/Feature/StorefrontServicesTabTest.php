<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\Biolinks\Resources\BiolinkResource;
use App\CreatorServices\Models\CreatorService;
use App\Models\User;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class StorefrontServicesTabTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();

        parent::tearDown();
    }

    public function test_storefront_payload_exposes_published_service_count(): void
    {
        [$creator, $workspace, $store] = $this->context();

        CreatorService::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'store_id' => $store->id,
            'title' => 'Logo design',
            'slug' => 'logo-design',
            'status' => 'published',
            'currency' => 'ETB',
        ]);
        CreatorService::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'store_id' => $store->id,
            'title' => 'Draft service',
            'slug' => 'draft-service',
            'status' => 'draft',
            'currency' => 'ETB',
        ]);

        $store->loadContent();
        $payload = (new BiolinkResource($store))->resolve();

        $this->assertSame(1, $payload['public_service_count']);
        $this->assertCount(1, $store->creatorServices);
    }

    /**
     * @return array{User, \Common\Workspaces\Models\Workspace, Biolink}
     */
    private function context(): array
    {
        $token = Str::lower(Str::random(12));

        $creator = User::query()->forceCreate([
            'name' => 'Creator '.$token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);

        $store = Biolink::query()->create([
            'back_half' => Str::random(8),
            'name' => 'Test Storefront',
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
            'builder_mode' => 'creator_profile',
        ]);

        ActiveWorkspace::clearCache();

        return [$creator, $workspace, $store];
    }
}
