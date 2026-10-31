<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\CreatorPaymentMethod;
use Common\Permissions\Models\Permission;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class VerifyEtAuthorizationTest extends TestCase
{
    use DatabaseTransactions;

    private function stateful(): static
    {
        $csrfToken = 'v2-authorization-test';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    public function testGuestCannotReadTheAdminPaymentMethodCatalog(): void
    {
        $this->getJson('/api/v1/admin/storefront/payment-method-catalog')
            ->assertUnauthorized();
    }

    public function testOnlyAdminsCanReadDirectOrderEvidenceSummaries(): void
    {
        $this->getJson('/api/v1/admin/storefront/direct-orders')->assertUnauthorized();
        $this->stateful()->actingAs($this->createUser())
            ->getJson('/api/v1/admin/storefront/direct-orders')->assertForbidden();
    }

    public function testCreatorCannotApproveProviderMismatches(): void
    {
        $this->stateful()->actingAs($this->createUser())
            ->postJson('/api/v1/storefront/direct-orders/synthetic-order/manual-approve')->assertForbidden();
    }

    public function testAdminCannotApproveProviderMismatches(): void
    {
        $admin = $this->createUser();
        $admin->permissions()->attach(Permission::query()->firstOrCreate(['name' => 'admin.access']));
        $this->stateful()->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/admin/storefront/direct-orders/synthetic-order/approve')->assertStatus(409);
    }

    public function testAuthenticatedCreatorCannotManageTheAdminPaymentMethodCatalog(): void
    {
        $this->stateful()->actingAs($this->createUser())
            ->getJson('/api/v1/admin/storefront/payment-method-catalog')
            ->assertForbidden();
    }

    public function testAdminCanReadAndUpdateThePaymentMethodCatalog(): void
    {
        $admin = $this->createUser();
        $admin->permissions()->attach(Permission::query()->firstOrCreate(['name' => 'admin.access']));
        $this->stateful()->actingAs($admin);

        $catalog = $this->getJson('/api/v1/admin/storefront/payment-method-catalog')
            ->assertOk();
        $method = $catalog->json('data.0');
        $this->assertIsArray($method);

        $this->patchJson('/api/v1/admin/storefront/payment-method-catalog/' . $method['id'], [
            'operationally_suspended' => true,
        ])->assertOk()->assertJsonPath('data.operationally_suspended', true);
    }

    public function testCreatorCanReadOwnPaymentAccountsButCannotDeactivateAnotherCreatorsAccount(): void
    {
        $owner = $this->createUser();
        $ownerWorkspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $ownerWorkspace->id);

        ActiveWorkspace::clearCache();
        $this->stateful()->actingAs($owner, 'sanctum')
            ->getJson('/api/v1/storefront/payment-methods')
            ->assertOk()
            ->assertJsonPath('data.0.id', $account->id);

    }

    public function testAccountListReflectsCheckoutEligibilityAndCatalogSwitches(): void
    {
        $owner = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $workspace->id);
        $catalog = \App\Storefront\Models\DirectPaymentMethod::query()->where('code', 'cbe')->firstOrFail();
        $catalog->update(['checkout_enabled' => true, 'automated_verification_supported' => true, 'recipient_matching_supported' => true, 'operationally_suspended' => false]);
        ActiveWorkspace::clearCache();
        $this->stateful()->actingAs($owner, 'sanctum')->getJson('/api/v1/storefront/payment-methods')->assertOk()->assertJsonPath('data.0.checkout_eligible', true);
        $catalog->update(['checkout_enabled' => false]);
        $this->getJson('/api/v1/storefront/payment-methods')->assertOk()->assertJsonPath('data.0.checkout_eligible', false);
        $catalog->update(['checkout_enabled' => true]);
        $account->update(['status' => 'pending']);
        $this->getJson('/api/v1/storefront/payment-methods')->assertOk()->assertJsonPath('data.0.checkout_eligible', false);
        $account->update(['status' => 'approved']);
        $catalog->update(['recipient_matching_supported' => false]);
        $this->getJson('/api/v1/storefront/payment-methods')->assertOk()->assertJsonPath('data.0.checkout_eligible', false);
        $catalog->update(['recipient_matching_supported' => true, 'operationally_suspended' => true]);
        $this->getJson('/api/v1/storefront/payment-methods')->assertOk()->assertJsonPath('data.0.checkout_eligible', false);
        $catalog->update(['operationally_suspended' => false]);
        $account->update(['is_active' => false]);
        $this->getJson('/api/v1/storefront/payment-methods')->assertOk()->assertJsonPath('data.0.checkout_eligible', false);
        $account->update(['is_active' => true, 'is_suspended' => true]);
        $this->getJson('/api/v1/storefront/payment-methods')->assertOk()->assertJsonPath('data.0.checkout_eligible', false);
    }

    public function testCreatorCannotDeactivateAnotherCreatorsPaymentAccount(): void
    {
        $owner = $this->createUser();
        $ownerWorkspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $ownerWorkspace->id);
        $otherCreator = $this->createUser();
        app(CreateWorkspace::class)->createPersonalWorkspace($otherCreator);
        ActiveWorkspace::clearCache();

        $this->stateful()->actingAs($otherCreator, 'sanctum')
            ->postJson('/api/v1/storefront/payment-methods/' . $account->id . '/deactivate')
            ->assertNotFound();

        $this->assertTrue($account->fresh()->is_active);
    }

    public function testResubmittedAccountRequiresFreshApprovalAndDeactivatesOriginal(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        $owner = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $workspace->id);
        ActiveWorkspace::clearCache();
        $response = $this->stateful()->actingAs($owner)->postJson('/api/v1/storefront/payment-methods/'.$account->id.'/resubmit', [
            'account_number' => '1000987654321', 'account_name' => 'Test Recipient',
            'proof' => \Illuminate\Http\UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf'),
        ])->assertCreated();
        $this->assertFalse($account->fresh()->is_active);
        $replacement = CreatorPaymentMethod::query()->findOrFail($response->json('data.id'));
        $this->assertSame('pending', $replacement->status);
        $this->assertFalse($replacement->is_active);
        $this->assertNotSame('registered', $replacement->provider_registration_status);
    }

    public function testSameAccountResubmissionResetsApprovalAndExcludesCheckout(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        $owner = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $workspace->id);
        ActiveWorkspace::clearCache();
        $this->stateful()->actingAs($owner)->postJson('/api/v1/storefront/payment-methods/'.$account->id.'/resubmit', [
            'account_number' => '1000123456789', 'account_name' => 'Updated Owner',
            'proof' => \Illuminate\Http\UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf'),
        ])->assertOk()->assertJsonPath('data.id', $account->id)->assertJsonPath('data.status', 'pending');
        $account->refresh();
        $this->assertFalse($account->is_active);
        $this->assertFalse($account->isAvailable());
        $this->assertNotSame('registered', $account->provider_registration_status);
        $audit = \Illuminate\Support\Facades\DB::table('creator_payment_method_audits')->where('creator_payment_method_id', $account->id)->first();
        $this->assertNotNull($audit);
        $history = json_decode(\Illuminate\Support\Facades\Crypt::decryptString($audit->encrypted_snapshot), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('approved', $history['status']);
        $this->assertSame('private/proof.pdf', $history['proof_path']);
        $this->assertArrayHasKey('approved_aliases', $history);
        $this->assertArrayHasKey('reviewed_by', $history);
    }

    public function testResubmissionRejectsAnotherCreatorsAccountAndPreservesOriginal(): void
    {
        \Illuminate\Support\Facades\Storage::fake('local');
        $owner = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $workspace->id);
        $other = $this->createUser();
        $otherWorkspace = app(CreateWorkspace::class)->createPersonalWorkspace($other);
        $claimed = $this->createAccount($other, $otherWorkspace->id);
        $claimed->update(['account_number' => '1000987654321', 'account_fingerprint' => hash_hmac('sha256', 'cbe:1000987654321', (string) config('app.key'))]);
        ActiveWorkspace::clearCache();
        $payload = ['account_number' => '1000987654321', 'account_name' => 'Test Recipient', 'proof' => \Illuminate\Http\UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf')];
        $this->stateful()->actingAs($owner)->postJson('/api/v1/storefront/payment-methods/'.$account->id.'/resubmit', $payload)->assertUnprocessable();
        $this->assertTrue($account->fresh()->is_active);
    }

    public function testCreatorCannotResubmitAnotherCreatorsAccount(): void
    {
        $owner = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $workspace->id);
        $other = $this->createUser();
        app(CreateWorkspace::class)->createPersonalWorkspace($other);
        ActiveWorkspace::clearCache();
        $this->stateful()->actingAs($other, 'sanctum')->postJson('/api/v1/storefront/payment-methods/'.$account->id.'/resubmit', [])->assertNotFound();
    }

    public function testCreatorCannotViewAnotherCreatorsAccountDetails(): void
    {
        $owner = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $workspace->id);
        $other = $this->createUser();
        app(CreateWorkspace::class)->createPersonalWorkspace($other);
        ActiveWorkspace::clearCache();
        $this->stateful()->actingAs($other)->getJson('/api/v1/storefront/payment-methods/'.$account->id.'/details')->assertNotFound();
    }

    public function testAccountRequiresOwnershipApprovalProviderRegistrationAndCreatorActivation(): void
    {
        $owner = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $workspace->id);
        $account->update(['status' => 'pending', 'is_active' => false, 'provider_registration_status' => 'pending']);
        $admin = $this->createUser();
        $admin->permissions()->attach(Permission::query()->firstOrCreate(['name' => 'admin.access']));

        $this->stateful()->actingAs($admin)
            ->postJson('/api/v1/admin/storefront/payment-methods/' . $account->id . '/approve')
            ->assertOk()
            ->assertJsonPath('data.lifecycle_state', 'pending_provider_registration');
        $this->assertFalse($account->fresh()->is_active);

        $this->postJson('/api/v1/admin/storefront/payment-methods/' . $account->id . '/provider-registration')
            ->assertOk()
            ->assertJsonPath('data.lifecycle_state', 'provider_registered');
        $this->assertSame($admin->id, $account->fresh()->provider_registered_by);
        $this->assertFalse($account->fresh()->is_active);
    }

    public function testCreatorCanActivateTheirProviderRegisteredAccount(): void
    {
        $owner = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $workspace->id);
        $account->update(['is_active' => false]);
        ActiveWorkspace::clearCache();
        $this->stateful()->actingAs($owner)
            ->postJson('/api/v1/storefront/payment-methods/' . $account->id . '/activate')
            ->assertOk()
            ->assertJsonPath('data.lifecycle_state', 'active');
        $this->assertTrue($account->fresh()->isAvailable());
    }

    public function testRepeatedProviderRegistrationPreservesOriginalAttestation(): void
    {
        $owner = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $workspace->id);
        $account->forceFill(['provider_registration_status' => 'pending', 'provider_registered_at' => null, 'provider_registered_by' => null])->save();
        $firstAdmin = $this->createUser();
        $firstAdmin->permissions()->attach(Permission::query()->firstOrCreate(['name' => 'admin.access']));
        $url = '/api/v1/admin/storefront/payment-methods/' . $account->id . '/provider-registration';

        $this->stateful()->actingAs($firstAdmin)->postJson($url)->assertOk();
        $originalTime = $account->fresh()->provider_registered_at;
        $this->travel(5)->minutes();
        $this->postJson($url)->assertOk();

        $this->assertSame($firstAdmin->id, $account->fresh()->provider_registered_by);
        $this->assertTrue($originalTime->equalTo($account->fresh()->provider_registered_at));
    }

    public function testAdministratorCanSuspendAndRestoreAnAccountWithoutReactivatingIt(): void
    {
        $owner = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $workspace->id);
        $admin = $this->createUser();
        $admin->permissions()->attach(Permission::query()->firstOrCreate(['name' => 'admin.access']));

        $this->stateful()->actingAs($admin)
            ->postJson('/api/v1/admin/storefront/payment-methods/' . $account->id . '/suspend', ['reason' => 'Compliance review'])
            ->assertOk()
            ->assertJsonPath('data.lifecycle_state', 'suspended');
        $this->assertFalse($account->fresh()->isAvailable());

        $this->postJson('/api/v1/admin/storefront/payment-methods/' . $account->id . '/restore')
            ->assertOk()
            ->assertJsonPath('data.lifecycle_state', 'provider_registered');
        $this->assertFalse($account->fresh()->is_active);
    }

    public function testCreatorCannotRecordProviderRegistrationOrReactivateSuspendedAccounts(): void
    {
        $owner = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $workspace->id);
        $account->update(['status' => 'pending', 'is_active' => false, 'provider_registration_status' => 'pending']);
        ActiveWorkspace::clearCache();

        $this->stateful()->actingAs($owner)
            ->postJson('/api/v1/admin/storefront/payment-methods/' . $account->id . '/provider-registration')
            ->assertForbidden();
        $this->assertNull($account->fresh()->provider_registered_at);
    }

    public function testCreatorCannotActivateASuspendedProviderRegisteredAccount(): void
    {
        $owner = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $workspace->id);
        $account->update(['is_active' => false, 'is_suspended' => true]);
        ActiveWorkspace::clearCache();

        $this->stateful()->actingAs($owner)
            ->postJson('/api/v1/storefront/payment-methods/' . $account->id . '/activate')
            ->assertStatus(423);
        $this->assertFalse($account->fresh()->is_active);
    }

    public function testOnlyTheOwnerCanReadFullAccountDetails(): void
    {
        $owner = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $workspace->id);
        $endpoint = '/api/v1/storefront/payment-methods/'.$account->id.'/details';
        $this->getJson($endpoint)->assertUnauthorized();
        ActiveWorkspace::clearCache();
        $this->stateful()->actingAs($owner)->getJson($endpoint)->assertOk()
            ->assertJsonPath('data.account_number', '1000123456789')
            ->assertHeader('Cache-Control', 'no-store, private');
        $this->getJson('/api/v1/storefront/payment-methods')->assertDontSee('1000123456789');
        $this->assertNotSame('1000123456789', $account->getRawOriginal('account_number'));
    }

    public function testAnotherCreatorCannotReadFullAccountDetails(): void
    {
        $owner = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($owner);
        $account = $this->createAccount($owner, $workspace->id);
        $other = $this->createUser();
        app(CreateWorkspace::class)->createPersonalWorkspace($other);
        ActiveWorkspace::clearCache();
        $this->stateful()->actingAs($other, 'sanctum')
            ->getJson('/api/v1/storefront/payment-methods/'.$account->id.'/details')->assertNotFound();
    }

    public function testSensitivePaymentRoutesAreExcludedFromClockworkCollection(): void
    {
        if (! app()->bound('clockwork')) {
            $this->markTestSkipped('Clockwork is not installed.');
        }
        foreach ([
            '/api/v1/storefront/payment-methods',
            '/api/v1/storefront/payment-methods/1/details',
            '/api/v1/public/direct-orders/order/payment-instructions',
            '/api/v1/billing/direct',
            '/billing/verify-et/webhook',
        ] as $uri) {
            $request = new \Clockwork\Request\IncomingRequest(['uri' => $uri, 'method' => 'GET']);
            $this->assertFalse(app('clockwork')->shouldCollect()->filter($request), $uri);
        }
    }

    private function createAccount(User $creator, int $workspaceId): CreatorPaymentMethod
    {
        return CreatorPaymentMethod::query()->create([
            'workspace_id' => $workspaceId,
            'user_id' => $creator->id,
            'provider' => 'cbe',
            'account_number' => '1000123456789',
            'account_fingerprint' => hash('sha256', Str::uuid()->toString()),
            'account_name_raw' => $creator->name,
            'account_name_normalized' => Str::lower($creator->name),
            'proof_path' => 'private/proof.pdf',
            'is_active' => true,
            'status' => 'approved',
            'provider_registration_status' => 'registered',
        ]);
    }

    private function createUser(): User
    {
        $token = Str::lower(Str::random(12));

        return User::query()->forceCreate([
            'name' => 'Creator ' . $token,
            'username' => $token,
            'email' => $token . '@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }
}
