<?php

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductOrderRecovery;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentDispute;
use App\Storefront\Models\StorefrontPaymentDisputeEvent;
use App\Storefront\Notifications\PaymentDisputeStatusChangedNotification;
use App\Storefront\OrderRecoveryService;
use Common\Workspaces\Actions\CreateWorkspace;
use Database\Seeders\SupportDefaultsSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

beforeEach(function () {
    $this->seed(SupportDefaultsSeeder::class);
});

it('queues dispute notifications with retries and after-commit delivery', function () {
    Queue::fake();

    [$order, $cookie] = paymentDisputeQueueCreateOrder('queue-buyer@example.test');

    paymentDisputeQueueStateful()
        ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
        ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
            'reason' => 'missing_file',
            'message' => 'Download still fails after refresh.',
        ])
        ->assertCreated();

    Queue::assertPushed(SendQueuedNotifications::class, function (SendQueuedNotifications $job) {
        return $job->notification instanceof PaymentDisputeStatusChangedNotification;
    });

    $notification = new PaymentDisputeStatusChangedNotification(1, '', 'open', 'buyer');

    expect($notification)->toBeInstanceOf(\Illuminate\Contracts\Queue\ShouldQueue::class)
        ->and($notification->tries)->toBe(3)
        ->and($notification->backoff)->toBe([60, 300, 900])
        ->and($notification->viaQueues())->toMatchArray([
            'mail' => 'mail',
            'database' => 'default',
        ]);
});

it('does not duplicate audit events or notifications when status patch is retried', function () {
    Notification::fake();

    [$order, $cookie] = paymentDisputeQueueCreateOrder('retry-buyer@example.test');
    $disputeId = paymentDisputeQueueStateful()
        ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
        ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
            'reason' => 'wrong_reference',
            'message' => 'Bank reference needs review.',
        ])
        ->assertCreated()
        ->json('dispute.id');

    $creator = User::query()->findOrFail($order->creator_id);
    $disputePk = StorefrontPaymentDispute::query()->where('uuid', $disputeId)->value('id');

    paymentDisputeQueueStateful()
        ->actingAs($creator)
        ->patchJson("/api/v1/storefront/direct-orders/{$order->uuid}/disputes/{$disputeId}", [
            'status' => 'investigating',
            'note' => 'First investigate call.',
        ])
        ->assertOk()
        ->assertJsonPath('changed', true);

    $eventsAfterFirst = StorefrontPaymentDisputeEvent::query()
        ->where('storefront_payment_dispute_id', $disputePk)
        ->count();
    $sentAfterFirst = Notification::sent($creator, PaymentDisputeStatusChangedNotification::class)->count();

    paymentDisputeQueueStateful()
        ->actingAs($creator)
        ->patchJson("/api/v1/storefront/direct-orders/{$order->uuid}/disputes/{$disputeId}", [
            'status' => 'investigating',
            'note' => 'Duplicate investigate retry.',
        ])
        ->assertOk()
        ->assertJsonPath('changed', false)
        ->assertJsonPath('dispute.lifecycle_status', 'investigating');

    expect(StorefrontPaymentDisputeEvent::query()->where('storefront_payment_dispute_id', $disputePk)->count())
        ->toBe($eventsAfterFirst)
        ->and(Notification::sent($creator, PaymentDisputeStatusChangedNotification::class)->count())
        ->toBe($sentAfterFirst)
        ->and($order->fresh()->status)->toBe('paid');
});

it('keeps payment and verification untouched when a queued notification fails after send', function () {
    [$order, $cookie] = paymentDisputeQueueCreateOrder('fail-buyer@example.test', 'mismatch');
    $order->update(['status' => 'failed_verification']);

    $disputeId = paymentDisputeQueueStateful()
        ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
        ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
            'reason' => 'wrong_reference',
            'message' => 'Funds left my account.',
        ])
        ->assertCreated()
        ->json('dispute.id');

    $dispute = StorefrontPaymentDispute::query()->where('uuid', $disputeId)->firstOrFail();
    $notification = new PaymentDisputeStatusChangedNotification(
        $dispute->id,
        'open',
        'investigating',
        'buyer',
        'worker failure simulation',
    );

    expect($notification->shouldSend(User::factory()->make(), 'mail'))->toBeTrue()
        ->and($order->fresh()->status)->toBe('failed_verification')
        ->and(DirectPaymentVerification::query()->where('payable_id', $order->id)->value('status'))->toBe('mismatch')
        ->and(Schema::hasTable('digital_product_payment_refunds')
            ? DB::table('digital_product_payment_refunds')->count()
            : 0)->toBe(0);
});

