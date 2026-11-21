<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\Commands\ReconcilePendingVerifications;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class VerificationExpiryRaceTest extends TestCase
{
    use DatabaseTransactions;

    public function test_reconcile_does_not_bulk_expire_in_progress_verifying_orders(): void
    {
        $creator = User::factory()->create();
        $workspace = $creator->workspaces()->first()
            ?? Workspace::factory()->create(['owner_id' => $creator->id]);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Verify expiry product',
            'price_cents' => 1500,
            'currency' => 'ETB',
            'status' => 'approved',
        ]);

        $verifying = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_email' => 'buyer@test.com',
            'currency' => 'ETB',
            'gross_amount_cents' => 1500,
            'commission_bps' => 1000,
            'platform_fee_percent' => 10,
            'platform_fee_cents' => 150,
            'creator_earnings_cents' => 1350,
            'status' => 'verifying',
            'payment_gateway' => 'verify_et',
            'payment_expires_at' => now()->subHour(),
            'verification_attempts' => 1,
        ]);

        $pending = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_email' => 'buyer2@test.com',
            'currency' => 'ETB',
            'gross_amount_cents' => 1500,
            'commission_bps' => 1000,
            'platform_fee_percent' => 10,
            'platform_fee_cents' => 150,
            'creator_earnings_cents' => 1350,
            'status' => 'pending_payment',
            'payment_gateway' => 'verify_et',
            'payment_expires_at' => now()->subHour(),
            'verification_attempts' => 1,
        ]);

        $this->artisan(ReconcilePendingVerifications::class)->assertSuccessful();

        $this->assertSame('verifying', $verifying->fresh()->status);
        $this->assertSame('expired', $pending->fresh()->status);
    }
}
