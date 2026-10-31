<?php

use App\Jobs\ProcessVerifyEtWebhook;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\VerifyEtWebhookDelivery;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\CreatorVerificationAllowance;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

it('requeues unmatched webhooks without duplicating orders or consuming extra allowances', function () {
    Bus::fake([ProcessVerifyEtWebhook::class]);

    $creator = User::factory()->create();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Recovery safety product',
        'price_cents' => 2500,
        'currency' => 'ETB',
        'status' => 'approved',
        'approved_at' => now(),
        'type' => 'digital',
    ]);
    $order = StorefrontOrder::query()->create([
        'uuid' => (string) Str::uuid(),
        'digital_product_id' => $product->id,
        'creator_id' => $creator->id,
        'buyer_email' => 'recovery-buyer@example.test',
        'buyer_name' => 'Recovery Buyer',
        'currency' => 'ETB',
        'gross_amount_cents' => 2500,
        'commission_bps' => 1000,
        'platform_fee_cents' => 250,
        'creator_earnings_cents' => 2250,
        'status' => 'verifying',
        'payment_gateway' => 'verify_et',
        'monetization_policy' => CreatorVerificationAllowance::FREE_POLICY,
    ]);

    DirectPaymentVerification::query()->create([
        'reference' => 'FT26'.Str::upper(Str::random(14)),
        'payable_type' => StorefrontOrder::class,
        'payable_id' => $order->id,
        'bank_code' => 'cbe',
        'settlement_account' => '1000123456789',
        'amount_cents' => 2500,
        'currency' => 'ETB',
        'status' => 'verifying',
        'provider_request_id' => 'req_recovery_1',
        'idempotency_key' => 'idem_recovery_1',
    ]);

    DB::table('creator_verification_allowances')->insert([
        'creator_id' => $creator->id,
        'storefront_order_id' => $order->id,
        'status' => 'reserved',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $delivery = VerifyEtWebhookDelivery::query()->create([
        'event_id' => (string) Str::uuid(),
        'provider_request_id' => 'req_recovery_1',
        'event_type' => 'verification.completed',
        'status' => 'unmatched',
        'payload' => ['requestId' => 'req_recovery_1', 'status' => 'success'],
        'received_at' => now()->subMinutes(5),
    ]);

    $ordersBefore = StorefrontOrder::query()->count();
    $allowancesBefore = DB::table('creator_verification_allowances')->where('creator_id', $creator->id)->count();
    $proBefore = app(CreatorVerificationAllowance::class)->isPro($creator);

    $this->artisan('billing:reconcile-pending-verifications')->assertSuccessful();

    Bus::assertDispatched(
        ProcessVerifyEtWebhook::class,
        fn (ProcessVerifyEtWebhook $job) => $job->deliveryId === $delivery->id,
    );

    expect(StorefrontOrder::query()->count())->toBe($ordersBefore)
        ->and(DB::table('creator_verification_allowances')->where('creator_id', $creator->id)->count())->toBe($allowancesBefore)
        ->and(app(CreatorVerificationAllowance::class)->isPro($creator))->toBe($proBefore)
        ->and($order->fresh()->status)->toBe('verifying')
        ->and(DirectPaymentVerification::query()->where('payable_id', $order->id)->value('status'))->toBe('verifying');
});

it('is safe to rerun reconcile when no pending work remains', function () {
    $this->artisan('billing:reconcile-pending-verifications')->assertSuccessful();
    $this->artisan('billing:reconcile-pending-verifications')->assertSuccessful();
});
