<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\CreatorServices\Models\CreatorService;
use App\CreatorServices\Models\ServiceFaq;
use App\CreatorServices\Models\ServicePackage;
use App\Models\User;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class CreatorServiceModelTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();

        parent::tearDown();
    }

    public function test_service_exposes_children_and_public_url(): void
    {
        [$creator, $workspace, $store] = $this->context();

        $service = CreatorService::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'store_id' => $store->id,
            'title' => 'Logo design',
            'slug' => 'logo-design',
            'status' => 'published',
            'currency' => 'ETB',
        ]);

        ServicePackage::query()->create([
            'creator_service_id' => $service->id,
            'name' => 'Starter',
            'price_cents' => 29900,
            'currency' => 'ETB',
            'features' => ['Logo'],
            'position' => 0,
        ]);

        ServiceFaq::query()->create([
            'creator_service_id' => $service->id,
            'question' => 'How long?',
            'answer' => 'Five days',
            'position' => 0,
        ]);

        $this->assertSame('Starter', $service->packages()->first()->name);
        $this->assertSame(['Logo'], $service->packages()->first()->features);
        $this->assertSame('How long?', $service->faqs()->first()->question);
        $this->assertStringEndsWith('/services/logo-design', $service->publicUrl());
        $this->assertCount(1, CreatorService::query()->published()->get());
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
        ]);

        return [$creator, $workspace, $store];
    }
}
