<?php

namespace Tests\Feature;

use App\Conversations\Models\Conversation;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductOrderRecovery;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentDispute;
use App\Storefront\Notifications\PaymentDisputeStatusChangedNotification;
use App\Storefront\OrderRecoveryService;
use Common\Workspaces\Actions\CreateWorkspace;
use Database\Seeders\SupportDefaultsSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class PaymentDisputeTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SupportDefaultsSeeder::class);
        if (! is_dir(storage_path('app/purifier'))) {
            mkdir(storage_path('app/purifier'), 0775, true);
        }
    }

    public function test_portal_buyer_can_report_wrong_reference_for_own_paid_order(): void
    {
        $email = 'dispute-buyer@example.test';
        $order = $this->createPaidOrderWithVerification($email);
        $cookie = $this->portalSessionCookie($email);

        $response = $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
                'reason' => 'wrong_reference',
                'message' => 'I entered the wrong bank reference by mistake.',
            ]);

        $response->assertCreated()
            ->assertJsonPath('dispute.reason', 'wrong_reference')
            ->assertJsonPath('dispute.order_id', $order->uuid)
            ->assertJsonPath('dispute.status_category', Conversation::STATUS_OPEN);

        $this->assertDatabaseHas('storefront_payment_disputes', [
            'storefront_order_id' => $order->id,
            'reason' => 'wrong_reference',
            'creator_id' => $order->creator_id,
        ]);

        $dispute = StorefrontPaymentDispute::query()
            ->where('uuid', $response->json('dispute.id'))
            ->firstOrFail();
        $this->assertNotNull($dispute->conversation_id);
        $conversation = Conversation::query()->findOrFail($dispute->conversation_id);
        $this->assertSame($order->creator_id, $conversation->support_owner_id);
        $this->assertTrue($conversation->items()->where('type', 'message')->exists());

        // Dispute must not mutate payment outcome or invent a paid state change.
        $this->assertSame('paid', $order->fresh()->status);
        $this->assertSame(
            'success',
            DirectPaymentVerification::query()->where('payable_id', $order->id)->value('status'),
        );
    }

    public function test_portal_buyer_cannot_dispute_another_buyers_order(): void
    {
        $order = $this->createPaidOrderWithVerification('owner@example.test');
        $cookie = $this->portalSessionCookie('intruder@example.test');

        $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
                'reason' => 'missing_file',
                'message' => 'Trying to access someone else order.',
            ])
            ->assertForbidden();

        $this->assertSame(
            0,
            StorefrontPaymentDispute::query()->where('storefront_order_id', $order->id)->count(),
        );
    }

    public function test_portal_buyer_can_list_and_view_dispute_status(): void
    {
        $email = 'status-buyer@example.test';
        $order = $this->createPaidOrderWithVerification($email);
        $cookie = $this->portalSessionCookie($email);

        $created = $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
                'reason' => 'duplicate_payment',
                'message' => 'I was charged twice for the same purchase.',
            ])
            ->assertCreated()
            ->json('dispute');

        $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->getJson('/api/v1/public/my-portal/disputes')
            ->assertOk()
            ->assertJsonPath('disputes.0.id', $created['id'])
            ->assertJsonPath('disputes.0.reason', 'duplicate_payment');

        $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->getJson("/api/v1/public/my-portal/disputes/{$created['id']}")
            ->assertOk()
            ->assertJsonPath('dispute.id', $created['id'])
            ->assertJsonStructure(['dispute' => ['id', 'reason', 'status', 'status_category', 'order_id', 'created_at']]);
    }

    public function test_creator_can_view_disputes_for_own_orders_with_payment_evidence(): void
    {
        $email = 'creator-dispute@example.test';
        $order = $this->createPaidOrderWithVerification($email);
        $cookie = $this->portalSessionCookie($email);

        $disputeId = $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
                'reason' => 'missing_file',
                'message' => 'Download link never arrived.',
            ])
            ->assertCreated()
            ->json('dispute.id');

        $creator = User::query()->findOrFail($order->creator_id);

        $this->portalStateful()
            ->actingAs($creator)
            ->getJson("/api/v1/storefront/direct-orders/{$order->uuid}/disputes")
            ->assertOk()
            ->assertJsonPath('disputes.0.id', $disputeId)
            ->assertJsonPath('disputes.0.payment_evidence.status', 'success')
            ->assertJsonMissingPath('disputes.0.payment_evidence.provider_result')
            ->assertJsonMissingPath('disputes.0.payment_evidence.provider_input');
    }

    public function test_creator_cannot_view_disputes_for_other_creators_orders(): void
    {
        $order = $this->createPaidOrderWithVerification('buyer@example.test');
        $cookie = $this->portalSessionCookie('buyer@example.test');
        $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
                'reason' => 'wrong_reference',
                'message' => 'Wrong ref.',
            ])
            ->assertCreated();

        $stranger = User::factory()->create();

        $this->portalStateful()
            ->actingAs($stranger)
            ->getJson("/api/v1/storefront/direct-orders/{$order->uuid}/disputes")
            ->assertForbidden();
    }

    public function test_admin_can_review_dispute_with_evidence_and_audit_history(): void
    {
        $email = 'admin-dispute@example.test';
        $order = $this->createPaidOrderWithVerification($email);
        $cookie = $this->portalSessionCookie($email);
        $disputeId = $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
                'reason' => 'duplicate_payment',
                'message' => 'Duplicate transfer.',
            ])
            ->assertCreated()
            ->json('dispute.id');

        $admin = User::factory()->create();
        $admin->permissions()->attach(
            \Common\Permissions\Models\Permission::query()->firstOrCreate(['name' => 'admin.access']),
        );

        $this->portalStateful()
            ->actingAs($admin)
            ->getJson("/api/v1/admin/storefront/payment-disputes/{$disputeId}")
            ->assertOk()
            ->assertJsonPath('dispute.id', $disputeId)
            ->assertJsonPath('dispute.reason', 'duplicate_payment')
            ->assertJsonPath('order.id', $order->uuid)
            ->assertJsonPath('payment_evidence.status', 'success')
            ->assertJsonStructure([
                'audit' => [
                    '*' => ['type', 'created_at'],
                ],
            ])
            ->assertJsonMissingPath('payment_evidence.provider_result');
    }

    public function test_rejects_unknown_dispute_reason_and_does_not_bypass_verification(): void
    {
        $email = 'bad-reason@example.test';
        $order = $this->createPaidOrderWithVerification($email);
        $cookie = $this->portalSessionCookie($email);

        $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
                'reason' => 'force_paid',
                'message' => 'Please mark as paid without Verify.et.',
            ])
            ->assertUnprocessable();

        $this->assertSame('paid', $order->fresh()->status);
        $this->assertSame(
            0,
            StorefrontPaymentDispute::query()->where('storefront_order_id', $order->id)->count(),
        );
    }

    public function test_duplicate_open_dispute_for_same_order_and_reason_is_idempotent(): void
    {
        Notification::fake();
        $email = 'dup-buyer@example.test';
        $order = $this->createPaidOrderWithVerification($email);
        $cookie = $this->portalSessionCookie($email);
        $payload = [
            'reason' => 'missing_file',
            'message' => 'File still missing after refresh.',
        ];

        $first = $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", $payload)
            ->assertCreated()
            ->json('dispute.id');

        $second = $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", $payload)
            ->assertOk()
            ->json('dispute.id');

        $this->assertSame($first, $second);
        $this->assertSame(
            1,
            StorefrontPaymentDispute::query()->where('storefront_order_id', $order->id)->count(),
        );
    }

    public function test_creator_and_admin_can_transition_open_to_investigating_to_resolved_or_closed(): void
    {
        Notification::fake();
        $email = 'flow-buyer@example.test';
        $order = $this->createPaidOrderWithVerification($email);
        $cookie = $this->portalSessionCookie($email);
        $disputeId = $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
                'reason' => 'wrong_reference',
                'message' => 'Need help correcting the reference.',
            ])
            ->assertCreated()
            ->json('dispute.id');

        $creator = User::query()->findOrFail($order->creator_id);
        $this->portalStateful()
            ->actingAs($creator)
            ->patchJson("/api/v1/storefront/direct-orders/{$order->uuid}/disputes/{$disputeId}", [
                'status' => 'investigating',
                'note' => 'Looking into the bank receipt.',
            ])
            ->assertOk()
            ->assertJsonPath('dispute.lifecycle_status', 'investigating');

        $this->portalStateful()
            ->actingAs($creator)
            ->patchJson("/api/v1/storefront/direct-orders/{$order->uuid}/disputes/{$disputeId}", [
                'status' => 'resolved',
                'note' => 'Buyer confirmed the corrected reference.',
            ])
            ->assertOk()
            ->assertJsonPath('dispute.lifecycle_status', 'resolved');

        $admin = User::factory()->create();
        $admin->permissions()->attach(
            \Common\Permissions\Models\Permission::query()->firstOrCreate(['name' => 'admin.access']),
        );

        $this->portalStateful()
            ->actingAs($admin)
            ->patchJson("/api/v1/admin/storefront/payment-disputes/{$disputeId}", [
                'status' => 'closed',
                'note' => 'Closed after creator resolution.',
            ])
            ->assertOk()
            ->assertJsonPath('dispute.lifecycle_status', 'closed');

        $dispute = StorefrontPaymentDispute::query()->where('uuid', $disputeId)->firstOrFail();
        $this->assertSame('closed', $dispute->lifecycle_status);
        $this->assertGreaterThanOrEqual(3, $dispute->events()->count());
        $this->assertSame('paid', $order->fresh()->status);
        Notification::assertSentTo($creator, PaymentDisputeStatusChangedNotification::class);
    }

    public function test_creator_cannot_update_another_creators_dispute_or_skip_to_closed(): void
    {
        $email = 'iso-buyer@example.test';
        $order = $this->createPaidOrderWithVerification($email);
        $cookie = $this->portalSessionCookie($email);
        $disputeId = $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
                'reason' => 'duplicate_payment',
                'message' => 'Possible double charge.',
            ])
            ->assertCreated()
            ->json('dispute.id');

        $stranger = User::factory()->create();
        $this->portalStateful()
            ->actingAs($stranger)
            ->patchJson("/api/v1/storefront/direct-orders/{$order->uuid}/disputes/{$disputeId}", [
                'status' => 'investigating',
            ])
            ->assertForbidden();

        $creator = User::query()->findOrFail($order->creator_id);
        $this->portalStateful()
            ->actingAs($creator)
            ->patchJson("/api/v1/storefront/direct-orders/{$order->uuid}/disputes/{$disputeId}", [
                'status' => 'closed',
            ])
            ->assertUnprocessable();

        $this->assertSame('open', StorefrontPaymentDispute::query()->where('uuid', $disputeId)->value('lifecycle_status'));
    }

    public function test_status_change_does_not_refund_or_mark_payment_verified(): void
    {
        $email = 'safe-buyer@example.test';
        $order = $this->createPaidOrderWithVerification($email, verificationStatus: 'mismatch');
        $order->update(['status' => 'failed_verification']);
        $cookie = $this->portalSessionCookie($email);
        $disputeId = $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
                'reason' => 'wrong_reference',
                'message' => 'Bank says funds left my account.',
            ])
            ->assertCreated()
            ->json('dispute.id');

        $admin = User::factory()->create();
        $admin->permissions()->attach(
            \Common\Permissions\Models\Permission::query()->firstOrCreate(['name' => 'admin.access']),
        );

        $this->portalStateful()
            ->actingAs($admin)
            ->patchJson("/api/v1/admin/storefront/payment-disputes/{$disputeId}", [
                'status' => 'investigating',
            ])
            ->assertOk();

        $this->portalStateful()
            ->actingAs($admin)
            ->patchJson("/api/v1/admin/storefront/payment-disputes/{$disputeId}", [
                'status' => 'resolved',
                'note' => 'Explained next steps to buyer.',
            ])
            ->assertOk();

        $this->assertSame('failed_verification', $order->fresh()->status);
        $this->assertSame(
            'mismatch',
            DirectPaymentVerification::query()->where('payable_id', $order->id)->value('status'),
        );
        $this->assertDatabaseCount('digital_product_payment_refunds', 0);
    }

    public function test_buyer_cannot_see_provider_evidence_payloads(): void
    {
        $email = 'privacy-buyer@example.test';
        $order = $this->createPaidOrderWithVerification($email);
        $cookie = $this->portalSessionCookie($email);
        $disputeId = $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->postJson("/api/v1/public/my-portal/purchases/{$order->uuid}/disputes", [
                'reason' => 'missing_file',
                'message' => 'Still cannot download.',
            ])
            ->assertCreated()
            ->json('dispute.id');

        $this->portalStateful()
            ->withUnencryptedCookies([OrderRecoveryService::COOKIE => $cookie])
            ->getJson("/api/v1/public/my-portal/disputes/{$disputeId}")
            ->assertOk()
            ->assertJsonMissingPath('payment_evidence')
            ->assertJsonMissingPath('dispute.payment_evidence')
            ->assertJsonPath('dispute.lifecycle_status', 'open');
    }

    private function createPaidOrderWithVerification(string $buyerEmail, string $verificationStatus = 'success'): StorefrontOrder
    {
        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Dispute guide',
            'price_cents' => 10000,
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
            'buyer_name' => 'Dispute Buyer',
            'currency' => 'ETB',
            'gross_amount_cents' => 10000,
            'commission_bps' => 1000,
            'platform_fee_cents' => 1000,
            'creator_earnings_cents' => 9000,
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
            'amount_cents' => 10000,
            'currency' => 'ETB',
            'status' => $verificationStatus,
            'verified_at' => $verificationStatus === 'success' ? now() : null,
            'provider_request_id' => 'mock_'.Str::random(8),
            'provider_result' => ['raw' => 'secret-provider-payload'],
        ]);

        return $order;
    }

    private function portalSessionCookie(string $email): string
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

    private function portalStateful(): static
    {
        config()->set('app.url', 'http://localhost');
        config()->set('sanctum.stateful', ['localhost']);
        $csrfToken = 'test-csrf-token';

        return $this->withCredentials()
            ->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
