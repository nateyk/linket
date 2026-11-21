<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\Services\StorefrontPaymentVerificationService;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use ReflectionMethod;
use Tests\TestCase;

class StorefrontPaymentAttemptStatusClobberTest extends TestCase
{
    use DatabaseTransactions;

    public function test_record_verification_failure_does_not_overwrite_successful_attempt(): void
    {
        $creator = User::factory()->create();
        $workspace = $creator->workspaces()->first()
            ?? Workspace::factory()->create(['owner_id' => $creator->id]);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Clobber product',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'approved',
        ]);

        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA,
            'currency' => 'ETB',
            'gross_amount_cents' => 1000,
            'commission_bps' => 500,
            'platform_fee_percent' => 5,
            'platform_fee_cents' => 50,
            'creator_earnings_cents' => 950,
            'status' => 'paid',
            'payment_gateway' => 'chapa',
            'chapa_tx_ref' => 'lk-tx-success-1',
            'buyer_email' => 'buyer@test.com',
        ]);

        $attempt = StorefrontPaymentAttempt::query()->create([
            'order_id' => $order->id,
            'merchant_reference' => 'lk-tx-success-1',
            'idempotency_key' => 'idemp-clobber-1',
            'amount_cents' => 1000,
            'currency' => 'ETB',
            'status' => StorefrontPaymentAttempt::STATUS_SUCCESSFUL,
            'verified_at' => now(),
        ]);

        $service = app(StorefrontPaymentVerificationService::class);
        $method = new ReflectionMethod($service, 'recordVerificationFailure');
        $method->setAccessible(true);
        $method->invoke(
            $service,
            $attempt,
            ['status' => 'failed'],
            'FAILED',
            1000,
            'ETB',
        );

        $this->assertSame(
            StorefrontPaymentAttempt::STATUS_SUCCESSFUL,
            $attempt->fresh()->status,
        );
    }
}
