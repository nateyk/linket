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

    public function test_inquiry_endpoint_is_rate_limited(): void
    {
        Notification::fake();
        [, , $store, $service] = $this->context();
        $url = "/api/v1/public/stores/{$store->id}/services/{$service->slug}/inquiries";
        $payload = [
            'name' => 'Sara',
            'email' => 'sara@example.test',
            'message' => 'Hello',
        ];

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->stateful()->postJson($url, $payload)->assertCreated();
        }

        $this->stateful()->postJson($url, $payload)->assertStatus(429);
    }

    public function test_creator_cannot_open_or_update_another_creators_inquiry(): void
    {
        [$creator] = $this->context();
        [, , , $otherService] = $this->context();
        $foreign = $this->inquiry($otherService, 'Foreign inquiry');

        $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/services/inquiries/{$foreign->id}")
            ->assertNotFound();

        $this->stateful()->actingAs($creator)
            ->patchJson("/api/v1/services/inquiries/{$foreign->id}", ['status' => 'won'])
            ->assertNotFound();
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
    public function test_inquiry_notification_renders_a_readable_mail(): void
    {
        [$creator, , $store, $service, $package] = $this->context();

        $inquiry = ServiceInquiry::query()->create([
            'creator_service_id' => $service->id,
            'creator_service_package_id' => $package->id,
            'name' => 'Sara Buyer',
            'email' => 'sara@example.test',
            'phone' => '+251 900 000 000',
            'message' => 'I need a logo for my bakery.',
        ]);

        $mail = (new NewServiceInquiryNotification($inquiry->id))->toMail($creator);

        // The creator must be able to answer from the mail alone: who it is,
        // what they want, how to reach them, and which package.
        $this->assertStringContainsString($service->title, $mail->subject);
        $rendered = implode("\n", array_merge([$mail->subject, $mail->greeting], $mail->introLines, $mail->outroLines));
        $this->assertStringContainsString('Sara Buyer', $rendered);
        $this->assertStringContainsString('sara@example.test', $rendered);
        $this->assertStringContainsString('+251 900 000 000', $rendered);
        $this->assertStringContainsString('I need a logo for my bakery.', $rendered);
        $this->assertStringContainsString('Starter', $rendered);
        $this->assertStringContainsString(url('/dashboard/services/inquiries'), $mail->actionUrl);
    }

    public function test_inquiry_notification_renders_the_in_app_payload(): void
    {
        [$creator, , , $service, $package] = $this->context();

        $inquiry = ServiceInquiry::query()->create([
            'creator_service_id' => $service->id,
            'creator_service_package_id' => $package->id,
            'name' => 'Sara Buyer',
            'email' => 'sara@example.test',
            'message' => 'I need a logo for my bakery.',
        ]);

        $payload = (new NewServiceInquiryNotification($inquiry->id))->toDatabase($creator);

        $this->assertSame('View inquiry', $payload['mainAction']['label']);
        $this->assertSame(url('/dashboard/services/inquiries'), $payload['mainAction']['action']);
        $this->assertStringContainsString('Sara Buyer', $payload['lines'][0]['content']);
        $this->assertStringContainsString('sara@example.test', $payload['lines'][1]['content']);
        $this->assertStringContainsString('Starter', $payload['lines'][2]['content']);
    }

    public function test_inquiry_notification_stays_quiet_once_the_inquiry_is_deleted(): void
    {
        [$creator, , , $service, $package] = $this->context();

        $inquiry = ServiceInquiry::query()->create([
            'creator_service_id' => $service->id,
            'creator_service_package_id' => $package->id,
            'name' => 'Sara Buyer',
            'email' => 'sara@example.test',
            'message' => 'I need a logo for my bakery.',
        ]);

        $notification = new NewServiceInquiryNotification($inquiry->id);
        $this->assertTrue($notification->shouldSend($creator, 'mail'));

        $inquiry->delete();

        // A queued notification must not fatal on an inquiry the creator
        // deleted before the worker picked it up.
        $this->assertFalse($notification->shouldSend($creator, 'mail'));
        $mail = $notification->toMail($creator);
        $this->assertSame(__('New service inquiry'), $mail->subject);
        $this->assertSame(
            [['content' => e(__('Open your dashboard to view the latest inquiries.')), 'type' => 'primary']],
            $notification->toDatabase($creator)['lines'],
        );
    }

    public function test_optional_answers_are_server_matched_and_snapshotted_for_owner(): void
    {
        Notification::fake();
        [$creator, , $store, $service] = $this->context();
        $service->update(['buyer_questions' => ['When do you need it?', 'What is your budget?']]);
        $url = "/api/v1/public/stores/{$store->id}/services/{$service->slug}/inquiries";

        $this->stateful()->postJson($url, [
            'name' => 'Sara Buyer',
            'email' => 'sara@example.test',
            'message' => 'I need a brand identity.',
            'answers' => ['  Before Friday ', ''],
        ])->assertCreated();

        $inquiry = ServiceInquiry::query()->latest('id')->firstOrFail();
        $this->assertSame([[
            'question' => 'When do you need it?',
            'answer' => 'Before Friday',
        ]], $inquiry->question_answers);

        // An inquiry must retain the original prompt even after edits.
        $service->update(['buyer_questions' => ['New question']]);
        $this->stateful()->actingAs($creator)
            ->getJson("/api/v1/services/inquiries/{$inquiry->id}")
            ->assertOk()
            ->assertJsonPath('data.question_answers.0.question', 'When do you need it?')
            ->assertJsonPath('data.question_answers.0.answer', 'Before Friday');
    }

    public function test_public_answer_validation_rejects_extras_or_stale_configuration(): void
    {
        Notification::fake();
        [, , $store, $service] = $this->context();
        $url = "/api/v1/public/stores/{$store->id}/services/{$service->slug}/inquiries";
        $base = ['name' => 'Sara', 'email' => 'sara@example.test', 'message' => 'Hi'];

        $this->stateful()->postJson($url, [
            ...$base, 'answers' => ['Injected answer'],
        ])->assertUnprocessable()->assertJsonValidationErrors('answers');

        $service->update(['buyer_questions' => ['One', 'Two']]);

        $this->stateful()->postJson($url, [
            ...$base, 'answers' => ['One', 'Two', 'Unexpected'],
        ])->assertUnprocessable()->assertJsonValidationErrors('answers');

        $this->stateful()->postJson($url, [
            ...$base, 'answers' => [str_repeat('x', 501)],
        ])->assertUnprocessable()->assertJsonValidationErrors('answers.0');

        $this->stateful()->postJson($url, [
            ...$base, 'answers' => ['1' => 'Skips first question'],
        ])->assertUnprocessable()->assertJsonValidationErrors('answers');

        $this->assertDatabaseCount('creator_service_inquiries', 0);
    }

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
