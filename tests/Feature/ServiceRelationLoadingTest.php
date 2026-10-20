<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\CreatorServices\Models\CreatorService;
use App\CreatorServices\Models\ServiceFaq;
use App\CreatorServices\Models\ServicePackage;
use App\CreatorServices\PublicCreatorServices;
use App\Models\User;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ServiceRelationLoadingTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();

        parent::tearDown();
    }

    public function test_the_index_loads_only_what_a_service_card_renders(): void
    {
        [$store, $service] = $this->context();

        $listed = app(PublicCreatorServices::class)->services($store)->firstWhere('id', $service->id);

        $this->assertNotNull($listed);

        // A card shows the cover, a package count, the lowest package price
        // and the public URL, which is built from the storefront. Packages
        // load for that price, but only the columns it needs — galleries and
        // FAQs stay on the detail page.
        $this->assertTrue($listed->relationLoaded('cover'));
        $this->assertTrue($listed->relationLoaded('store'));
        $this->assertTrue($listed->relationLoaded('packages'));
        $this->assertFalse($listed->relationLoaded('images'));
        $this->assertFalse($listed->relationLoaded('faqs'));
        $this->assertSame(29900, $listed->packages->first()->price_cents);

        $priceColumns = array_keys($listed->packages->first()->getAttributes());
        sort($priceColumns);
        $this->assertSame(['creator_service_id', 'id', 'price_cents'], $priceColumns);
        $this->assertStringContainsString('/services/', $listed->publicUrl());
    }

    public function test_the_detail_page_still_loads_everything_it_renders(): void
    {
        [$store, $service] = $this->context();

        $found = app(PublicCreatorServices::class)->service($store, $service->slug);

        $this->assertSame($service->id, $found->id);
        $this->assertTrue($found->relationLoaded('cover'));
        $this->assertTrue($found->relationLoaded('images'));
        $this->assertTrue($found->relationLoaded('faqs'));
        $this->assertTrue($found->relationLoaded('packages'));
        $this->assertTrue($found->relationLoaded('store'));
        $this->assertCount(1, $found->packages);
        $this->assertCount(1, $found->faqs);
    }

    public function test_the_detail_page_returns_404_for_a_draft(): void
    {
        [$store, $service] = $this->context();
        $service->update(['status' => 'draft']);

        $this->expectException(\Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class);

        app(PublicCreatorServices::class)->service($store, $service->slug);
    }

    /**
     * @return array{Biolink, CreatorService}
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

        $service = CreatorService::factory()->forStore($store)->published()->create([
            'title' => 'Brand identity sprint',
            'slug' => 'brand-identity-sprint',
        ]);

        ServicePackage::query()->create([
            'creator_service_id' => $service->id,
            'name' => 'Starter',
            'price_cents' => 29900,
            'currency' => 'ETB',
            'position' => 0,
        ]);

        ServiceFaq::query()->create([
            'creator_service_id' => $service->id,
            'question' => 'How long does it take?',
            'answer' => 'Three days.',
            'position' => 0,
        ]);

        ActiveWorkspace::clearCache();

        return [$store, $service];
    }
}