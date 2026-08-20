<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\Models\PaymentTransaction;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductPaymentRefund;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontOrder;
use Common\Permissions\Models\Permission;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminCommerceInsightsTest extends TestCase
{
    use DatabaseTransactions;

    public function testAdminInsightsReconcilePersistedSalesRefundAndPayoutSnapshots(): void
    {
        $admin = $this->createUser(admin: true);
        $creator = $this->createUser();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $currency = strtoupper((string) config('storefront.currency', 'ETB'));
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Linket launch kit',
            'price_cents' => 10000,
            'currency' => $currency,
            'status' => 'approved',
            'approved_at' => now(),
        ]);
        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_name' => 'Launch Buyer',
            'buyer_email' => 'Buyer@Example.test',
            'currency' => $currency,
            'gross_amount_cents' => 10000,
            'commission_bps' => 1000,
            'platform_fee_percent' => 10,
            'platform_fee_cents' => 1000,
            'creator_earnings_cents' => 9000,
            'status' => 'paid',
            'paid_at' => now()->subHour(),
        ]);
        StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_name' => 'Launch Buyer',
            'buyer_email' => 'buyer@example.test',
            'currency' => $currency,
            'gross_amount_cents' => 5000,
            'commission_bps' => 1000,
            'platform_fee_percent' => 10,
            'platform_fee_cents' => 500,
            'creator_earnings_cents' => 4500,
            'status' => 'paid',
            'paid_at' => now()->subMinutes(45),
        ]);
        $transaction = PaymentTransaction::query()->create([
            'uuid' => (string) Str::uuid(),
            'gateway' => 'chapa',
            'payable_type' => StorefrontOrder::class,
            'payable_id' => $order->id,
            'purpose' => 'digital_product',
            'tx_ref' => 'insights-' . Str::uuid(),
            'amount' => 100,
            'currency' => $currency,
            'status' => 'paid',
            'buyer_email' => 'buyer@example.test',
            'verified_at' => now()->subHour(),
        ]);
        DigitalProductPaymentRefund::query()->create([
            'payment_transaction_id' => $transaction->id,
            'storefront_order_id' => $order->id,
            'recorded_by' => $admin->id,
            'amount_cents' => 2500,
            'creator_earnings_reversal_cents' => 2250,
            'platform_fee_reversal_cents' => 250,
            'currency' => $currency,
            'external_reference' => 'refund-' . Str::uuid(),
            'reason' => 'Partial customer refund',
            'refunded_at' => now()->subMinutes(30),
        ]);
        PayoutRequest::query()->create([
            'workspace_id' => $workspace->id,
            'creator_id' => $creator->id,
            'currency' => $currency,
            'amount_cents' => 4000,
            'status' => 'paid',
            'paid_at' => now()->subMinutes(15),
        ]);
        PayoutRequest::query()->create([
            'workspace_id' => $workspace->id,
            'creator_id' => $creator->id,
            'currency' => $currency,
            'amount_cents' => 1750,
            'status' => 'requested',
        ]);
        PaymentTransaction::query()->create([
            'uuid' => (string) Str::uuid(),
            'gateway' => 'chapa',
            'payable_type' => StorefrontOrder::class,
            'payable_id' => $order->id,
            'purpose' => 'subscription',
            'tx_ref' => 'subscription-' . Str::uuid(),
            'amount' => 35.50,
            'currency' => $currency,
            'status' => 'paid',
            'verified_at' => now()->subMinutes(10),
        ]);

        $response = $this->stateful()->actingAs($admin)->getJson(
            '/api/v1/admin/analytics/commerce?' . http_build_query([
                'start_date' => now()->subDay()->toIso8601String(),
                'end_date' => now()->addDay()->toIso8601String(),
                'timezone' => 'UTC',
            ]),
        );

        $response->assertOk()
            ->assertJsonPath('data.currency', $currency)
            ->assertJsonPath('data.sales.gross_sales_cents', 15000)
            ->assertJsonPath('data.sales.refunds_cents', 2500)
            ->assertJsonPath('data.sales.net_sales_cents', 12500)
            ->assertJsonPath('data.sales.creator_earnings_cents', 11250)
            ->assertJsonPath('data.sales.platform_fees_cents', 1250)
            ->assertJsonPath('data.sales.paid_orders', 2)
            ->assertJsonPath('data.sales.unique_customers', 1)
            ->assertJsonPath('data.subscriptions.revenue_cents', 3550)
            ->assertJsonPath('data.payouts.paid_cents', 4000)
            ->assertJsonPath('data.payouts.pending_cents', 1750)
            ->assertJsonPath('data.top_products.0.id', $product->id)
            ->assertJsonPath('data.top_products.0.net_sales_cents', 12500)
            ->assertJsonFragment([
                'uuid' => $order->uuid,
                'refunds_cents' => 2500,
            ]);

        $this->assertSame(
            12500,
            collect($response->json('data.trend'))->sum('net_sales_cents'),
        );
    }

    public function testCommerceInsightsRequireAdminAccess(): void
    {
        $user = $this->createUser();
        $query = http_build_query([
            'start_date' => now()->subDay()->toIso8601String(),
            'end_date' => now()->toIso8601String(),
        ]);

        $this->stateful()->actingAs($user)
            ->getJson("/api/v1/admin/analytics/commerce?{$query}")
            ->assertForbidden();
    }

    public function testCommerceInsightsRejectDateRangesLongerThanOneYear(): void
    {
        $admin = $this->createUser(admin: true);
        $oversizedQuery = http_build_query([
            'start_date' => now()->subDays(400)->toIso8601String(),
            'end_date' => now()->toIso8601String(),
        ]);

        $this->stateful()->actingAs($admin)
            ->getJson("/api/v1/admin/analytics/commerce?{$oversizedQuery}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('end_date');
    }

    private function createUser(bool $admin = false): User
    {
        $token = Str::lower(Str::random(12));
        $user = User::query()->forceCreate([
            'name' => 'User ' . $token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        if ($admin) {
            $user->permissions()->attach(
                Permission::query()->firstOrCreate(['name' => 'admin']),
            );
        }

        return $user;
    }

    private function stateful(): static
    {
        return $this->withHeader('Referer', config('app.url'));
    }
}
