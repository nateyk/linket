<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\PayoutRequest;
use Common\Permissions\Models\Permission;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AdminWithdrawalsOperationsTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_counters_are_scoped_and_grouped_by_currency(): void
    {
        [$creator, $workspaceId] = $this->creatorWorkspace();
        [$otherCreator, $otherWorkspaceId] = $this->creatorWorkspace();
        $this->request($creator, $workspaceId, 'requested', 10000, 'ETB', 'Telebirr');
        $this->request($creator, $workspaceId, 'requested', 2000, 'USD', 'Telebirr');
        $this->request($creator, $workspaceId, 'processing', 6000, 'ETB', 'CBE Birr');
        $this->request($otherCreator, $otherWorkspaceId, 'paid', 2500, 'ETB', 'M-Pesa');

        Http::fake();
        $response = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/admin/withdrawals?perPage=10')
            ->assertOk();

        $response->assertJsonPath('meta.counters.requested.total', 2)
            ->assertJsonPath('meta.counters.requested.amounts_by_currency.ETB', 10000)
            ->assertJsonPath('meta.counters.requested.amounts_by_currency.USD', 2000)
            ->assertJsonPath('meta.counters.processing.total', 1)
            ->assertJsonPath('meta.counters.processing.amounts_by_currency.ETB', 6000)
            ->assertJsonPath('meta.counters.paid.total', 1)
            ->assertJsonPath('meta.counters.paid.amounts_by_currency.ETB', 2500)
            ->assertJsonPath('meta.counters.cancelled.total', 0)
            ->assertJsonCount(4, 'data');

        // Listing cannot submit a Chapa transfer, alter a payout, or reveal raw destinations.
        Http::assertNothingSent();
        $this->assertSame(4, PayoutRequest::query()->count());
        $response->assertDontSee('payout_destination');
    }

    public function test_admin_filters_search_date_method_and_status_without_mixing_totals(): void
    {
        [$creator, $workspaceId] = $this->creatorWorkspace();
        $requested = $this->request($creator, $workspaceId, 'requested', 7000, 'ETB', 'Telebirr');
        $requested->forceFill(['created_at' => now()->subDays(2)])->save();
        $this->request($creator, $workspaceId, 'requested', 9900, 'ETB', 'CBE Birr');
        $this->request($creator, $workspaceId, 'paid', 4000, 'ETB', 'Telebirr');

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/admin/withdrawals?status=requested&withdrawal_method=Telebirr&date_from='
                .now()->subDays(3)->format('Y-m-d').'&date_to='.now()->subDay()->format('Y-m-d'))
            ->assertOk()
            ->assertJsonPath('meta.counters.requested.total', 1)
            ->assertJsonPath('meta.counters.requested.amounts_by_currency.ETB', 7000)
            ->assertJsonPath('meta.counters.paid.total', 0)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $requested->id);
    }

    public function test_creator_cannot_read_admin_withdrawals_or_account_details(): void
    {
        [$creator] = $this->creatorWorkspace();

        $this->actingAs($creator, 'sanctum')
            ->getJson('/api/v1/admin/withdrawals')->assertForbidden();
    }

    /** @return array{0: User, 1: int} */
    private function creatorWorkspace(): array
    {
        $creator = User::factory()->create();
        $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);

        return [$creator, (int) $workspace->id];
    }

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->permissions()->attach(Permission::query()->firstOrCreate(['name' => 'admin.access']));

        return $user;
    }

    private function request(
        User $creator,
        int $workspaceId,
        string $status,
        int $amount,
        string $currency,
        string $method,
    ): PayoutRequest {
        return PayoutRequest::query()->create([
            'workspace_id' => $workspaceId,
            'creator_id' => $creator->id,
            'status' => $status,
            'amount_cents' => $amount,
            'currency' => $currency,
            'withdrawal_method_name' => $method,
            'payout_method_label' => $method,
        ]);
    }
}
