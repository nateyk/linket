<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\Commands\ProcessDirectSubscriptionRenewals;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use App\Payments\VerifyEt\VerifyEtGateway;
use App\Storefront\Models\CommissionInvoice;
use App\Storefront\Services\AccountMonetizationStatus;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Workspaces\Actions\CreateWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class DirectBillingContractTest extends TestCase
{
    use DatabaseTransactions;

    public function testPendingProPaymentRetainsItsSnapshotWhenCurrentPriceIsUnavailable(): void
    {
        config()->set('services.verify_et.enabled', true);
        config()->set('services.verify_et.corporate_account', '1000123456789');
        $creator = User::factory()->create();
        [$plan] = $this->proPlan();
        $payment = ProSubscriptionPayment::query()->create(['uuid' => (string) Str::uuid(), 'creator_id' => $creator->id, 'product_id' => $plan->id, 'amount_cents' => 50000, 'status' => 'pending_payment']);
        Price::query()->where('product_id', $plan->id)->where('currency', 'ETB')->where('interval', 'month')->update(['amount' => 0]);
        $this->stateful()->actingAs($creator)->postJson('/api/v1/billing/direct/pro')->assertOk()->assertJsonPath('payment_id', $payment->uuid)->assertJsonPath('amount_cents', 50000);
    }

    public function testNewProPaymentUsesUpdatedPriceWithoutChangingExistingSnapshot(): void
    {
        config()->set('services.verify_et.enabled', true);
        config()->set('services.verify_et.corporate_account', '1000123456789');
        [$plan, $price] = $this->proPlan();
        $creator = User::factory()->create();
        $this->stateful()->actingAs($creator);
        $first = $this->postJson('/api/v1/billing/direct/pro')->assertOk()->assertJsonPath('amount_cents', 50000);
        $price->update(['amount' => 700]);
        $this->postJson('/api/v1/billing/direct/pro')->assertOk()->assertJsonPath('payment_id', $first->json('payment_id'))->assertJsonPath('amount_cents', 50000);
        ProSubscriptionPayment::query()->where('uuid', $first->json('payment_id'))->update(['status' => 'paid']);
        $this->postJson('/api/v1/billing/direct/pro')->assertOk()->assertJsonPath('amount_cents', 70000);
        $this->assertSame(50000, ProSubscriptionPayment::query()->where('uuid', $first->json('payment_id'))->value('amount_cents'));
    }

    public function testCreatorBillingSummaryIncludesConfiguredProPriceAndSubscriptionDates(): void
    {
        [$plan, $price] = $this->proPlan();
        $creator = User::factory()->create();
        $renewsAt = now()->addDays(5)->startOfSecond();
        Subscription::query()->create([
            'user_id' => $creator->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'gateway_name' => 'verify_et',
            'gateway_status' => 'active',
            'renews_at' => $renewsAt,
        ]);

        $this->stateful()->actingAs($creator)->getJson('/api/v1/billing/direct')
            ->assertOk()
            ->assertJsonPath('pro_plan.monthly_price_cents', 50000)
            ->assertJsonPath('pro_subscription.status', 'active')
            ->assertJsonPath('pro_subscription.renews_at', $renewsAt->toIso8601String())
            ->assertJsonPath('pro_subscription.can_renew', true);
    }

    public function testCreatorBillingSummaryIncludesOnlyTheirProPaymentsAndVerificationHistory(): void
    {
        [$plan, $price] = $this->proPlan();
        $creator = User::factory()->create();
        $otherCreator = User::factory()->create();
        $payment = ProSubscriptionPayment::query()->create([
            'uuid' => (string) Str::uuid(),
            'creator_id' => $creator->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'amount_cents' => 50000,
            'status' => 'pending_payment',
        ]);
        $verification = DirectPaymentVerification::query()->create([
            'reference' => 'HISTORY' . Str::upper(Str::random(12)),
            'payable_type' => ProSubscriptionPayment::class,
            'payable_id' => $payment->id,
            'bank_code' => 'cbe',
            'settlement_account' => '1000123456789',
            'amount_cents' => 50000,
            'currency' => 'ETB',
            'status' => 'manual_review',
        ]);
        ProSubscriptionPayment::query()->create([
            'uuid' => (string) Str::uuid(),
            'creator_id' => $otherCreator->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'amount_cents' => 50000,
            'status' => 'paid',
        ]);

        $this->stateful()->actingAs($creator)->getJson('/api/v1/billing/direct')
            ->assertOk()
            ->assertJsonPath('pro_subscription.payments.0.payment_id', $payment->uuid)
            ->assertJsonPath('pro_subscription.pending_payment.payment_id', $payment->uuid)
            ->assertJsonPath('pro_subscription.payments.0.status', 'manual_review')
            ->assertJsonPath('pro_subscription.payments.0.transaction_reference', $verification->reference)
            ->assertJsonCount(1, 'pro_subscription.payments');
    }

    public function testChapaSubscriptionAndCommissionInvoiceRemainSeparateFromProReceipts(): void
    {
        [$plan, $price] = $this->proPlan();
        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $subscription = Subscription::query()->create([
            'user_id' => $creator->id, 'product_id' => $plan->id, 'price_id' => $price->id,
            'gateway_name' => 'chapa', 'gateway_status' => 'active', 'renews_at' => now()->addMonth(),
        ]);
        $invoice = CommissionInvoice::query()->create([
            'uuid' => (string) Str::uuid(), 'creator_id' => $creator->id, 'workspace_id' => $workspace->id,
            'invoice_number' => 'CM-'.Str::upper(Str::random(10)),
            'period_start' => now()->subMonth()->startOfMonth()->toDateString(),
            'period_end' => now()->subMonth()->endOfMonth()->toDateString(),
            'commission_fee_cents' => 5000, 'status' => 'pending', 'due_at' => now()->addDays(4),
        ]);
        $payment = ProSubscriptionPayment::query()->create([
            'uuid' => (string) Str::uuid(), 'creator_id' => $creator->id, 'product_id' => $plan->id,
            'price_id' => $price->id, 'amount_cents' => 50000, 'status' => 'paid', 'paid_at' => now(),
            'receipt_number' => 'LINKET-SEPARATE-'.Str::upper(Str::random(8)),
            'subscription_period_start' => now(), 'subscription_period_end' => now()->addMonth(),
        ]);
        DirectPaymentVerification::query()->create([
            'reference' => 'SEPARATE'.Str::upper(Str::random(10)), 'payable_type' => ProSubscriptionPayment::class,
            'payable_id' => $payment->id, 'bank_code' => 'cbe', 'settlement_account' => '1000123456789',
            'amount_cents' => 50000, 'currency' => 'ETB', 'status' => 'success',
        ]);

        $this->stateful()->actingAs($creator)->getJson('/api/v1/billing/direct')
            ->assertOk()
            ->assertJsonPath('pro_subscription.status', 'active')
            ->assertJsonCount(1, 'pro_subscription.payments')
            ->assertJsonPath('pro_subscription.payments.0.payment_id', $payment->uuid)
            ->assertJsonPath('pro_subscription.payments.0.receipt_number', $payment->receipt_number)
            ->assertJsonCount(1, 'invoices.data')
            ->assertJsonPath('invoices.data.0.uuid', $invoice->uuid);
        $this->get('/api/v1/billing/direct/pro/'.$invoice->uuid.'/receipt')->assertNotFound();
        $this->get('/api/v1/billing/direct/pro/'.$payment->uuid.'/receipt')->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertDatabaseHas('subscriptions', ['id' => $subscription->id, 'gateway_name' => 'chapa']);
        $this->assertDatabaseHas('commission_invoices', ['id' => $invoice->id, 'status' => 'pending']);
    }

    public function testVerifiedProPaymentActivatesVerifyEtSubscriptionExactlyOnce(): void
    {
        config()->set('services.verify_et.enabled', true);
        $creator = User::factory()->create();
        [$plan, $price] = $this->proPlan();
        $payment = ProSubscriptionPayment::query()->create([
            'uuid' => (string) Str::uuid(),
            'creator_id' => $creator->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'amount_cents' => 50000,
            'status' => 'pending_payment',
        ]);
        $verification = DirectPaymentVerification::query()->create([
            'reference' => 'PRO' . Str::upper(Str::random(12)),
            'payable_type' => ProSubscriptionPayment::class,
            'payable_id' => $payment->id,
            'bank_code' => 'cbe',
            'settlement_account' => '1000123456789',
            'amount_cents' => 50000,
            'currency' => 'ETB',
        ]);
        $result = $this->matchedResult($verification, 500, '1000123456789');

        $price->update(['amount' => 700]);

        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertSame('paid', $payment->fresh()->status);
        $this->assertNotEmpty($payment->fresh()->receipt_number);
        $this->assertNotNull($payment->fresh()->subscription_period_start);
        $this->assertNotNull($payment->fresh()->subscription_period_end);
        $this->assertSame(1, Subscription::query()->where('user_id', $creator->id)->where('gateway_name', 'verify_et')->count());
        $this->assertSame($plan->id, Subscription::query()->where('user_id', $creator->id)->value('product_id'));
        $this->assertNotNull($price->fresh());
    }

    public function testVerifiedProPaymentReceiptCanBeDownloadedByItsCreator(): void
    {
        config()->set('services.verify_et.enabled', true);
        $creator = User::factory()->create();
        [$plan, $price] = $this->proPlan();
        $payment = ProSubscriptionPayment::query()->create(['uuid' => (string) Str::uuid(), 'creator_id' => $creator->id, 'product_id' => $plan->id, 'price_id' => $price->id, 'amount_cents' => 50000, 'status' => 'paid', 'paid_at' => now(), 'receipt_number' => 'LINKET-TEST-RECEIPT', 'subscription_period_start' => now()->startOfMonth(), 'subscription_period_end' => now()->addMonthNoOverflow()->startOfMonth()]);
        $verification = DirectPaymentVerification::query()->create(['reference' => 'RECEIPT'.Str::upper(Str::random(10)), 'payable_type' => ProSubscriptionPayment::class, 'payable_id' => $payment->id, 'bank_code' => 'cbe', 'settlement_account' => '1000123456789', 'amount_cents' => 50000, 'currency' => 'ETB', 'status' => 'success']);

        $response = $this->stateful()->actingAs($creator)->get('/api/v1/billing/direct/pro/'.$payment->uuid.'/receipt');

        $response->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
        $html = view('payments.pro-payment-receipt', ['payment' => $payment, 'verification' => $verification, 'creator' => $creator])->render();
        foreach (['LINKET-TEST-RECEIPT', 'ETB 500.00', $verification->reference, $payment->paid_at->timezone('Africa/Addis_Ababa')->format('Y-m-d H:i T'), $payment->subscription_period_start->timezone('Africa/Addis_Ababa')->toDateString(), $payment->subscription_period_end->timezone('Africa/Addis_Ababa')->toDateString(), 'not a tax invoice'] as $expected) {
            $this->assertStringContainsString($expected, $html);
        }
    }

    public function testPaidPaymentWithoutSuccessfulVerificationCannotDownloadReceipt(): void
    {
        [$plan, $price] = $this->proPlan();
        $creator = User::factory()->create();
        $payment = ProSubscriptionPayment::query()->create(['uuid' => (string) Str::uuid(), 'creator_id' => $creator->id, 'product_id' => $plan->id, 'price_id' => $price->id, 'amount_cents' => 50000, 'status' => 'paid', 'paid_at' => now(), 'receipt_number' => 'LINKET-UNVERIFIED', 'subscription_period_start' => now(), 'subscription_period_end' => now()->addMonth()]);
        DirectPaymentVerification::query()->create(['reference' => 'UNVERIFIED'.Str::upper(Str::random(10)), 'payable_type' => ProSubscriptionPayment::class, 'payable_id' => $payment->id, 'bank_code' => 'cbe', 'settlement_account' => '1000123456789', 'amount_cents' => 50000, 'currency' => 'ETB', 'status' => 'manual_review']);

        $this->stateful()->actingAs($creator)->get('/api/v1/billing/direct/pro/'.$payment->uuid.'/receipt')->assertNotFound();
        $this->getJson('/api/v1/billing/direct')->assertOk()->assertJsonPath('pro_subscription.payments.0.receipt_url', null);
    }

    public function testBillingHistoryMapsVerificationStatusesWithoutOfferingUnpaidReceipts(): void
    {
        [$plan, $price] = $this->proPlan();
        $creator = User::factory()->create();
        $payment = ProSubscriptionPayment::query()->create(['uuid' => (string) Str::uuid(), 'creator_id' => $creator->id, 'product_id' => $plan->id, 'price_id' => $price->id, 'amount_cents' => 50000, 'status' => 'pending_payment']);
        $this->stateful()->actingAs($creator)->getJson('/api/v1/billing/direct')->assertOk()->assertJsonPath('pro_subscription.payments.0.status', 'pending_payment');
        $verification = DirectPaymentVerification::query()->create(['reference' => 'STATUS'.Str::upper(Str::random(10)), 'payable_type' => ProSubscriptionPayment::class, 'payable_id' => $payment->id, 'bank_code' => 'cbe', 'settlement_account' => '1000123456789', 'amount_cents' => 50000, 'currency' => 'ETB', 'status' => 'pending']);

        foreach (['pending' => 'pending_verification', 'verifying' => 'pending_verification', 'manual_review' => 'manual_review', 'mismatch' => 'rejected', 'failed' => 'rejected'] as $status => $expected) {
            $verification->update(['status' => $status]);
            $this->getJson('/api/v1/billing/direct')->assertOk()->assertJsonPath('pro_subscription.payments.0.status', $expected)->assertJsonPath('pro_subscription.payments.0.receipt_url', null);
        }
    }

    public function testUnpaidProPaymentCannotDownloadPaidReceipt(): void
    {
        [$plan, $price] = $this->proPlan();
        $creator = User::factory()->create();
        $payment = ProSubscriptionPayment::query()->create(['uuid' => (string) Str::uuid(), 'creator_id' => $creator->id, 'product_id' => $plan->id, 'price_id' => $price->id, 'amount_cents' => 50000, 'status' => 'pending_payment']);

        $this->stateful()->actingAs($creator)->get('/api/v1/billing/direct/pro/'.$payment->uuid.'/receipt')->assertNotFound();
    }

    public function testCreatorCannotDownloadAnotherCreatorsProReceipt(): void
    {
        [$plan, $price] = $this->proPlan();
        $owner = User::factory()->create();
        $otherCreator = User::factory()->create();
        $payment = ProSubscriptionPayment::query()->create(['uuid' => (string) Str::uuid(), 'creator_id' => $owner->id, 'product_id' => $plan->id, 'price_id' => $price->id, 'amount_cents' => 50000, 'status' => 'paid', 'paid_at' => now(), 'receipt_number' => 'LINKET-OWNER-RECEIPT', 'subscription_period_start' => now(), 'subscription_period_end' => now()->addMonth()]);
        DirectPaymentVerification::query()->create(['reference' => 'OWNER'.Str::upper(Str::random(10)), 'payable_type' => ProSubscriptionPayment::class, 'payable_id' => $payment->id, 'bank_code' => 'cbe', 'settlement_account' => '1000123456789', 'amount_cents' => 50000, 'currency' => 'ETB', 'status' => 'success']);

        $this->stateful()->actingAs($otherCreator)->get('/api/v1/billing/direct/pro/'.$payment->uuid.'/receipt')->assertNotFound();
    }

    public function testNewProCheckoutCannotUseChapa(): void
    {
        config()->set('services.verify_et.enabled', false);
        $this->stateful()->actingAs(User::factory()->create());
        [$plan, $price] = $this->proPlan();

        $this->postJson('/api/v1/billing/chapa/checkout', [
            'product_id' => $plan->id,
            'price_id' => $price->id,
        ])->assertConflict();

        $this->assertDatabaseMissing('subscriptions', ['gateway_name' => 'chapa', 'product_id' => $plan->id]);
    }

    public function testExpiredDirectSubscriptionIsDowngradedByTheRenewalCommand(): void
    {
        $creator = User::factory()->create();
        [$plan, $price] = $this->proPlan();
        $subscription = Subscription::query()->create([
            'user_id' => $creator->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'gateway_name' => 'verify_et',
            'gateway_status' => 'active',
            'renews_at' => now()->subDays(8),
        ]);

        app(ProcessDirectSubscriptionRenewals::class)->handle();

        $this->assertSame('expired', $subscription->fresh()->gateway_status);
        $this->assertNotNull($subscription->fresh()->ends_at);
    }

    public function testVerifiedRenewalExtendsExistingDirectSubscriptionOnlyOnce(): void
    {
        config()->set('services.verify_et.enabled', true);
        $creator = User::factory()->create();
        [$plan, $price] = $this->proPlan();
        $renewalAt = now()->addDays(3)->startOfSecond();
        $subscription = Subscription::query()->create(['user_id' => $creator->id, 'product_id' => $plan->id, 'price_id' => $price->id, 'gateway_name' => 'verify_et', 'gateway_status' => 'active', 'renews_at' => $renewalAt]);
        $payment = ProSubscriptionPayment::query()->create(['uuid' => (string) Str::uuid(), 'creator_id' => $creator->id, 'product_id' => $plan->id, 'price_id' => $price->id, 'amount_cents' => 50000, 'status' => 'pending_payment']);
        $verification = DirectPaymentVerification::query()->create(['reference' => 'SYNTH'.Str::upper(Str::random(12)), 'payable_type' => ProSubscriptionPayment::class, 'payable_id' => $payment->id, 'bank_code' => 'cbe', 'settlement_account' => '1000123456789', 'amount_cents' => 50000, 'currency' => 'ETB']);
        $result = $this->matchedResult($verification, 500, '1000123456789');
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertTrue($subscription->fresh()->renews_at->equalTo($renewalAt->copy()->addMonthNoOverflow()));
        $this->assertSame(1, Subscription::query()->where('user_id', $creator->id)->count());
    }

    public function testDirectCancellationRetainsPaidTermAndCanResumeBeforeExpiry(): void
    {
        config()->set('services.verify_et.enabled', true);
        $creator = User::factory()->create();
        [$plan, $price] = $this->proPlan();
        $end = now()->addDays(8)->startOfSecond();
        $subscription = Subscription::query()->create(['user_id' => $creator->id, 'product_id' => $plan->id, 'price_id' => $price->id, 'gateway_name' => 'verify_et', 'gateway_status' => 'active', 'renews_at' => $end]);
        $subscription->cancel();
        $this->assertTrue($subscription->fresh()->ends_at->equalTo($end));
        $this->assertNull($subscription->fresh()->renews_at);
        $subscription->fresh()->resume();
        $this->assertNull($subscription->fresh()->ends_at);
        $this->assertTrue($subscription->fresh()->renews_at->equalTo($end));
    }

    public function testOverdueLegacyInvoicesStayPayableWithoutBlockingSales(): void
    {
        $creator = User::factory()->create();
        $workspace = Workspace::query()->create(['owner_id' => $creator->id, 'name' => 'Billing workspace', 'is_personal' => true]);
        $invoice = CommissionInvoice::query()->create([
            'uuid' => (string) Str::uuid(),
            'creator_id' => $creator->id,
            'workspace_id' => $workspace->id,
            'invoice_number' => 'CM-' . Str::upper(Str::random(12)),
            'period_start' => now()->subMonth()->startOfMonth()->toDateString(),
            'period_end' => now()->subMonth()->endOfMonth()->toDateString(),
            'commission_fee_cents' => 5000,
            'status' => 'overdue',
            'due_at' => now()->subHour(),
        ]);
        $verification = DirectPaymentVerification::query()->create([
            'reference' => 'INV' . Str::upper(Str::random(12)),
            'payable_type' => CommissionInvoice::class,
            'payable_id' => $invoice->id,
            'bank_code' => 'cbe',
            'settlement_account' => '1000123456789',
            'amount_cents' => 5000,
            'currency' => 'ETB',
            'status' => 'manual_review',
        ]);
        $status = app(AccountMonetizationStatus::class);

        $this->assertFalse($status->isRestricted($creator));
        $this->assertTrue($status->canSell($creator));
        $this->assertTrue($status->hasOutstandingLegacyInvoice($creator));

        $verification->forceFill(['created_at' => $invoice->due_at->copy()->subSecond()])->saveQuietly();

        $this->assertFalse($status->isRestricted($creator));
        $this->assertTrue($status->canSell($creator));
        $this->assertFalse($status->hasOutstandingLegacyInvoice($creator));
        $this->assertSame('overdue', $invoice->fresh()->status);
    }

    public function testFreeUserCanReceiveTheirPersonalWorkspaceButCannotCreateAnother(): void
    {
        settings()->save(['billing.enable' => true]);
        Product::query()->where('free', true)->update(['is_default' => false]);
        Product::query()->where('free', true)->firstOrFail()->update(['is_default' => true]);
        $creator = User::factory()->create();
        $legacyWorkspace = Workspace::query()->create(['owner_id' => $creator->id, 'name' => 'Historic team', 'is_personal' => false]);
        $legacyWorkspace->members()->create(['user_id' => $creator->id, 'is_owner' => true]);

        $action = new CreateWorkspace();
        $personalWorkspace = $action->createPersonalWorkspace($creator);

        $this->assertTrue($personalWorkspace->is_personal);
        $this->assertSame(2, Workspace::query()->where('owner_id', $creator->id)->count());
        $this->expectException(ValidationException::class);
        $action->execute(['name' => 'Another workspace', 'owner_id' => $creator->id]);
    }

    /** @return array{Product, Price} */
    private function proPlan(): array
    {
        $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
        $price = Price::query()->where('product_id', $plan->id)->where('currency', 'ETB')
            ->where('interval', 'month')->where('interval_count', 1)->firstOrFail();

        return [$plan, $price];
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }

    private function matchedResult(DirectPaymentVerification $verification, int $amount, string $account): array
    {
        return [
            'requestId' => 'req_' . Str::lower(Str::random(12)),
            'verification' => ['processingStatus' => 'completed', 'status' => 'success', 'verified' => true],
            'data' => [[
                'bank' => 'cbe',
                'status' => 'success',
                'verified' => true,
                'amount' => $amount,
                'currency' => 'ETB',
                'referenceNumber' => $verification->reference,
                'receiptNumber' => $verification->reference,
                'settlementAccountMatch' => [
                    'matched' => true,
                    'ambiguous' => false,
                    'matchConfidence' => 'high',
                    'candidateCount' => 1,
                    'matchedSettlementAccount' => $account,
                ],
            ]],
        ];
    }

    public function testDirectRenewalRemindersUseNotificationsAndAreDeduped(): void
    {
        \Illuminate\Support\Facades\Notification::fake();
        $creator = User::factory()->create();
        [$plan, $price] = $this->proPlan();
        $subscription = Subscription::query()->create([
            'user_id' => $creator->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'gateway_name' => 'verify_et',
            'gateway_status' => 'active',
            'renews_at' => now()->addDays(7)->startOfDay(),
        ]);

        app(ProcessDirectSubscriptionRenewals::class)->handle();
        app(ProcessDirectSubscriptionRenewals::class)->handle();

        \Illuminate\Support\Facades\Notification::assertSentToTimes(
            $creator,
            \App\Payments\Notifications\DirectRenewalReminder::class,
            1,
        );
        $this->assertSame(1, \App\Payments\Models\SubscriptionRenewalReminder::query()
            ->where('subscription_id', $subscription->id)
            ->where('days_before', 7)
            ->count());
    }

    public function testExpiredDirectSubscriptionClearsRenewalDateAndKeepsConsumedFreeVerifications(): void
    {
        $creator = User::factory()->create();
        [$plan, $price] = $this->proPlan();
        $subscription = Subscription::query()->create([
            'user_id' => $creator->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'gateway_name' => 'verify_et',
            'gateway_status' => 'active',
            'renews_at' => now()->subDays(8),
        ]);
        $workspace = Workspace::query()->create(['owner_id' => $creator->id, 'name' => 'Expire workspace', 'is_personal' => true]);
        $product = \App\Storefront\Models\DigitalProduct::query()->create([
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
            'title' => 'Allowance product',
            'status' => 'approved',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'type' => 'digital',
        ]);
        $order = \App\Storefront\Models\StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'currency' => 'ETB',
            'gross_amount_cents' => 1000,
            'commission_bps' => 0,
            'platform_fee_percent' => 0,
            'platform_fee_cents' => 0,
            'creator_earnings_cents' => 1000,
            'status' => 'paid',
            'payment_gateway' => 'verify_et',
            'monetization_policy' => 'verified_sales_free_v1',
        ]);
        \Illuminate\Support\Facades\DB::table('creator_verification_allowances')->insert([
            'creator_id' => $creator->id,
            'storefront_order_id' => $order->id,
            'status' => 'consumed',
            'consumed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        app(ProcessDirectSubscriptionRenewals::class)->handle();

        $this->assertSame('expired', $subscription->fresh()->gateway_status);
        $this->assertNotNull($subscription->fresh()->ends_at);
        $this->assertNull($subscription->fresh()->renews_at);
        $this->assertFalse(app(\App\Storefront\Services\CreatorVerificationAllowance::class)->isPro($creator));
        $this->assertSame(1, app(\App\Storefront\Services\CreatorVerificationAllowance::class)->usage($creator)['consumed']);
    }
}
