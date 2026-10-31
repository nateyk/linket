<?php

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductOrderRecovery;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentDispute;
use App\Storefront\OrderRecoveryService;
use Common\Workspaces\Actions\CreateWorkspace;
use Database\Seeders\SupportDefaultsSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

beforeEach(function () {
    $this->seed(SupportDefaultsSeeder::class);
});

it('runs buyer create, creator investigate, admin close over real routes without mutating payment state', function () {
    $email = 'lifecycle-ui@example.test';
    $creator = User::factory()->create();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Lifecycle guide',
        'price_cents' => 5000,
        'currency' => 'ETB',
        'status' => 'approved',
        'approved_at' => now(),
        'type' => 'digital',
    ]);
    $order = StorefrontOrder::query()->create([
        'uuid' => (string) Str::uuid(),
        'digital_product_id' => $product->id,
        'creator_id' => $creator->id,
        'buyer_email' => $email,
        'buyer_name' => 'Lifecycle Buyer',
        'currency' => 'ETB',
        'gross_amount_cents' => 5000,
        'commission_bps' => 1000,
        'platform_fee_cents' => 500,
        'creator_earnings_cents' => 4500,
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
        'amount_cents' => 5000,
        'currency' => 'ETB',
        'status' => 'success',
        'verified_at' => now(),
        'provider_request_id' => 'mock_'.Str::random(8),
    ]);

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
    $cookie = "{$recovery->uuid}.{$sessionToken}";

    config()->set('app.url', 'http://localhost');
    config()->set('sanctum.stateful', ['localhost']);
    $csrfToken = 'test-csrf-token';
    $stateful = test()
        ->withCredentials()
        ->withSession(['_token' => $csrfToken])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', $csrfToken);

    $disputeId = $stateful
        ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
        ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
            'reason' => 'wrong_reference',
            'message' => 'Need help with this reference.',
        ])
        ->assertCreated()
        ->assertJsonPath('dispute.lifecycle_status', 'open')
        ->json('dispute.id');

    $stateful
        ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
        ->getJson("/api/v1/public/my-portal/disputes/{$disputeId}")
        ->assertOk()
        ->assertJsonMissingPath('payment_evidence')
        ->assertJsonPath('dispute.lifecycle_status', 'open');

    $stateful
        ->actingAs($creator)
        ->getJson("/api/v1/storefront/direct-orders/{$order->uuid}/disputes")
        ->assertOk()
        ->assertJsonPath('disputes.0.id', $disputeId)
        ->assertJsonPath('disputes.0.lifecycle_status', 'open');

    $stateful
        ->actingAs($creator)
        ->patchJson("/api/v1/storefront/direct-orders/{$order->uuid}/disputes/{$disputeId}", [
            'status' => 'investigating',
            'note' => 'Checking bank receipt.',
        ])
        ->assertOk()
        ->assertJsonPath('dispute.lifecycle_status', 'investigating');

    $admin = User::factory()->create();
    $admin->permissions()->attach(
        \Common\Permissions\Models\Permission::query()->firstOrCreate(['name' => 'admin.access']),
    );

    $stateful
        ->actingAs($admin)
        ->getJson('/api/v1/admin/storefront/payment-disputes')
        ->assertOk()
        ->assertJsonPath('disputes.0.id', $disputeId);

    $stateful
        ->actingAs($admin)
        ->getJson("/api/v1/admin/storefront/payment-disputes/{$disputeId}")
        ->assertOk()
        ->assertJsonStructure(['audit', 'payment_evidence'])
        ->assertJsonMissingPath('payment_evidence.provider_result');

    $stateful
        ->actingAs($admin)
        ->patchJson("/api/v1/admin/storefront/payment-disputes/{$disputeId}", [
            'status' => 'resolved',
            'note' => 'Buyer confirmed next steps.',
        ])
        ->assertOk()
        ->assertJsonPath('dispute.lifecycle_status', 'resolved');

    $stateful
        ->actingAs($admin)
        ->patchJson("/api/v1/admin/storefront/payment-disputes/{$disputeId}", [
            'status' => 'closed',
        ])
        ->assertOk()
        ->assertJsonPath('dispute.lifecycle_status', 'closed');

    expect(StorefrontPaymentDispute::query()->where('uuid', $disputeId)->value('lifecycle_status'))->toBe('closed')
        ->and($order->fresh()->status)->toBe('paid')
        ->and(DirectPaymentVerification::query()->where('payable_id', $order->id)->value('status'))->toBe('success');
});
