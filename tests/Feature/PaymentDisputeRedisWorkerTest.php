<?php

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentDispute;
use App\Storefront\Notifications\PaymentDisputeStatusChangedNotification;
use App\Storefront\Services\CreatePaymentDispute;
use Common\Workspaces\Actions\CreateWorkspace;
use Database\Seeders\SupportDefaultsSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

beforeEach(function () {
    $this->seed(SupportDefaultsSeeder::class);
});

it('can push and drain a redis dispute notification without mutating payment state', function () {
    try {
        $pong = Redis::connection()->ping();
        expect($pong === true || $pong === 1 || str_contains(strtoupper((string) $pong), 'PONG'))->toBeTrue();
    } catch (Throwable $e) {
        $this->markTestSkipped('Redis unavailable: '.$e->getMessage());
    }

    config()->set('queue.default', 'redis');
    config()->set('mail.default', 'array');

    $creator = User::factory()->create();
    $buyerEmail = 'redis-worker-buyer-'.Str::lower(Str::random(6)).'@example.test';
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Redis worker product',
        'price_cents' => 4000,
        'currency' => 'ETB',
        'status' => 'approved',
        'approved_at' => now(),
        'type' => 'digital',
    ]);
    $order = StorefrontOrder::query()->create([
        'uuid' => (string) Str::uuid(),
        'digital_product_id' => $product->id,
        'creator_id' => $creator->id,
        'buyer_email' => $buyerEmail,
        'buyer_name' => 'Redis Buyer',
        'currency' => 'ETB',
        'gross_amount_cents' => 4000,
        'commission_bps' => 1000,
        'platform_fee_cents' => 400,
        'creator_earnings_cents' => 3600,
        'status' => 'paid',
        'paid_at' => now(),
        'payment_gateway' => 'verify_et',
    ]);
    DirectPaymentVerification::query()->create([
        'reference' => 'FT26'.Str::upper(Str::random(14)),
        'payable_type' => StorefrontOrder::class,
        'payable_id' => $order->id,
        'bank_code' => 'cbe',
        'settlement_account' => '1000123456789',
        'amount_cents' => 4000,
        'currency' => 'ETB',
        'status' => 'success',
        'verified_at' => now(),
        'provider_request_id' => 'mock_'.Str::random(8),
    ]);

    $result = app(CreatePaymentDispute::class)->execute(
        $order,
        $buyerEmail,
        'missing_file',
        'Redis worker download missing.',
    );
    $dispute = $result['dispute'];

    $buyer = User::query()->whereRaw('LOWER(email) = ?', [strtolower($buyerEmail)])->firstOrFail();

    // Bypass afterCommit deferral under DatabaseTransactions by sending immediately.
    Notification::sendNow(
        $buyer,
        new PaymentDisputeStatusChangedNotification(
            $dispute->id,
            '',
            StorefrontPaymentDispute::STATUS_OPEN,
            'buyer',
            'redis worker smoke',
        ),
    );

    $exit = Artisan::call('queue:work', [
        'connection' => 'redis',
        '--queue' => 'mail,default',
        '--stop-when-empty' => true,
        '--tries' => 1,
        '--max-jobs' => 5,
    ]);

    expect($exit)->toBe(0)
        ->and($order->fresh()->status)->toBe('paid')
        ->and(DirectPaymentVerification::query()->where('payable_id', $order->id)->value('status'))->toBe('success')
        ->and($dispute->fresh()->lifecycle_status)->toBe('open')
        ->and(Artisan::output())->not->toContain('FAIL');
});
