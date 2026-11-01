<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DirectPaymentMethod;
use Common\Permissions\Models\Permission;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminReceivingAccountsTest extends TestCase
{
    use DatabaseTransactions;

    private function stateful(): static
    {
        $csrfToken = 'admin-receiving-accounts';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    public function test_creator_submission_appears_in_admin_index_with_summary_and_pagination(): void
    {
        Storage::fake('local');
        $creator = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $this->enableCatalog('cbe');
        $this->stateful()->actingAs($creator, 'sanctum')->postJson('/api/v1/storefront/payment-methods', [
            'provider' => 'cbe',
            'account_number' => '1000123456789',
            'account_name' => 'Account Owner',
            'proof' => \Illuminate\Http\UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf'),
        ])->assertCreated();

        $admin = $this->createAdmin();
        $response = $this->stateful()->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/storefront/payment-methods?lifecycle=pending_ownership_review');

        $response->assertOk()
            ->assertJsonPath('summary.pending', 1)
            ->assertJsonPath('data.data.0.account_name', 'Account Owner')
            ->assertJsonPath('data.data.0.account_masked', '•••• 6789')
            ->assertJsonMissingPath('data.data.0.account_number')
            ->assertJsonPath('data.data.0.checkout_eligible', false)
            ->assertJsonPath('data.data.0.provider_display_name', DirectPaymentMethod::query()->where('code', 'cbe')->value('display_name'))
            ->assertJsonStructure(['data' => ['data', 'current_page', 'last_page']]);
    }

    public function test_approve_provider_registration_and_activate_makes_checkout_eligible(): void
    {
        config()->set('services.verify_et.enabled', true);
        $creator = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
        $method = $this->pendingAccount($creator, $workspace->id);
        $admin = $this->createAdmin();
        $this->enableCatalog('cbe');

        $this->stateful()->actingAs($admin, 'sanctum')->postJson("/api/v1/admin/storefront/payment-methods/{$method->id}/approve")->assertOk();
        $this->stateful()->actingAs($admin, 'sanctum')->getJson("/api/v1/admin/storefront/payment-methods/{$method->id}")
            ->assertOk()
            ->assertJsonPath('data.linket_approved', true)
            ->assertJsonPath('data.verify_et_registered', false)
            ->assertJsonPath('data.checkout_eligible', false);

        $this->stateful()->actingAs($admin, 'sanctum')->postJson("/api/v1/admin/storefront/payment-methods/{$method->id}/provider-registration")->assertOk();
        $this->stateful()->actingAs($admin, 'sanctum')->getJson("/api/v1/admin/storefront/payment-methods/{$method->id}")
            ->assertOk()
            ->assertJsonPath('data.verify_et_registered', true)
            ->assertJsonPath('data.checkout_eligible', false);

        ActiveWorkspace::clearCache();
        $this->stateful()->actingAs($creator, 'sanctum')->postJson("/api/v1/storefront/payment-methods/{$method->id}/activate")->assertOk();

        $this->stateful()->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/storefront/payment-methods')
            ->assertOk()
            ->assertJsonPath('data.data.0.checkout_eligible', true)
            ->assertJsonPath('data.data.0.verify_et_registered', true)
            ->assertJsonPath('data.data.0.linket_approved', true);
    }

    public function test_admin_sees_verification_pause_for_an_active_account(): void
    {
        config()->set('services.verify_et.enabled', false);
        $creator = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
        $method = $this->pendingAccount($creator, $workspace->id);
        $method->update(['status' => 'approved', 'provider_registration_status' => 'registered', 'is_active' => true]);
        $this->enableCatalog('cbe');
        $this->stateful()->actingAs($this->createAdmin(), 'sanctum')->getJson("/api/v1/admin/storefront/payment-methods/{$method->id}")
            ->assertOk()->assertJsonPath('data.checkout_eligible', false)
            ->assertJsonPath('data.checkout_blockers.0', 'verification_unavailable');
    }

    public function test_reject_requires_reason_and_excludes_checkout(): void
    {
        $creator = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
        $method = $this->pendingAccount($creator, $workspace->id);
        $admin = $this->createAdmin();

        $this->stateful()->actingAs($admin, 'sanctum')->postJson("/api/v1/admin/storefront/payment-methods/{$method->id}/reject", [])
            ->assertUnprocessable();

        $this->stateful()->actingAs($admin, 'sanctum')->postJson("/api/v1/admin/storefront/payment-methods/{$method->id}/reject", ['reason' => 'Ownership proof does not match'])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');

        $method->refresh();
        $this->assertFalse($method->isAvailable());
        $this->assertSame('Ownership proof does not match', $method->rejection_reason);
        $this->assertDatabaseHas('creator_payment_method_audits', [
            'creator_payment_method_id' => $method->id,
            'action' => 'rejected',
        ]);
    }

    public function test_suspend_revokes_checkout_and_requires_reason(): void
    {
        $creator = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
        $method = $this->approvedRegisteredAccount($creator, $workspace->id, active: true);
        $admin = $this->createAdmin();

        $this->stateful()->actingAs($admin, 'sanctum')->postJson("/api/v1/admin/storefront/payment-methods/{$method->id}/suspend", ['reason' => 'Fraud review'])
            ->assertOk();

        $method->refresh();
        $this->assertTrue($method->is_suspended);
        $this->assertFalse($method->isAvailable());
        $this->assertSame('Fraud review', $method->suspension_reason);
    }

    public function test_restore_follows_existing_rules_and_keeps_checkout_ineligible_until_creator_reactivates(): void
    {
        $creator = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
        $method = $this->approvedRegisteredAccount($creator, $workspace->id, active: true);
        $admin = $this->createAdmin();

        $this->stateful()->actingAs($admin, 'sanctum')->postJson("/api/v1/admin/storefront/payment-methods/{$method->id}/suspend", ['reason' => 'Hold'])
            ->assertOk();
        $this->stateful()->actingAs($admin, 'sanctum')->postJson("/api/v1/admin/storefront/payment-methods/{$method->id}/restore")->assertOk();

        $method->refresh();
        $this->assertFalse($method->is_suspended);
        $this->assertFalse($method->is_active);
        $this->assertFalse($method->isAvailable());
    }

    public function test_non_admin_cannot_list_or_review_accounts(): void
    {
        $creator = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
        $method = $this->pendingAccount($creator, $workspace->id);

        $this->stateful()->getJson('/api/v1/admin/storefront/payment-methods')->assertUnauthorized();
        $this->stateful()->actingAs($creator, 'sanctum')->getJson('/api/v1/admin/storefront/payment-methods')->assertForbidden();
        $this->stateful()->actingAs($creator, 'sanctum')->postJson("/api/v1/admin/storefront/payment-methods/{$method->id}/approve")->assertForbidden();
    }

    public function test_admin_show_includes_audit_timeline(): void
    {
        $creator = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
        $method = $this->pendingAccount($creator, $workspace->id);
        $admin = $this->createAdmin();

        $this->stateful()->actingAs($admin, 'sanctum')->postJson("/api/v1/admin/storefront/payment-methods/{$method->id}/reject", ['reason' => 'Mismatch'])
            ->assertOk();

        $this->stateful()->actingAs($admin, 'sanctum')->getJson("/api/v1/admin/storefront/payment-methods/{$method->id}")
            ->assertOk()
            ->assertJsonPath('data.rejection_reason', 'Mismatch')
            ->assertJsonPath('data.reviewer_name', $admin->name)
            ->assertJsonPath('data.audits.0.action', 'rejected')
            ->assertJsonPath('data.audits.0.note', 'Mismatch')
            ->assertJsonPath('data.audits.0.actor_name', $admin->name)
            ->assertJsonPath('data.account_number', '1000123456789')
            ->assertJsonPath('data.account_masked', '•••• 6789');
    }

    public function test_admin_can_search_by_creator_email_and_bank_display_name(): void
    {
        Storage::fake('local');
        $creator = $this->createUser();
        $searchEmail = 'receiving-search-'.$creator->id.'@example.test';
        $creator->forceFill(['email' => $searchEmail, 'name' => 'Local administrator'])->save();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();
        $this->enableCatalog('cbe');
        $this->stateful()->actingAs($creator, 'sanctum')->postJson('/api/v1/storefront/payment-methods', [
            'provider' => 'cbe',
            'account_number' => '1000987654321',
            'account_name' => 'Search Owner',
            'proof' => \Illuminate\Http\UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf'),
        ])->assertCreated();
        $admin = $this->createAdmin();

        $this->stateful()->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/storefront/payment-methods?search='.urlencode($searchEmail))
            ->assertOk()
            ->assertJsonPath('data.data.0.creator_email', $searchEmail);

        $this->stateful()->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/storefront/payment-methods?search=Commercial')
            ->assertOk()
            ->assertJsonFragment(['provider' => 'cbe']);

        $this->stateful()->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/storefront/payment-methods?user_id='.$creator->id.'&submitted_from='.now()->toDateString())
            ->assertOk()
            ->assertJsonPath('data.data.0.creator_email', $searchEmail);
    }

    public function test_catalog_includes_account_counts_and_persists_method_toggles(): void
    {
        $creator = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
        $this->pendingAccount($creator, $workspace->id);
        $admin = $this->createAdmin();
        $method = DirectPaymentMethod::query()->where('code', 'cbe')->firstOrFail();

        $catalog = $this->stateful()->actingAs($admin, 'sanctum')->getJson('/api/v1/admin/storefront/payment-method-catalog')
            ->assertOk()
            ->assertJsonFragment(['code' => 'cbe']);
        $cbe = collect($catalog->json('data'))->firstWhere('code', 'cbe');
        $this->assertIsArray($cbe);
        $this->assertGreaterThanOrEqual(1, (int) ($cbe['accounts_count'] ?? 0));
        $this->assertGreaterThanOrEqual(1, (int) ($cbe['pending_accounts_count'] ?? 0));

        $this->stateful()->actingAs($admin, 'sanctum')
            ->patchJson('/api/v1/admin/storefront/payment-method-catalog/'.$method->id, [
                'creator_setup_enabled' => false,
                'checkout_enabled' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.creator_setup_enabled', false)
            ->assertJsonPath('data.checkout_enabled', false);

        $this->assertDatabaseHas('direct_payment_method_catalog', [
            'id' => $method->id,
            'creator_setup_enabled' => 0,
            'checkout_enabled' => 0,
        ]);
    }

    public function test_duplicate_approve_is_rejected(): void
    {
        $creator = $this->createUser();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
        $method = $this->pendingAccount($creator, $workspace->id);
        $admin = $this->createAdmin();

        $this->stateful()->actingAs($admin, 'sanctum')->postJson("/api/v1/admin/storefront/payment-methods/{$method->id}/approve")->assertOk();
        $this->stateful()->actingAs($admin, 'sanctum')->postJson("/api/v1/admin/storefront/payment-methods/{$method->id}/approve")->assertStatus(409);
    }

    private function createAdmin(): User
    {
        $admin = $this->createUser();
        $admin->permissions()->attach(Permission::query()->firstOrCreate(['name' => 'admin.access']));

        return $admin;
    }

    private function createUser(): User
    {
        $token = Str::lower(Str::random(10));

        return User::query()->forceCreate([
            'name' => 'User '.$token,
            'username' => $token,
            'email' => $token.'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }

    private function enableCatalog(string $code): void
    {
        DirectPaymentMethod::query()->where('code', $code)->update([
            'creator_setup_enabled' => true,
            'checkout_enabled' => true,
            'automated_verification_supported' => true,
            'recipient_matching_supported' => true,
            'operationally_suspended' => false,
        ]);
    }

    private function pendingAccount(User $creator, int $workspaceId): CreatorPaymentMethod
    {
        return CreatorPaymentMethod::query()->create([
            'workspace_id' => $workspaceId,
            'user_id' => $creator->id,
            'provider' => 'cbe',
            'account_number' => '1000123456789',
            'account_fingerprint' => hash_hmac('sha256', 'cbe:1000123456789', (string) config('app.key')),
            'account_name_raw' => 'Account Owner',
            'account_name_normalized' => 'account owner',
            'proof_path' => 'private/proof.pdf',
            'status' => 'pending',
            'is_active' => false,
            'provider_registration_status' => 'pending',
        ]);
    }

    private function approvedRegisteredAccount(User $creator, int $workspaceId, bool $active): CreatorPaymentMethod
    {
        return CreatorPaymentMethod::query()->create([
            'workspace_id' => $workspaceId,
            'user_id' => $creator->id,
            'provider' => 'cbe',
            'account_number' => '1000123456789',
            'account_fingerprint' => hash_hmac('sha256', 'cbe:1000123456789', (string) config('app.key')),
            'account_name_raw' => 'Account Owner',
            'account_name_normalized' => 'account owner',
            'proof_path' => 'private/proof.pdf',
            'status' => 'approved',
            'is_active' => $active,
            'verified_at' => now(),
            'provider_registration_status' => 'registered',
            'provider_registered_at' => now(),
        ]);
    }
}
