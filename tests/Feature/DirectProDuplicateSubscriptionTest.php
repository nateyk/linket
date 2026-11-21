<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use App\Payments\VerifyEt\VerifyEtSettlementHandler;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class DirectProDuplicateSubscriptionTest extends TestCase
{
    use DatabaseTransactions;

    public function test_concurrent_direct_pro_settlements_keep_a_single_open_subscription(): void
    {
        $creator = User::factory()->create();
        $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
        $price = Price::query()
            ->where('product_id', $plan->id)
            ->where('currency', 'ETB')
            ->orderByDesc('default')
            ->firstOrFail();

        $first = $this->pendingPayment($creator->id, $plan->id, $price);
        $second = $this->pendingPayment($creator->id, $plan->id, $price);

        $handler = app(VerifyEtSettlementHandler::class);

        DB::transaction(function () use ($handler, $first): void {
            $lifecycle = null;
            $this->assertTrue($handler->settle($this->verificationFor($first), $lifecycle));
        });
        DB::transaction(function () use ($handler, $second): void {
            $lifecycle = null;
            $this->assertTrue($handler->settle($this->verificationFor($second), $lifecycle));
        });

        $openCount = Subscription::query()
            ->where('user_id', $creator->id)
            ->where('gateway_name', 'verify_et')
            ->whereNull('ends_at')
            ->count();

        $this->assertSame(1, $openCount);
        $this->assertSame('paid', $first->fresh()->status);
        $this->assertSame('paid', $second->fresh()->status);
    }

    public function test_database_rejects_a_second_open_subscription_for_same_user_gateway(): void
    {
        $creator = User::factory()->create();
        $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
        $price = Price::query()->where('product_id', $plan->id)->firstOrFail();

        Subscription::query()->create([
            'user_id' => $creator->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'gateway_name' => 'verify_et',
            'gateway_id' => 'first-'.Str::uuid(),
            'gateway_status' => 'active',
            'renews_at' => now()->addMonth(),
            'ends_at' => null,
        ]);

        $this->expectException(QueryException::class);

        Subscription::query()->create([
            'user_id' => $creator->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'gateway_name' => 'verify_et',
            'gateway_id' => 'second-'.Str::uuid(),
            'gateway_status' => 'active',
            'renews_at' => now()->addMonth(),
            'ends_at' => null,
        ]);
    }

    private function pendingPayment(int $creatorId, int $productId, Price $price): ProSubscriptionPayment
    {
        return ProSubscriptionPayment::query()->create([
            'uuid' => (string) Str::uuid(),
            'creator_id' => $creatorId,
            'product_id' => $productId,
            'price_id' => $price->id,
            'amount_cents' => (int) round($price->amount * 100),
            'status' => 'pending_payment',
        ]);
    }

    private function verificationFor(ProSubscriptionPayment $payment): DirectPaymentVerification
    {
        return DirectPaymentVerification::query()->create([
            'attempt_uuid' => (string) Str::uuid(),
            'reference' => 'lk-pro-'.Str::lower(Str::random(12)),
            'payable_type' => ProSubscriptionPayment::class,
            'payable_id' => $payment->id,
            'bank_code' => 'telebirr',
            'settlement_account' => '0911223344',
            'amount_cents' => $payment->amount_cents,
            'currency' => 'ETB',
            'status' => 'verified',
            'idempotency_key' => 'idemp-'.Str::uuid(),
        ]);
    }
}
