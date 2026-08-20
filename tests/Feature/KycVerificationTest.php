<?php

namespace Tests\Feature;

use App\Kyc\Models\KycVerification;
use App\Kyc\Notifications\KycPendingAdminNotification;
use App\Kyc\Notifications\KycStatusChanged;
use App\Models\User;
use App\Storefront\PayoutRequestService;
use Common\Permissions\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class KycVerificationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Notification::fake();
        settings()->save([
            'kyc.enabled' => true,
            'kyc.selfie_verification' => true,
        ]);
    }

    public function testUserCanSubmitKycVerificationWithDocumentsAndSelfie(): void
    {
        Notification::fake();
        $user = $this->createUser();
        $admin = $this->createAdmin();

        $this->actingAs($user);

        $response = $this->stateful()->postJson('/api/v1/kyc', [
            'document_type' => KycVerification::DOCUMENT_TYPE_NATIONAL_ID,
            'document_number' => 'ID-123456',
            'front_of_id_file' => UploadedFile::fake()->image('front.jpg'),
            'back_of_id_file' => UploadedFile::fake()->image('back.jpg'),
            'selfie_file' => UploadedFile::fake()->image('selfie.jpg'),
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', KycVerification::STATUS_PENDING)
            ->assertJsonPath('data.document_number', 'ID-123456');

        $this->assertDatabaseHas('kyc_verifications', [
            'user_id' => $user->id,
            'status' => KycVerification::STATUS_PENDING,
        ]);
        $this->assertSame(
            KycVerification::STATUS_PENDING,
            $user->fresh()->kyc_status,
        );

        $verification = $user->latestKycVerification;
        $this->assertEqualsCanonicalizing(
            ['front_of_id', 'back_of_id', 'selfie'],
            array_keys((array) $verification->documents),
        );
        foreach ((array) $verification->documents as $path) {
            Storage::disk('local')->assertExists($path);
        }

        Notification::assertSentTo($admin, KycPendingAdminNotification::class);
    }

    public function testPassportSubmissionOnlyRequiresPassportDocument(): void
    {
        $user = $this->createUser();
$this->stateful()->actingAs($user);
        $this->postJson('/api/v1/kyc', [
            'document_type' => KycVerification::DOCUMENT_TYPE_PASSPORT,
            'document_number' => 'P-987654',
            'passport_file' => UploadedFile::fake()->image('passport.jpg'),
            'selfie_file' => UploadedFile::fake()->image('selfie.jpg'),
        ])->assertCreated();

        $this->assertEqualsCanonicalizing(
            ['passport', 'selfie'],
            array_keys((array) $user->fresh()->latestKycVerification->documents),
        );
    }

    public function testDuplicateSubmissionIsBlockedWhilePending(): void
    {
        $user = $this->createUser();
        $this->createSubmittedVerification($user);
$this->stateful()->actingAs($user);
        $this->postJson('/api/v1/kyc', [
            'document_type' => KycVerification::DOCUMENT_TYPE_PASSPORT,
            'document_number' => 'P-111',
            'passport_file' => UploadedFile::fake()->image('passport.jpg'),
        ])->assertUnprocessable();

        $this->assertSame(1, $user->kycVerifications()->count());
    }

    public function testSubmissionRequiresValidDocuments(): void
    {
        $user = $this->createUser();
$this->stateful()->actingAs($user);
        $this->postJson('/api/v1/kyc', [
            'document_type' => KycVerification::DOCUMENT_TYPE_NATIONAL_ID,
            'document_number' => 'ID-1',
        ])->assertUnprocessable()
            ->assertInvalid(['front_of_id_file', 'back_of_id_file', 'selfie_file']);

        $this->postJson('/api/v1/kyc', [
            'document_type' => 'invalid',
            'document_number' => 'ID-1',
            'front_of_id_file' => UploadedFile::fake()->image('front.jpg'),
            'back_of_id_file' => UploadedFile::fake()->image('back.jpg'),
            'selfie_file' => UploadedFile::fake()->image('selfie.jpg'),
        ])->assertUnprocessable()
            ->assertInvalid(['document_type']);
    }

    public function testVerifiedUserCannotSubmitAnotherRequest(): void
    {
        $user = $this->createUser();
        $verification = $this->createSubmittedVerification($user);
        app(\App\Kyc\KycVerificationService::class)->approve($verification, $this->createAdmin());

$this->stateful()->actingAs($user);
        $this->postJson('/api/v1/kyc', [
            'document_type' => KycVerification::DOCUMENT_TYPE_PASSPORT,
            'document_number' => 'P-111',
            'passport_file' => UploadedFile::fake()->image('passport.jpg'),
        ])->assertUnprocessable();
    }

    public function testAdminCanApproveRequestAndNotifyUser(): void
    {
        Notification::fake();
        $user = $this->createUser();
        $verification = $this->createSubmittedVerification($user);
        $admin = $this->createAdmin();
$this->stateful()->actingAs($admin);

        $this->postJson("/api/v1/admin/kyc-verifications/{$verification->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', KycVerification::STATUS_APPROVED);

        $this->assertSame(
            KycVerification::STATUS_APPROVED,
            $user->fresh()->kyc_status,
        );
        $this->assertTrue($user->fresh()->isKycVerified());
        Notification::assertSentTo($user, KycStatusChanged::class);
    }

    public function testAdminCanRejectWithReasonAndNotifyUser(): void
    {
        Notification::fake();
        $user = $this->createUser();
        $verification = $this->createSubmittedVerification($user);
        $admin = $this->createAdmin();
$this->stateful()->actingAs($admin);

        $this->postJson("/api/v1/admin/kyc-verifications/{$verification->id}/reject", [
            'reason' => 'Documents are not readable.',
        ])->assertOk()
            ->assertJsonPath('data.status', KycVerification::STATUS_REJECTED)
            ->assertJsonPath('data.rejection_reason', 'Documents are not readable.');
        $this->assertSame(
            KycVerification::STATUS_REJECTED,
            $user->fresh()->kyc_status,
        );
        Notification::assertSentTo(
            $user,
            KycStatusChanged::class,
            fn(KycStatusChanged $notification): bool =>
                $notification->rejectionReason === 'Documents are not readable.',
        );
    }

    public function testAlreadyReviewedRequestCannotBeChanged(): void
    {
        $user = $this->createUser();
        $verification = $this->createSubmittedVerification($user);
        $admin = $this->createAdmin();
        app(\App\Kyc\KycVerificationService::class)->approve($verification, $admin);
$this->stateful()->actingAs($admin);

        $this->postJson("/api/v1/admin/kyc-verifications/{$verification->id}/reject", [
            'reason' => 'Nope.',
        ])->assertUnprocessable();
    }

    public function testAdminCanListAndFilterVerifications(): void
    {
        $user = $this->createUser();
        $verification = $this->createSubmittedVerification($user);
        $admin = $this->createAdmin();
$this->stateful()->actingAs($admin);

        $this->getJson('/api/v1/admin/kyc-verifications?status=pending')
            ->assertOk()
            ->assertJsonPath('data.0.id', $verification->id)
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/admin/kyc-verifications?status=approved')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function testAdminIndexReturnsCountersAndSupportsSearchAndDocumentTypeFilters(): void
    {
        $user = $this->createUser();
        $pending = $this->createSubmittedVerification($user);
        $approvedUser = $this->createUser();
        $approved = $this->createSubmittedVerification(
            $approvedUser,
            KycVerification::DOCUMENT_TYPE_PASSPORT,
        );
        $approved->update(['status' => KycVerification::STATUS_APPROVED]);
        $admin = $this->createAdmin();
        $this->stateful()->actingAs($admin);

        $this->getJson('/api/v1/admin/kyc-verifications')
            ->assertOk()
            ->assertJsonPath('meta.counters.pending.total', 1)
            ->assertJsonPath('meta.counters.approved.total', 1)
            ->assertJsonPath('meta.counters.rejected.total', 0)
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/v1/admin/kyc-verifications?document_type=passport')
            ->assertOk()
            ->assertJsonPath('data.0.id', $approved->id)
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/admin/kyc-verifications?search=' . urlencode($user->name))
            ->assertOk()
            ->assertJsonPath('data.0.id', $pending->id)
            ->assertJsonCount(1, 'data');
    }

    public function testAdminCanDeleteVerification(): void
    {
        $user = $this->createUser();
        $verification = $this->createSubmittedVerification($user);
        $admin = $this->createAdmin();
        $this->stateful()->actingAs($admin);

        $this->deleteJson("/api/v1/admin/kyc-verifications/{$verification->id}")
            ->assertOk();

        $this->assertDatabaseMissing(
            'kyc_verifications',
            ['id' => $verification->id],
        );
    }

    public function testNonAdminCannotDeleteVerification(): void
    {
        $user = $this->createUser();
        $verification = $this->createSubmittedVerification($user);

        $this->stateful()
            ->actingAs($user)
            ->deleteJson("/api/v1/admin/kyc-verifications/{$verification->id}")
            ->assertForbidden();
    }

    public function testNonAdminCannotAccessAdminEndpoints(): void
    {
        $user = $this->createUser();
        $other = $this->createUser();
        $verification = $this->createSubmittedVerification($user);

        $this->actingAs($other);

        $this->stateful()
            ->getJson('/api/v1/admin/kyc-verifications')
            ->assertForbidden();
        $this->stateful()
            ->postJson("/api/v1/admin/kyc-verifications/{$verification->id}/approve")
            ->assertForbidden();
        $this->stateful()
            ->postJson("/api/v1/admin/kyc-verifications/{$verification->id}/reject", [
                'reason' => 'No.',
            ])->assertForbidden();
    }

    public function testOwnerCanViewTheirDocuments(): void
    {
        $user = $this->createUser();
        $verification = $this->createSubmittedVerification($user);
        $keys = array_keys((array) $verification->documents);

        $this->stateful()->actingAs($user);
        $this->getJson("/api/v1/kyc/documents/{$keys[0]}")
            ->assertOk();
    }

    public function testOtherUserCannotViewDocuments(): void
    {
        $user = $this->createUser();
        $other = $this->createUser();
        $verification = $this->createSubmittedVerification($user);
        $keys = array_keys((array) $verification->documents);

        $this->stateful()->actingAs($other);
        $this->getJson("/api/v1/kyc/documents/{$keys[0]}")
            ->assertNotFound();
    }
    public function testPayoutRequestIsBlockedForUnverifiedUserWhenKycEnabled(): void
    {
        $user = $this->createUser();

        try {
            app(PayoutRequestService::class)->create($user->id, 1, 1000);
            $this->fail('Expected payout request to be blocked.');
        } catch (HttpException $e) {
            $this->assertSame(422, $e->getStatusCode());
        }
    }

    public function testPayoutRequestPassesKycGateWhenUserIsVerified(): void
    {
        $user = $this->createUser();
        $verification = $this->createSubmittedVerification($user);
        app(\App\Kyc\KycVerificationService::class)->approve(
            $verification,
            $this->createAdmin(),
        );

        try {
            app(PayoutRequestService::class)->create($user->id, 1, 1000);
            $this->fail('Expected payout request to reach the payout method check.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('withdrawal_method', $e->errors());
        }
    }

    private function createSubmittedVerification(
        User $user,
        string $documentType = KycVerification::DOCUMENT_TYPE_NATIONAL_ID,
    ): KycVerification {
        $payload = $documentType === KycVerification::DOCUMENT_TYPE_PASSPORT
            ? ['passport_file' => UploadedFile::fake()->image('passport.jpg')]
            : [
                'front_of_id_file' => UploadedFile::fake()->image('front.jpg'),
                'back_of_id_file' => UploadedFile::fake()->image('back.jpg'),
            ];

        return app(\App\Kyc\KycVerificationService::class)->submit($user, [
            'document_type' => $documentType,
            'document_number' => 'ID-' . Str::random(6),
            'selfie_file' => UploadedFile::fake()->image('selfie.jpg'),
            ...$payload,
        ]);
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    private function createUser(): User
    {
        return User::query()->forceCreate([
            'name' => 'Creator ' . Str::random(8),
            'username' => Str::lower(Str::random(12)),
            'email' => Str::random(12) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }

    private function createAdmin(): User
    {
        $admin = User::query()->forceCreate([
            'name' => 'Admin ' . Str::random(8),
            'username' => Str::lower(Str::random(12)),
            'email' => Str::random(12) . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $admin->permissions()->attach(
            Permission::query()->firstOrCreate(['name' => 'admin']),
        );

        return $admin;
    }
}
