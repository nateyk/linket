<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProductPayoutMethod;
use App\Storefront\Models\DigitalProductWithdrawalMethod;
use Common\Permissions\Models\Permission;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminPayoutAccountsFilterTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_index_filters_by_status_and_search_server_side(): void
    {
        $pendingCreator = $this->createUser('Pending Creator', 'pending-creator@example.test');
        $activeCreator = $this->createUser('Active Creator', 'active-creator@example.test');
        $rejectedCreator = $this->createUser('Rejected Creator', 'rejected-creator@example.test');

        $pendingWorkspace = app(CreateWorkspace::class)->createPersonalWorkspace($pendingCreator);
        $activeWorkspace = app(CreateWorkspace::class)->createPersonalWorkspace($activeCreator);
        $rejectedWorkspace = app(CreateWorkspace::class)->createPersonalWorkspace($rejectedCreator);

        $pending = $this->createPayoutMethod(
            $pendingCreator,
            $pendingWorkspace->id,
            DigitalProductPayoutMethod::STATUS_PENDING,
            'Awash pending wallet',
        );
        $this->createPayoutMethod(
            $activeCreator,
            $activeWorkspace->id,
            DigitalProductPayoutMethod::STATUS_ACTIVE,
            'CBE active wallet',
        );
        $this->createPayoutMethod(
            $rejectedCreator,
            $rejectedWorkspace->id,
            DigitalProductPayoutMethod::STATUS_REJECTED,
            'BOA rejected wallet',
        );

        $admin = $this->createAdmin();

        $pendingResponse = $this->stateful()
            ->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/financial/payout-accounts?status=pending')
            ->assertOk();

        $pendingIds = collect($pendingResponse->json('data'))->pluck('id')->all();
        $this->assertSame([$pending->id], $pendingIds);

        $searchResponse = $this->stateful()
            ->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/financial/payout-accounts?search=pending-creator@example.test')
            ->assertOk();

        $searchIds = collect($searchResponse->json('data'))->pluck('id')->all();
        $this->assertSame([$pending->id], $searchIds);

        $combinedResponse = $this->stateful()
            ->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/financial/payout-accounts?status=active&search=CBE')
            ->assertOk();

        $combinedIds = collect($combinedResponse->json('data'))->pluck('id')->all();
        $this->assertCount(1, $combinedIds);
        $this->assertNotSame($pending->id, $combinedIds[0]);
    }

    private function stateful(): static
    {
        $csrfToken = 'admin-payout-accounts-filter';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    private function createAdmin(): User
    {
        $admin = $this->createUser();
        $admin->permissions()->attach(
            Permission::query()->firstOrCreate(['name' => 'admin.access']),
        );

        return $admin;
    }

    private function createUser(?string $name = null, ?string $email = null): User
    {
        $token = Str::lower(Str::random(10));

        return User::query()->forceCreate([
            'name' => $name ?? ('User '.$token),
            'username' => $token,
            'email' => $email ?? ($token.'@example.test'),
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }

    private function createPayoutMethod(
        User $creator,
        int $workspaceId,
        string $status,
        string $displayLabel,
    ): DigitalProductPayoutMethod {
        $code = 'bank_transfer_'.$creator->id.'_'.Str::random(4);
        $withdrawalMethod = DigitalProductWithdrawalMethod::query()->create([
            'name' => 'Bank transfer '.$code,
            'code' => $code,
            'destination_label' => 'Bank account number',
            'instructions' => null,
            'minimum_amount_cents' => 100,
            'maximum_amount_cents' => null,
            'is_active' => true,
            'position' => 1,
        ]);

        return DigitalProductPayoutMethod::query()->create([
            'workspace_id' => $workspaceId,
            'creator_id' => $creator->id,
            'withdrawal_method_id' => $withdrawalMethod->id,
            'type' => $withdrawalMethod->code,
            'bank_code' => 'cbe',
            'is_active' => true,
            'status' => $status,
            'approved_at' => $status === DigitalProductPayoutMethod::STATUS_ACTIVE ? now() : null,
            'approved_by' => $status === DigitalProductPayoutMethod::STATUS_ACTIVE ? $creator->id : null,
            'account_holder' => $creator->name,
            'destination' => '1234567890',
            'display_label' => $displayLabel,
        ]);
    }
}
