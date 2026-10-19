<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\CreatorServices\Models\CreatorService;
use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;
use App\CreatorServices\Models\ServiceFaq;
use App\CreatorServices\Models\ServicePackage;
use App\Models\User;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class PublicServicesTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();

        parent::tearDown();
    }

    public function test_services_index_sends_the_visitor_back_to_the_services_tab(): void
    {
        [, , $store] = $this->context();
        $this->publishedService($store, 'Logo design');

        // A store with products opens on Products by default, so "back"
        // without the section would strand the visitor on the wrong tab.
        $this->get("/{$store->back_half}/services")
            ->assertOk()
            ->assertSee('?section=services', false);
    }

    public function test_public_lists_only_published_services_for_the_requested_store(): void
    {
        [, , $store] = $this->context();
        $this->publishedService($store, 'Logo design');
        $this->publishedService($store, 'Brand strategy');
        $this->service($store, 'Draft service', 'draft');

        [, , $otherStore] = $this->context();
        $this->publishedService($otherStore, 'Other store service');

        $this->stateful()->getJson("/api/v1/public/stores/{$store->id}/services")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.title', 'Brand strategy')
            ->assertJsonPath('data.1.title', 'Logo design');
    }

    public function test_public_detail_includes_packages_faqs_and_contact_channels(): void
    {
        [, , $store] = $this->context();
        $service = $this->publishedService($store, 'Logo design');
        $service->update([
            'description' => '<p>Custom logo work</p>',
            'contact_channels' => [
                ['type' => 'whatsapp', 'label' => 'WhatsApp', 'value' => '+251911234567'],
            ],
        ]);
        ServicePackage::query()->create([
            'creator_service_id' => $service->id,
            'name' => 'Starter',
            'price_cents' => 29900,
            'currency' => 'ETB',
            'features' => ['One concept'],
            'position' => 0,
        ]);
        ServiceFaq::query()->create([
            'creator_service_id' => $service->id,
            'question' => 'How long?',
            'answer' => 'Five days',
            'position' => 0,
        ]);

        $this->stateful()->getJson("/api/v1/public/stores/{$store->id}/services/{$service->slug}")
            ->assertOk()
            ->assertJsonPath('data.title', 'Logo design')
            ->assertJsonPath('data.packages.0.name', 'Starter')
            ->assertJsonPath('data.starting_price_cents', 29900)
            ->assertJsonPath('data.faqs.0.question', 'How long?')
            ->assertJsonPath('data.contact_channels.0.type', 'whatsapp');
    }

    public function test_draft_service_detail_is_not_visible(): void
    {
        [, , $store] = $this->context();
        $service = $this->service($store, 'Draft service', 'draft');

        $this->stateful()->getJson("/api/v1/public/stores/{$store->id}/services/{$service->slug}")
            ->assertNotFound();
    }

    public function test_detail_is_scoped_to_the_requested_storefront(): void
    {
        [, , $storeA] = $this->context();
        $service = $this->publishedService($storeA, 'Logo design');
        [, , $storeB] = $this->context();

        $this->stateful()->getJson("/api/v1/public/stores/{$storeB->id}/services/{$service->slug}")
            ->assertNotFound();
    }

    public function test_public_services_web_page_returns_ok(): void
    {
        [, , $store] = $this->context();
        $this->publishedService($store, 'Logo design');

        $this->get("/{$store->back_half}/services")
            ->assertOk()
            ->assertSee('servicesPage', false);
    }

    public function test_blog_article_slugged_services_is_not_shadowed(): void
    {
        $category = BlogCategory::create(['name' => 'Guides']);
        BlogArticle::create([
            'blog_category_id' => $category->id,
            'title' => 'Services',
            'slug' => 'services',
            'body' => '<p>Body</p>',
            'status' => 'published',
            'published_at' => now(),
        ]);

        $this->get('/blog/services')->assertOk();
    }

    public function test_password_protected_service_page_exposes_password_gate(): void
    {
        [, , $store] = $this->context();
        $store->update(['password' => bcrypt('secret')]);
        $this->publishedService($store, 'Logo design');

        $this->get("/{$store->back_half}/services")
            ->assertOk()
            ->assertSee('********', false);
    }

    public function test_public_service_web_page_returns_ok_and_draft_404(): void
    {
        [, , $store] = $this->context();
        $service = $this->publishedService($store, 'Logo design');
        $draft = $this->service($store, 'Draft service', 'draft');

        $this->get("/{$store->back_half}/services/{$service->slug}")
            ->assertOk()
            ->assertSee('servicePage', false);

        $this->get("/{$store->back_half}/services/{$draft->slug}")->assertNotFound();
    }

    public function test_dashboard_services_url_is_not_captured_by_public_routes(): void
    {
        $this->get('/dashboard/services')->assertOk();
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

        ActiveWorkspace::clearCache();

        return [$creator, $workspace, $store];
    }

    private function publishedService(Biolink $store, string $title): CreatorService
    {
        return $this->service($store, $title, 'published');
    }

    private function service(Biolink $store, string $title, string $status): CreatorService
    {
        return CreatorService::query()->create([
            'workspace_id' => $store->workspace_id,
            'user_id' => $store->user_id,
            'store_id' => $store->id,
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::lower(Str::random(6)),
            'status' => $status,
            'currency' => 'ETB',
        ]);
    }

    private function stateful(): static
    {
        return $this->withHeader('Referer', 'http://localhost');
    }
}
