<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\ChapaGateway;
use App\Payments\Commands\ProcessDirectSubscriptionRenewals;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\VerifyEt\VerifyEtGateway;
use App\Storefront\Commands\GenerateCommissionInvoices;
use App\Storefront\Models\CommissionAccrual;
use App\Storefront\Models\CommissionInvoice;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\AccountMonetizationStatus;
use App\Storefront\Services\CreatorVerificationAllowance;
use App\Storefront\Services\DirectStorefrontCheckout;
use App\Storefront\StorefrontCheckout;
use Carbon\CarbonImmutable;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class LegacyCommissionIsolationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.verify_et.enabled', true);
        config()->set('services.verify_et.corporate_account', '1000123456789');
        settings()->save(['billing.enable' => true]);
        $plan = Product::query()->where('system_key', 'free')->first()
            ?? Product::query()->where('free', true)->orderByDesc('is_default')->first();
        if (!$plan) {
            $plan = Product::query()->create([
                'uuid' => (string) Str::uuid(),
                'name' => 'Free',
                'free' => true,
                'is_default' => true,
                'system_key' => 'free',
            ]);
        }
        $plan->update([
            'storefront_benefits' => [
                ...($plan->storefront_benefits ?? []),
                'free_verified_sales' => 10,
            ],
        ]);
    }

    public function testFreeVerifiedSaleConsumesOneAllowanceAndCreatesNoCommission(): void
    {
        Queue::fake();
        [$order, $verification] = $this->orderAndVerification();
        StorefrontOrder::query()->whereKey($order->id)->update(['commission_bps' => 150, 'platform_fee_cents' => 150]);

        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $this->matchedResult($verification)));
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification->fresh(), $this->matchedResult($verification)));

        $order->refresh();
        $this->assertSame(CreatorVerificationAllowance::FREE_POLICY, $order->monetization_policy);
        $this->assertSame('paid', $order->status);
        $this->assertSame(0, $order->commission_bps);
        $this->assertSame(0, $order->platform_fee_cents);
        $this->assertSame(0, CommissionAccrual::query()->where('storefront_order_id', $order->id)->count());
        $this->assertSame(0, CommissionInvoice::query()->where('creator_id', $order->creator_id)->count());
        $this->assertSame(['consumed' => 1, 'reserved' => 0, 'remaining' => 9], app(CreatorVerificationAllowance::class)->usage($order->creator));
    }

    public function testProVerifiedSaleCreatesNoCommissionAndDoesNotConsumeTheFreeAllowance(): void
    {
        Queue::fake();
        [$order] = $this->orderAndVerification();
        $this->activatePro($order->creator);
        $proOrder = app(DirectStorefrontCheckout::class)->create($order->product, null, ['email' => 'buyer@example.test']);
        $verification = $this->verificationFor($proOrder);

        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $this->matchedResult($verification)));

        $proOrder->refresh();
        $this->assertSame(CreatorVerificationAllowance::PRO_POLICY, $proOrder->monetization_policy);
        $this->assertSame(0, $proOrder->commission_bps);
        $this->assertSame(0, $proOrder->platform_fee_cents);
        $this->assertSame(0, CommissionAccrual::query()->where('creator_id', $order->creator_id)->count());
        $this->assertSame(['consumed' => 0, 'reserved' => 1, 'remaining' => 9], app(CreatorVerificationAllowance::class)->usage($order->creator));
    }

    public function testExhaustedFreeAllowanceRequiresProInsteadOfACommissionBlock(): void
    {
        $plan = Product::query()->where('system_key', 'free')->first()
            ?? Product::query()->where('free', true)->orderByDesc('is_default')->firstOrFail();
        $plan->update([
            'storefront_benefits' => [
                ...($plan->storefront_benefits ?? []),
                'free_verified_sales' => 1,
            ],
        ]);
        [$order] = $this->orderAndVerification();
        $status = app(AccountMonetizationStatus::class);
        $before = StorefrontOrder::query()->where('creator_id', $order->creator_id)->count();

        try {
            app(DirectStorefrontCheckout::class)->create($order->product, null, ['email' => 'buyer@example.test']);
            $this->fail('An exhausted free allowance accepted another sale.');
        } catch (ValidationException $exception) {
            $this->assertSame(
                'All free verified-sale allowances are used or reserved. Upgrade to Pro to continue.',
                $exception->errors()['payment'][0],
            );
        }

        $this->assertSame($before, StorefrontOrder::query()->where('creator_id', $order->creator_id)->count());
        $this->assertTrue($status->canSell($order->creator));
        $this->assertFalse($status->isRestricted($order->creator));
    }

    public function testExpiredProReturnsToTheFreeAllowanceWithoutACommissionRestriction(): void
    {
        Queue::fake();
        $plan = Product::query()->where('system_key', 'free')->first()
            ?? Product::query()->where('free', true)->orderByDesc('is_default')->firstOrFail();
        $plan->update([
            'storefront_benefits' => [
                ...($plan->storefront_benefits ?? []),
                'free_verified_sales' => 1,
            ],
        ]);
        [$order, $verification] = $this->orderAndVerification();
        app(VerifyEtGateway::class)->processResult($verification, $this->matchedResult($verification));
        $subscription = $this->activatePro($order->creator);
        $proOrder = app(DirectStorefrontCheckout::class)->create($order->product, null, ['email' => 'buyer@example.test']);
        $this->assertSame(CreatorVerificationAllowance::PRO_POLICY, $proOrder->monetization_policy);

        $invoice = $this->historicalInvoice($order->creator, $order->product->workspace_id);
        $subscription->update(['renews_at' => now()->subDays(8)]);
        app(ProcessDirectSubscriptionRenewals::class)->handle();

        $allowance = app(CreatorVerificationAllowance::class);
        $status = app(AccountMonetizationStatus::class);
        $this->assertFalse($allowance->isPro($order->creator));
        $this->assertTrue($status->canSell($order->creator));
        $this->assertFalse($status->isRestricted($order->creator));
        $this->assertTrue($status->hasOutstandingLegacyInvoice($order->creator));
        $this->assertSame('overdue', $invoice->fresh()->status);

        try {
            app(DirectStorefrontCheckout::class)->create($order->product, null, ['email' => 'buyer@example.test']);
            $this->fail('Expired Pro kept unlimited sales.');
        } catch (ValidationException $exception) {
            $this->assertSame(
                'All free verified-sale allowances are used or reserved. Upgrade to Pro to continue.',
                $exception->errors()['payment'][0],
            );
        }
    }

    public function testHistoricalInvoiceAndLegacyRecordsStayReadableAndUnchanged(): void
    {
        // The accrual fixtures are dated October 15; the estimate covers only the current month.
        $this->travelTo(CarbonImmutable::parse('2026-10-20 12:00:00', 'Africa/Nairobi'));
        [$order] = $this->orderAndVerification();
        $invoice = $this->historicalInvoice($order->creator, $order->product->workspace_id, [
            'status' => 'paid',
            'commission_fee_cents' => 4200,
            'sales_count' => 2,
            'paid_at' => now()->subMonth(),
            'due_at' => now()->subMonth(),
        ]);
        $before = $invoice->only(['invoice_number', 'commission_fee_cents', 'sales_count', 'status', 'paid_at']);
        $this->accrual($order, null, 2500);
        $this->accrual($order, CreatorVerificationAllowance::FREE_POLICY, 8000);

        $this->stateful()->actingAs($order->creator)->getJson('/api/v1/billing/direct')
            ->assertOk()
            ->assertJsonPath('invoices.data.0.invoice_number', $invoice->invoice_number)
            ->assertJsonPath('invoices.data.0.commission_fee_cents', 4200)
            ->assertJsonPath('invoices.data.0.status', 'paid')
            ->assertJsonPath('estimated_commission.fee_cents', 2500);

        app(GenerateCommissionInvoices::class)->handle();

        $invoice->refresh();
        $this->assertSame($before['invoice_number'], $invoice->invoice_number);
        $this->assertSame($before['commission_fee_cents'], $invoice->commission_fee_cents);
        $this->assertSame($before['sales_count'], $invoice->sales_count);
        $this->assertSame($before['status'], $invoice->status);
        $this->assertTrue($invoice->paid_at->equalTo($before['paid_at']));

        // Once November starts, the October legacy accrual must no longer count as this month's estimate.
        $this->travelTo(CarbonImmutable::parse('2026-11-01 00:01:00', 'Africa/Nairobi'));
        $this->stateful()->actingAs($order->creator)->getJson('/api/v1/billing/direct')
            ->assertOk()
            ->assertJsonPath('estimated_commission.fee_cents', 0);
        $this->travelBack();
    }

    public function testCommissionInvoiceJobIgnoresNewPolicyOrders(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-01 00:01:00', 'Africa/Nairobi'));
        [$order] = $this->orderAndVerification();
        $historical = $this->historicalInvoice($order->creator, $order->product->workspace_id, [
            'status' => 'paid',
            'commission_fee_cents' => 4200,
            'sales_count' => 2,
            'paid_at' => CarbonImmutable::parse('2026-09-01 12:00:00', 'Africa/Nairobi'),
        ]);
        $legacy = $this->accrual($order, null, 6000);
        $current = $this->accrual($order, CreatorVerificationAllowance::FREE_POLICY, 8000);

        app(GenerateCommissionInvoices::class)->handle();

        $created = CommissionInvoice::query()->where('creator_id', $order->creator_id)->whereKeyNot($historical->id)->first();
        $this->assertNotNull($created);
        $this->assertSame(6000, $created->commission_fee_cents);
        $this->assertSame(1, $created->sales_count);
        $this->assertSame($created->id, $legacy->fresh()->commission_invoice_id);
        $this->assertNull($current->fresh()->commission_invoice_id);
        $this->assertSame(4200, $historical->fresh()->commission_fee_cents);
        $this->assertSame('paid', $historical->fresh()->status);
        $this->travelBack();
    }

    public function testProRenewalDoesNotCreateCommissionCharges(): void
    {
        Notification::fake();
        Queue::fake();
        [$order] = $this->orderAndVerification();
        $subscription = $this->activatePro($order->creator);
        $subscription->update(['renews_at' => now()->addDays(6)]);
        $invoices = CommissionInvoice::query()->where('creator_id', $order->creator_id)->count();

        app(ProcessDirectSubscriptionRenewals::class)->handle();
        $this->stateful()->actingAs($order->creator)->postJson('/api/v1/billing/direct/pro')->assertOk();

        $this->assertSame(0, CommissionAccrual::query()->where('creator_id', $order->creator_id)->count());
        $this->assertSame($invoices, CommissionInvoice::query()->where('creator_id', $order->creator_id)->count());
    }

    public function testDuplicateInvoiceCallbackDoesNotCreateAnotherCharge(): void
    {
        [$order] = $this->orderAndVerification();
        $invoice = $this->historicalInvoice($order->creator, $order->product->workspace_id);
        $verification = DirectPaymentVerification::query()->create([
            'reference' => 'INV'.Str::upper(Str::random(12)),
            'payable_type' => CommissionInvoice::class,
            'payable_id' => $invoice->id,
            'bank_code' => 'cbe',
            'settlement_account' => '1000123456789',
            'amount_cents' => 5000,
            'currency' => 'ETB',
        ]);
        $result = $this->matchedResult($verification);
        $result['data'][0]['amount'] = 50;

        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $result));
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification->fresh(), $result));

        $this->assertSame(1, CommissionInvoice::query()->where('creator_id', $order->creator_id)->count());
        $this->assertSame(5000, $invoice->fresh()->commission_fee_cents);
        $this->assertSame('paid', $invoice->fresh()->status);
        $this->assertSame(0, CommissionAccrual::query()->where('creator_id', $order->creator_id)->count());
    }

    public function testDisabledVerifyEtCheckoutDoesNotStartChapaOrMarkTheOrderPaid(): void
    {
        config()->set('services.verify_et.enabled', false);
        [$order] = $this->orderAndVerification();
        $before = StorefrontOrder::query()->where('digital_product_id', $order->digital_product_id)->count();
        $gateway = $this->getMockBuilder(ChapaGateway::class)->disableOriginalConstructor()->getMock();
        $gateway->expects($this->never())->method('createTransaction');
        app()->instance(ChapaGateway::class, $gateway);

        try {
            app(StorefrontCheckout::class)->create($order->product, null, [
                'name' => 'Buyer',
                'email' => 'buyer@example.test',
            ]);
            $this->fail('Paid checkout started while Verify.et was unavailable.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $exception) {
            $this->assertSame(503, $exception->getStatusCode());
        }

        $this->assertSame($before, StorefrontOrder::query()->where('digital_product_id', $order->digital_product_id)->count());
        $this->assertSame('pending_payment', $order->fresh()->status);
    }

    private function activatePro(User $creator): Subscription
    {
        $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
        $price = Price::query()->where('product_id', $plan->id)->where('currency', 'ETB')->where('interval', 'month')->firstOrFail();

        return Subscription::query()->create([
            'user_id' => $creator->id,
            'product_id' => $plan->id,
            'price_id' => $price->id,
            'gateway_name' => 'verify_et',
            'gateway_status' => 'active',
            'renews_at' => now()->addMonth(),
        ]);
    }

    /** @param array<string, mixed> $overrides */
    private function historicalInvoice(User $creator, int $workspaceId, array $overrides = []): CommissionInvoice
    {
        return CommissionInvoice::query()->create([
            'uuid' => (string) Str::uuid(),
            'creator_id' => $creator->id,
            'workspace_id' => $workspaceId,
            'invoice_number' => 'CM-HIST-'.Str::upper(Str::random(8)),
            'period_start' => now()->subMonths(2)->startOfMonth()->toDateString(),
            'period_end' => now()->subMonths(2)->endOfMonth()->toDateString(),
            'sales_count' => 1,
            'gross_sales_cents' => 100000,
            'commission_fee_cents' => 5000,
            'status' => 'overdue',
            'due_at' => now()->subDay(),
            ...$overrides,
        ]);
    }

    private function accrual(StorefrontOrder $seed, ?string $policy, int $feeCents): CommissionAccrual
    {
        $paidAt = CarbonImmutable::parse('2026-10-15 12:00:00', 'Africa/Nairobi');
        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $seed->digital_product_id,
            'creator_id' => $seed->creator_id,
            'currency' => 'ETB',
            'gross_amount_cents' => 100000,
            'monetization_policy' => $policy,
            'commission_bps' => $policy === null ? 150 : 0,
            'platform_fee_cents' => $feeCents,
            'creator_earnings_cents' => 100000,
            'status' => 'paid',
            'paid_at' => $paidAt,
            'payment_gateway' => 'verify_et',
        ]);

        return CommissionAccrual::query()->create([
            'storefront_order_id' => $order->id,
            'creator_id' => $seed->creator_id,
            'workspace_id' => $seed->product->workspace_id,
            'gross_amount_cents' => 100000,
            'fee_bps' => $policy === null ? 150 : 0,
            'fee_cents' => $feeCents,
            'paid_at' => $paidAt,
        ]);
    }

    /** @return array{0: StorefrontOrder, 1: DirectPaymentVerification} */
    private function orderAndVerification(): array
    {
        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Digital guide',
            'price_cents' => 10000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);
        $file = FileEntry::query()->create([
            'name' => 'guide.pdf',
            'file_name' => Str::random(20),
            'file_size' => 1024,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);
        CreatorPaymentMethod::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'provider' => 'cbe',
            'account_number' => '1000123456789',
            'account_fingerprint' => hash('sha256', 'test-account-'.$creator->id),
            'account_name_raw' => 'Abebe Kebede Wolde',
            'account_name_normalized' => 'abebe kebede wolde',
            'status' => 'approved',
            'provider_registration_status' => 'registered',
            'is_active' => true,
        ]);
        $order = app(DirectStorefrontCheckout::class)->create($product->load('creator'), null, [
            'name' => 'Buyer',
            'email' => 'buyer@example.test',
        ]);

        return [$order, $this->verificationFor($order)];
    }

    private function verificationFor(StorefrontOrder $order): DirectPaymentVerification
    {
        return DirectPaymentVerification::query()->create([
            'reference' => 'FT26'.Str::upper(Str::random(14)),
            'payable_type' => $order::class,
            'payable_id' => $order->id,
            'bank_code' => 'cbe',
            'settlement_account' => '1000123456789',
            'amount_cents' => $order->gross_amount_cents,
            'currency' => 'ETB',
        ]);
    }

    /** @return array<string, mixed> */
    private function matchedResult(DirectPaymentVerification $verification): array
    {
        return [
            'requestId' => 'req_'.Str::lower(Str::random(12)),
            'verification' => ['processingStatus' => 'completed', 'status' => 'success', 'verified' => true],
            'data' => [[
                'bank' => 'cbe',
                'status' => 'success',
                'verified' => true,
                'amount' => 100,
                'currency' => 'ETB',
                'referenceNumber' => $verification->reference,
                'receiptNumber' => $verification->reference,
                'settlementAccountMatch' => [
                    'matched' => true,
                    'ambiguous' => false,
                    'matchConfidence' => 'high',
                    'candidateCount' => 1,
                    'matchedSettlementAccount' => '1000123456789',
                ],
            ]],
        ];
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
