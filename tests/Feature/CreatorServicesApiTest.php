<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\CreatorServices\Models\CreatorService;
use App\CreatorServices\Models\ServiceCategory;
use App\CreatorServices\Models\ServiceSubcategory;
use App\CreatorServices\Models\ServiceInquiry;
use App\CreatorServices\Models\ServicePackage;
use App\Models\User;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Database\Seeders\ServiceCategoriesSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class CreatorServicesApiTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();

        parent::tearDown();
    }

    public function test_creator_can_create_service_with_packages_faqs_and_gallery(): void
    {
        [$creator, $workspace, $store] = $this->context();
        $firstFile = $this->file($workspace, $creator);
        $secondFile = $this->file($workspace, $creator);

        $response = $this->stateful()->actingAs($creator)->postJson('/api/v1/services', [
            'store_id' => $store->id,
            'title' => 'Logo design',
            'short_description' => 'A logo that fits your brand.',
            'description' => '<p>Hello <script>alert(1)</script></p>',
            'category' => 'Design',
            'skills' => ['Logo', 'Branding'],
            'gallery_file_entry_ids' => [$firstFile->id, $secondFile->id],
            'contact_channels' => [
                ['type' => 'whatsapp', 'label' => 'WhatsApp', 'value' => '+251 911 234 567'],
                ['type' => 'telegram', 'label' => 'Telegram', 'value' => '@studio'],
            ],
            'packages' => [
                [
                    'name' => 'Starter',
                    'description' => 'One concept',
                    'price_cents' => 29900,
                    'delivery_days' => 6,
                    'revisions' => 2,
                    'features' => ['One concept', 'PNG files'],
                ],
                [
                    'name' => 'Premium',
                    'price_cents' => null,
                    'delivery_days' => 3,
                    'revisions' => 6,
                    'features' => ['Three concepts'],
                ],
            ],
            'faqs' => [
                ['question' => 'How long?', 'answer' => 'Five days'],
            ],
            'status' => 'draft',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.title', 'Logo design')
            ->assertJsonPath('data.slug', 'logo-design')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.packages.0.name', 'Starter')
            ->assertJsonPath('data.packages.1.price_cents', null)
            ->assertJsonPath('data.starting_price_cents', 29900)
            ->assertJsonPath('data.currency', 'ETB')
            ->assertJsonPath('data.faqs.0.question', 'How long?')
            ->assertJsonCount(2, 'data.gallery')
            ->assertJsonPath('data.contact_channels.0.value', '+251911234567')
            ->assertJsonPath('data.contact_channels.1.value', 'studio');

        $this->assertStringNotContainsString('<script>', $response->json('data.description'));
        $this->assertDatabaseHas('creator_services', [
            'id' => $response->json('data.id'),
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
            'store_id' => $store->id,
        ]);
    }

    public function test_creator_can_attach_an_admin_managed_category_and_subcategory(): void
    {
        $this->seed(ServiceCategoriesSeeder::class);
        [$creator, , $store] = $this->context();

        $category = ServiceCategory::query()
            ->where('slug', 'programming-tech')
            ->firstOrFail();
        $subcategory = ServiceSubcategory::query()
            ->where('service_category_id', $category->id)
            ->where('slug', 'website-development')
            ->firstOrFail();

        $response = $this->stateful()->actingAs($creator)->postJson('/api/v1/services', [
            'store_id' => $store->id,
            'title' => 'Business website',
            'category' => 'Ignored free text',
            'service_category_id' => $category->id,
            'service_subcategory_id' => $subcategory->id,
            'status' => 'draft',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.service_category_id', $category->id)
            ->assertJsonPath('data.service_subcategory_id', $subcategory->id)
            ->assertJsonPath('data.category', 'Programming & Tech');

        $this->assertDatabaseHas('creator_services', [
            'id' => $response->json('data.id'),
            'service_category_id' => $category->id,
            'service_subcategory_id' => $subcategory->id,
            'category' => 'Programming & Tech',
        ]);
    }

    public function test_a_subcategory_must_belong_to_the_selected_category(): void
    {
        $this->seed(ServiceCategoriesSeeder::class);
        [$creator, , $store] = $this->context();

        $design = ServiceCategory::query()
            ->where('slug', 'graphics-design')
            ->firstOrFail();
        $websiteDevelopment = ServiceSubcategory::query()
            ->where('slug', 'website-development')
            ->firstOrFail();

        $this->stateful()->actingAs($creator)->postJson('/api/v1/services', [
            'store_id' => $store->id,
            'title' => 'Mismatched category',
            'service_category_id' => $design->id,
            'service_subcategory_id' => $websiteDevelopment->id,
        ])->assertJsonValidationErrors('service_subcategory_id');
    }

    public function test_index_is_scoped_to_the_active_workspace_and_user(): void
    {
        [$creator, $workspace, $store] = $this->context();
        $own = CreatorService::factory()->forStore($store)->create();

        $otherCreator = $this->context()[0];
        CreatorService::factory()->create(['user_id' => $otherCreator->id]);

        $this->stateful()->actingAs($creator)
            ->getJson('/api/v1/services')
            ->assertOk()
            ->assertJsonPath('data.0.id', $own->id)
            ->assertJsonCount(1, 'data');
    }

    public function test_update_syncs_packages_and_removes_deleted_packages(): void
    {
        [$creator, $workspace, $store] = $this->context();
        $service = CreatorService::factory()->forStore($store)->create();
        $kept = ServicePackage::query()->create([
            'creator_service_id' => $service->id,
            'name' => 'Starter',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'position' => 0,
        ]);
        $removed = ServicePackage::query()->create([
            'creator_service_id' => $service->id,
            'name' => 'Legacy',
            'price_cents' => 2000,
            'currency' => 'ETB',
            'position' => 1,
        ]);
        $inquiry = ServiceInquiry::query()->create([
            'creator_service_id' => $service->id,
            'creator_service_package_id' => $removed->id,
            'name' => 'Buyer',
            'email' => 'buyer@example.test',
            'message' => 'Hello',
        ]);

        $this->stateful()->actingAs($creator)->putJson("/api/v1/services/{$service->id}", [
            'store_id' => $store->id,
            'title' => 'Updated service',
            'packages' => [
                ['id' => $kept->id, 'name' => 'Starter plus', 'price_cents' => 1500, 'features' => ['More']],
                ['name' => 'Premium', 'price_cents' => 5000, 'features' => []],
            ],
            'faqs' => [],
        ])->assertOk()
            ->assertJsonPath('data.title', 'Updated service')
            ->assertJsonPath('data.packages.0.name', 'Starter plus')
            ->assertJsonPath('data.packages.1.name', 'Premium');

        $this->assertDatabaseMissing('creator_service_packages', ['id' => $removed->id]);
        $this->assertDatabaseHas('creator_service_packages', ['id' => $kept->id, 'name' => 'Starter plus']);
        $this->assertDatabaseHas('creator_service_inquiries', ['id' => $inquiry->id, 'creator_service_package_id' => null]);
    }

    public function test_partial_status_update_keeps_existing_content(): void
    {
        [$creator, , $store] = $this->context();
        $service = CreatorService::factory()->forStore($store)->create([
            'short_description' => 'A short pitch',
            'description' => '<p>Full description</p>',
            'category' => 'Design',
            'skills' => ['Logo'],
            'video_url' => 'https://example.com/video',
            'live_demo_url' => 'https://example.com/demo',
            'contact_channels' => [
                ['type' => 'email', 'label' => 'Email', 'value' => 'hi@example.com'],
            ],
        ]);

        $this->stateful()->actingAs($creator)->putJson("/api/v1/services/{$service->id}", [
            'store_id' => $store->id,
            'title' => $service->title,
            'status' => 'published',
        ])->assertOk();

        $fresh = $service->fresh();
        $this->assertSame('A short pitch', $fresh->short_description);
        $this->assertSame('<p>Full description</p>', $fresh->description);
        $this->assertSame('Design', $fresh->category);
        $this->assertSame(['Logo'], $fresh->skills);
        $this->assertSame('https://example.com/video', $fresh->video_url);
        $this->assertSame('https://example.com/demo', $fresh->live_demo_url);
        $this->assertSame('email', $fresh->contact_channels[0]['type']);
        $this->assertSame('published', $fresh->status);
    }

    public function test_other_creator_cannot_view_update_or_delete(): void
    {
        [$creator, $workspace, $store] = $this->context();
        $service = CreatorService::factory()->forStore($store)->create();
        $otherCreator = $this->context()[0];

        $this->stateful()->actingAs($otherCreator)
            ->getJson("/api/v1/services/{$service->id}")->assertNotFound();
        $this->stateful()->actingAs($otherCreator)
            ->putJson("/api/v1/services/{$service->id}", ['store_id' => $store->id, 'title' => 'Hijack'])->assertNotFound();
        $this->stateful()->actingAs($otherCreator)
            ->deleteJson("/api/v1/services/{$service->id}")->assertNotFound();
    }

    public function test_create_rejects_store_from_another_workspace(): void
    {
        [$creator] = $this->context();
        [, , $otherStore] = $this->context();

        $this->stateful()->actingAs($creator)->postJson('/api/v1/services', [
            'store_id' => $otherStore->id,
            'title' => 'Logo design',
        ])->assertUnprocessable();
    }

    public function test_create_rejects_a_deleted_storefront(): void
    {
        [$creator, , $store] = $this->context();
        $store->delete();

        $this->stateful()->actingAs($creator)->postJson('/api/v1/services', [
            'store_id' => $store->id,
            'title' => 'Logo design',
        ])->assertUnprocessable();
    }

    public function test_service_can_be_published_and_exposes_public_url(): void
    {
        [$creator, $workspace, $store] = $this->context();

        $response = $this->stateful()->actingAs($creator)->postJson('/api/v1/services', [
            'store_id' => $store->id,
            'title' => 'Brand strategy',
            'status' => 'published',
        ])->assertCreated();

        $this->assertSame('published', $response->json('data.status'));
        $this->assertStringEndsWith('/services/'.$response->json('data.slug'), $response->json('data.public_url'));
    }

    public function test_creator_can_delete_their_own_service_and_keeps_inquiries(): void
    {
        [$creator, $workspace, $store] = $this->context();
        $cover = $this->file($workspace, $creator);

        $service = $this->stateful()->actingAs($creator)->postJson('/api/v1/services', [
            'store_id' => $store->id,
            'title' => 'Retired offer',
            'cover_file_entry_id' => $cover->id,
        ])->assertCreated()->json('data');

        ServiceInquiry::query()->create([
            'creator_service_id' => $service['id'],
            'name' => 'Sara Buyer',
            'email' => 'sara@example.test',
            'message' => 'Is this still available?',
        ]);

        $this->stateful()->actingAs($creator)
            ->deleteJson("/api/v1/services/{$service['id']}")
            ->assertNoContent();

        $this->assertSoftDeleted('creator_services', ['id' => $service['id']]);

        // A prospect's inquiry outlives the offer it was about.
        $this->assertDatabaseHas('creator_service_inquiries', [
            'creator_service_id' => $service['id'],
        ]);

        $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/services/{$service['id']}")
            ->assertNotFound();
    }

    public function test_create_rejects_a_description_that_overflows_the_text_column(): void
    {
        [$creator, , $store] = $this->context();

        // 18k emoji is 18,000 characters but 72,000 bytes: inside a char
        // limit, outside what a TEXT column (65,535 bytes) can hold.
        $this->stateful()->actingAs($creator)->postJson('/api/v1/services', [
            'store_id' => $store->id,
            'title' => 'Overflowing description',
            'description' => str_repeat('🎨', 18000),
        ])->assertJsonValidationErrors('description');
    }

    public function test_guest_is_unauthorized_not_a_server_error(): void
    {
        // A browser-origin guest must get a 401. Falling through to the
        // controller used to dereference a null user and return a 500.
        $this->stateful()->getJson('/api/v1/services')->assertUnauthorized();
        $this->stateful()->getJson('/api/v1/services/inquiries')->assertUnauthorized();
    }

    public function test_create_rejects_a_cover_from_another_workspace(): void
    {
        [$creator, $workspace, $store] = $this->context();
        [, $otherWorkspace, $otherCreator] = $this->context();
        $foreignFile = $this->file($otherWorkspace, $otherCreator);

        $this->stateful()->actingAs($creator)->postJson('/api/v1/services', [
            'store_id' => $store->id,
            'title' => 'Borrowed cover',
            'cover_file_entry_id' => $foreignFile->id,
        ])->assertJsonValidationErrors('cover_file_entry_id');

        $this->assertDatabaseMissing('creator_services', ['title' => 'Borrowed cover']);
    }

    public function test_create_rejects_a_gallery_image_from_another_workspace(): void
    {
        [$creator, $workspace, $store] = $this->context();
        [, $otherWorkspace, $otherCreator] = $this->context();
        $foreignFile = $this->file($otherWorkspace, $otherCreator);

        $this->stateful()->actingAs($creator)->postJson('/api/v1/services', [
            'store_id' => $store->id,
            'title' => 'Borrowed gallery',
            'gallery_file_entry_ids' => [$foreignFile->id],
        ])->assertJsonValidationErrors('gallery_file_entry_ids.0');
    }

    public function test_create_rejects_a_non_image_cover(): void
    {
        [$creator, $workspace, $store] = $this->context();
        $document = FileEntry::query()->create([
            'name' => 'brief.pdf',
            'file_name' => Str::random(20).'.pdf',
            'file_size' => 2048,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'document',
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);

        $this->stateful()->actingAs($creator)->postJson('/api/v1/services', [
            'store_id' => $store->id,
            'title' => 'Document cover',
            'cover_file_entry_id' => $document->id,
        ])->assertJsonValidationErrors('cover_file_entry_id');
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

    private function file($workspace, $creator): FileEntry
    {
        return FileEntry::query()->create([
            'name' => 'image.png',
            'file_name' => Str::random(20).'.png',
            'file_size' => 1024,
            'mime' => 'image/png',
            'extension' => 'png',
            'type' => 'image',
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
    }

    private function stateful(): static
    {
        return $this->withHeader('Referer', 'http://localhost');
    }
}
