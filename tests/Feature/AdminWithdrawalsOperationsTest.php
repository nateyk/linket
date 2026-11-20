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

    private function stateful(): static
    {
        $csrfToken = 'admin-withdrawals-operations';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    public function test_admin_counters_are_scoped_and_grouped_by_currency(): void
    {
        [$creator, $workspaceId] = $this->creatorWorkspace();
        [$otherCreator, $otherWorkspaceId] = $this->creatorWorkspace();
        $this->request($creator, $workspaceId, ['status' => 'requested', 'amount_cents' => 10000, 'currency' => 'ETB', 'withdrawal_method_name' => 'Telebirr']);
        $this->request($creator, $workspaceId, ['status' => 'requested', 'amount_cents' => 2000, 'currency' => 'USD', 'withdrawal_method_name' => 'Telebirr']);
        $this->request($creator, $workspaceId, ['status' => 'processing', 'amount_cents' => 6000, 'currency' => 'ETB', 'withdrawal_method_name' => 'CBE Birr']);
        $this->request($otherCreator, $otherWorkspaceId, ['status' => 'paid', 'amount_cents' => 2500, 'currency' => 'ETB', 'withdrawal_method_name' => 'M-Pesa']);

        Http::fake();
        $response = $this->stateful()->actingAs($this->admin(), 'sanctum')
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

        $this->stateful()->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/admin/withdrawals?search='.rawurlencode($creator->email))
            ->assertOk()
            ->assertJsonPath('meta.counters.requested.total', 2)
            ->assertJsonCount(3, 'data');
    }

    public function test_admin_filters_search_date_method_and_status_without_mixing_totals(): void
    {
        [$creator, $workspaceId] = $this->creatorWorkspace();
        $requested = $this->request($creator, $workspaceId, ['status' => 'requested', 'amount_cents' => 7000, 'currency' => 'ETB', 'withdrawal_method_name' => 'Telebirr']);
        $requested->forceFill(['created_at' => now()->subDays(2)])->save();
        $this->request($creator, $workspaceId, ['status' => 'requested', 'amount_cents' => 9900, 'currency' => 'ETB', 'withdrawal_method_name' => 'CBE Birr']);
        $this->request($creator, $workspaceId, ['status' => 'paid', 'amount_cents' => 4000, 'currency' => 'ETB', 'withdrawal_method_name' => 'Telebirr']);

        $this->stateful()->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/admin/withdrawals?status=requested&withdrawal_method=Telebirr&date_from='
                .now()->subDays(3)->format('Y-m-d').'&date_to='.now()->subDay()->format('Y-m-d'))
            ->assertOk()
            ->assertJsonPath('meta.counters.requested.total', 1)
            ->assertJsonPath('meta.counters.requested.amounts_by_currency.ETB', 7000)
            ->assertJsonPath('meta.counters.paid.total', 0)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $requested->id);
    }

    public function test_invalid_date_filter_fails_validation_without_querying_payouts(): void
    {
        $this->stateful()->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/admin/withdrawals?date_from=not-a-date')->assertUnprocessable();
    }

    public function test_creator_cannot_read_admin_withdrawals_or_account_details(): void
    {
        [$creator] = $this->creatorWorkspace();

        $this->stateful()->actingAs($creator, 'sanctum')
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

    /** @param array{status: string, amount_cents: int, currency: string, withdrawal_method_name: string} $attributes */
    private function request(User $creator, int $workspaceId, array $attributes): PayoutRequest
    {
        return PayoutRequest::query()->create([
            'workspace_id' => $workspaceId,
            'creator_id' => $creator->id,
            'payout_method_label' => $attributes['withdrawal_method_name'],
            ...$attributes,
        ]);
    }
}
