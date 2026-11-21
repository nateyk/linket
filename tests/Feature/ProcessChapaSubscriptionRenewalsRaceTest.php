<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\Commands\ProcessChapaSubscriptionRenewals;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ProcessChapaSubscriptionRenewalsRaceTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    public function test_expire_pass_does_not_overwrite_a_subscription_that_renewed(): void
    {
        $user = User::factory()->create();
        $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
        $price = Price::query()->where('product_id', $plan->id)->firstOrFail();

        $subscription = Subscription::query()->create([
            'user_id' => $user->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'gateway_name' => 'chapa',
            'gateway_status' => 'active',
            'renews_at' => now()->subDays(8),
            'ends_at' => null,
        ]);

        // Stale in-memory model as if the cron already selected the row.
        $stale = Subscription::query()->findOrFail($subscription->id);

        // Concurrent fulfillment renews the subscription.
        Subscription::query()->whereKey($subscription->id)->update([
            'gateway_status' => 'active',
            'renews_at' => now()->addMonth(),
            'ends_at' => null,
        ]);

        // Conditional expire write must no-op against the renewed row.
        $graceCutoff = now()->subDays(7);
        $changed = Subscription::query()
            ->whereKey($stale->id)
            ->where('gateway_name', 'chapa')
            ->whereNull('ends_at')
            ->where('renews_at', '<', $graceCutoff)
            ->update([
                'gateway_status' => 'expired',
                'ends_at' => now(),
                'renews_at' => null,
            ]);

        $this->assertSame(0, $changed);

        app(ProcessChapaSubscriptionRenewals::class)->handle();

        $fresh = $subscription->fresh();
        $this->assertNull($fresh->ends_at);
        $this->assertSame('active', $fresh->gateway_status);
        $this->assertTrue($fresh->renews_at?->greaterThan(now()));
    }

    public function test_past_due_pass_does_not_overwrite_a_subscription_that_renewed(): void
    {
        $user = User::factory()->create();
        $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
        $price = Price::query()->where('product_id', $plan->id)->firstOrFail();

        $subscription = Subscription::query()->create([
            'user_id' => $user->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'gateway_name' => 'chapa',
            'gateway_status' => 'active',
            'renews_at' => now()->subDays(2),
            'ends_at' => null,
        ]);

        $subscription->update([
            'gateway_status' => 'active',
            'renews_at' => now()->addMonth(),
            'ends_at' => null,
        ]);

        app(ProcessChapaSubscriptionRenewals::class)->handle();

        $fresh = $subscription->fresh();
        $this->assertSame('active', $fresh->gateway_status);
        $this->assertNull($fresh->ends_at);
        $this->assertTrue($fresh->renews_at?->greaterThan(now()));
    }

    public function test_stale_subscription_still_expires_when_unpaid(): void
    {
        $user = User::factory()->create();
        $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
        $price = Price::query()->where('product_id', $plan->id)->firstOrFail();

        $subscription = Subscription::query()->create([
            'user_id' => $user->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'gateway_name' => 'chapa',
            'gateway_status' => 'past_due',
            'renews_at' => now()->subDays(8),
            'ends_at' => null,
        ]);

        app(ProcessChapaSubscriptionRenewals::class)->handle();

        $fresh = $subscription->fresh();
        $this->assertSame('expired', $fresh->gateway_status);
        $this->assertNotNull($fresh->ends_at);
        $this->assertNull($fresh->renews_at);
    }
}
