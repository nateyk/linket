<?php

namespace Tests\Feature;

use App\Biolinks\Models\Biolink;
use App\CreatorServices\Models\CreatorService;
use App\CreatorServices\Models\ServiceInquiry;
use App\CreatorServices\Models\ServicePackage;
use App\CreatorServices\Notifications\NewServiceInquiryNotification;
use App\Models\User;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class ServiceInquiriesTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();

        parent::tearDown();
    }

    public function test_public_visitor_can_send_inquiry_for_a_package(): void
    {
        Notification::fake();
        [$creator, $workspace, $store, $service, $package] = $this->context();

        $this->stateful()->postJson(
            "/api/v1/public/stores/{$store->id}/services/{$service->slug}/inquiries",
            [
                'name' => 'Sara Buyer',
                'email' => 'sara@example.test',
                'phone' => '+251 900 000 000',
                'message' => 'I need a logo for my bakery.',
                'package_id' => $package->id,
            ],
        )->assertCreated()
            ->assertJsonPath('message', 'Inquiry sent. The creator will contact you soon.');

        $inquiry = ServiceInquiry::query()->firstOrFail();
        $this->assertSame($service->id, $inquiry->creator_service_id);
        $this->assertSame($package->id, $inquiry->creator_service_package_id);
        $this->assertSame('new', $inquiry->status);
        $this->assertSame('Sara Buyer', $inquiry->name);

        Notification::assertSentTo(
            $creator,
            NewServiceInquiryNotification::class,
            fn (NewServiceInquiryNotification $notification, array $channels): bool => $notification->inquiryId === $inquiry->id
                && in_array('mail', $channels, true)
                && in_array('database', $channels, true),
        );
    }

    public function test_inquiry_requires_valid_contact_details(): void
    {
        [, , $store, $service] = $this->context();

        $this->stateful()->postJson(
            "/api/v1/public/stores/{$store->id}/services/{$service->slug}/inquiries",
            ['email' => 'not-an-email'],
        )->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'message']);
    }

    public function test_package_must_belong_to_the_service(): void
    {
        [, , $store, $service] = $this->context();
        $otherService = CreatorService::factory()->forStore($store)->published()->create();
        $foreignPackage = ServicePackage::query()->create([
            'creator_service_id' => $otherService->id,
            'name' => 'Foreign',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'position' => 0,
        ]);

        $this->stateful()->postJson(
            "/api/v1/public/stores/{$store->id}/services/{$service->slug}/inquiries",
            [
                'name' => 'Sara',
                'email' => 'sara@example.test',
                'message' => 'Hello',
                'package_id' => $foreignPackage->id,
            ],
        )->assertUnprocessable();
    }

    public function test_draft_service_cannot_receive_inquiries(): void
    {
        [, , $store, $service] = $this->context(status: 'draft');

        $this->stateful()->postJson(
            "/api/v1/public/stores/{$store->id}/services/{$service->slug}/inquiries",
            [
                'name' => 'Sara',
                'email' => 'sara@example.test',
                'message' => 'Hello',
            ],
        )->assertNotFound();
    }

    public function test_creator_lists_only_own_inquiries_and_filters_by_service(): void
    {
        [$creator, , $store, $service] = $this->context();

        $own = $this->inquiry($service,'Own inquiry');
        $otherService = CreatorService::factory()->forStore($store)->published()->create();
        $second = $this->inquiry($otherService, 'Second service inquiry');
        $foreign = $this->inquiry(CreatorService::factory()->forStore($this->context()[2])->published()->create(), 'Foreign');

        $this->stateful()->actingAs($creator)
            ->getJson('/api/v1/services/inquiries')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissing(['id' => $foreign->id]);

        $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/services/inquiries?service_id={$service->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $own->id);

        $this->assertNotNull($second->id);
    }

    public function test_opening_an_inquiry_marks_it_read(): void
    {
        [$creator, , , $service] = $this->context();
        $inquiry = $this->inquiry($service, 'Please read me');

        $this->assertNull($inquiry->read_at);

        $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/services/inquiries/{$inquiry->id}")
            ->assertOk()
            ->assertJsonPath('data.message', 'Please read me');

        $this->assertNotNull($inquiry->fresh()->read_at);
    }

    public function test_creator_updates_status_and_deletes(): void
    {
        [$creator, , , $service] = $this->context();
        $inquiry = $this->inquiry($service, 'Change status');

        $this->stateful()->actingAs($creator)
            ->patchJson("/api/v1/services/inquiries/{$inquiry->id}", ['status' => 'contacted'])
            ->assertOk()
            ->assertJsonPath('data.status', 'contacted');

        $this->stateful()->actingAs($creator)
            ->deleteJson("/api/v1/services/inquiries/{$inquiry->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('creator_service_inquiries', ['id' => $inquiry->id]);
    }

    /**
     * @return array{User, \Common\Workspaces\Models\Workspace, Biolink, CreatorService, ServicePackage}
     */
    private function context(string $status = 'published'): array
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

        $service = CreatorService::factory()->forStore($store)->create(['status' => $status]);
        $package = ServicePackage::query()->create([
            'creator_service_id' => $service->id,
            'name' => 'Starter',
            'price_cents' => 29900,
            'currency' => 'ETB',
            'position' => 0,
        ]);

        ActiveWorkspace::clearCache();

        return [$creator, $workspace, $store, $service, $package];
    }

    private function inquiry(CreatorService $service, string $message): ServiceInquiry
    {
        return ServiceInquiry::query()->create([
            'creator_service_id' => $service->id,
            'name' => 'Sara',
            'email' => 'sara@example.test',
            'message' => $message,
        ]);
    }

    private function stateful(): static
    {
        return $this->withHeader('Referer', 'http://localhost');
    }
}