it('enforces buyer creator and admin permission boundaries on dispute routes', function () {
    [$order, $cookie] = paymentDisputeQueueCreateOrder('perm-buyer@example.test');
    $disputeId = paymentDisputeQueueStateful()
        ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
        ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
            'reason' => 'duplicate_payment',
            'message' => 'Saw two charges.',
        ])
        ->assertCreated()
        ->json('dispute.id');

    $stranger = User::factory()->create();
    paymentDisputeQueueStateful()
        ->actingAs($stranger)
        ->getJson("/api/v1/admin/storefront/payment-disputes/{$disputeId}")
        ->assertForbidden();

    paymentDisputeQueueStateful()
        ->actingAs($stranger)
        ->patchJson("/api/v1/admin/storefront/payment-disputes/{$disputeId}", [
            'status' => 'investigating',
        ])
        ->assertForbidden();

    paymentDisputeQueueStateful()
        ->actingAs($stranger)
        ->patchJson("/api/v1/storefront/direct-orders/{$order->uuid}/disputes/{$disputeId}", [
            'status' => 'investigating',
        ])
        ->assertForbidden();

    $otherCookie = paymentDisputeQueuePortalCookie('other-buyer@example.test');
    paymentDisputeQueueStateful()
        ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $otherCookie])
        ->getJson("/api/v1/public/my-portal/disputes/{$disputeId}")
        ->assertNotFound();
});

/**
 * @return array{0: StorefrontOrder, 1: string}
 */
function paymentDisputeQueueCreateOrder(string $buyerEmail, string $verificationStatus = 'success'): array
{
    $creator = User::factory()->create();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Queue dispute product',
        'price_cents' => 8000,
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
        'buyer_name' => 'Queue Buyer',
        'currency' => 'ETB',
        'gross_amount_cents' => 8000,
        'commission_bps' => 1000,
        'platform_fee_cents' => 800,
        'creator_earnings_cents' => 7200,
        'status' => $verificationStatus === 'success' ? 'paid' : 'failed_verification',
        'paid_at' => $verificationStatus === 'success' ? now() : null,
        'payment_gateway' => 'verify_et',
    ]);
    DirectPaymentVerification::query()->create([
        'reference' => 'FT26'.Str::upper(Str::random(14)),
        'payable_type' => StorefrontOrder::class,
        'payable_id' => $order->id,
        'bank_code' => 'cbe',
        'settlement_account' => '1000123456789',
        'amount_cents' => 8000,
        'currency' => 'ETB',
        'status' => $verificationStatus,
        'verified_at' => $verificationStatus === 'success' ? now() : null,
        'provider_request_id' => 'mock_'.Str::random(8),
    ]);

    return [$order, paymentDisputeQueuePortalCookie($buyerEmail)];
}

function paymentDisputeQueuePortalCookie(string $email): string
{
    $sessionToken = Str::random(80);
    $recovery = DigitalProductOrderRecovery::query()->create([
        'uuid' => (string) Str::uuid(),
        'email' => $email,
        'email_hash' => hash('sha256', $email),
        'token_hash' => hash('sha256', Str::random(20)),
        'expires_at' => now()->subMinute(),
        'redeemed_at' => now(),
        'session_token_hash' => hash('sha256', $sessionToken),
        'session_expires_at' => now()->addDays(30),
    ]);

    return "{$recovery->uuid}.{$sessionToken}";
}

function paymentDisputeQueueStateful()
{
    config()->set('app.url', 'http://localhost');
    config()->set('sanctum.stateful', ['localhost']);
    $csrfToken = 'test-csrf-token';

    return test()
        ->withCredentials()
        ->withSession(['_token' => $csrfToken])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', $csrfToken);
}
