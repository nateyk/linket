<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Payments\Models\PaymentTransaction;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

final class ChapaBillingHistoryTest extends TestCase
{
    use DatabaseTransactions;

    public function testChapaProHistoryIsRestrictedToTheAuthenticatedCreator(): void
    {
        $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
        $price = Price::query()->where('product_id', $plan->id)
            ->where('currency', 'ETB')->where('interval', 'month')->firstOrFail();
        $creator = User::factory()->create();
        $other = User::factory()->create();
        $ownSubscription = $this->subscription($creator, $plan, $price);
        $otherSubscription = $this->subscription($other, $plan, $price);

        $this->payment($ownSubscription, 'paid', 'lk-my-chapa-payment-1');
        $this->payment($otherSubscription, 'paid', 'lk-other-chapa-payment-1');

        $this->stateful()->actingAs($creator, 'sanctum')
            ->getJson('/api/v1/billing/chapa/history')
            ->assertOk()
            ->assertJsonPath('subscription_gateway', 'chapa')
            ->assertJsonPath('pro_subscription.payments.0.status', 'paid')
            ->assertJsonPath('pro_subscription.payments.0.amount_cents', 50000)
            ->assertJsonPath('pro_subscription.payments.0.transaction_reference', 'lk-my-chapa-payment-1')
            ->assertJsonCount(1, 'pro_subscription.payments')
            ->assertDontSee('lk-other-chapa-payment-1');
    }

    public function testPendingChapaSubscriptionIsNeverReportedAsPaid(): void
    {
        $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
        $price = Price::query()->where('product_id', $plan->id)
            ->where('currency', 'ETB')->where('interval', 'month')->firstOrFail();
        $creator = User::factory()->create();
        $subscription = $this->subscription($creator, $plan, $price);
        $this->payment($subscription, 'pending', 'lk-pending-chapa-payment-1');

        $this->stateful()->actingAs($creator, 'sanctum')
            ->getJson('/api/v1/billing/chapa/history')
            ->assertOk()
            ->assertJsonPath('pro_subscription.payments.0.status', 'pending_payment')
            ->assertJsonPath('pro_subscription.pending_payment.amount_cents', 50000);
    }

    private function subscription(User $creator, Product $plan, Price $price): Subscription
    {
        return Subscription::query()->create([
            'user_id' => $creator->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'gateway_name' => 'chapa',
            'gateway_status' => 'active',
            'renews_at' => now()->addMonth(),
        ]);
    }

    private function payment(Subscription $subscription, string $status, string $reference): void
    {
        PaymentTransaction::query()->create([
            'uuid' => (string) Str::uuid(),
            'gateway' => 'chapa',
            'payable_type' => Subscription::class,
            'payable_id' => $subscription->id,
            'purpose' => 'subscription_initial',
            'tx_ref' => $reference,
            'amount' => '500.00',
            'currency' => 'ETB',
            'status' => $status,
            'verified_at' => $status === 'paid' ? now() : null,
        ]);
    }
}
