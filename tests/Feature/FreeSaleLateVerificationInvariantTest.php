<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\VerifyEt\VerifyEtGateway;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\CreatorVerificationAllowance;
use App\Storefront\Services\DirectStorefrontCheckout;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

class FreeSaleLateVerificationInvariantTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->assertStringContainsString('test', strtolower((string) DB::connection()->getDatabaseName()));
        Queue::fake();
        config()->set('services.verify_et.enabled', true);
        settings()->save(['billing.enable' => true]);
        $this->freeLimit(1);
    }

    public function testVerifiedLatePaymentIsHeldWithoutSpendingAnotherOrdersReservedAllowance(): void
    {
        \Illuminate\Support\Facades\Notification::fake();
        config()->set('services.telegram.enabled', true);
        config()->set('services.telegram.token', 'synthetic-bot-token');
        [$creator, $product] = $this->creatorAndProduct();
        $creator->telegramConnection()->create([
            'telegram_user_id' => 1234567890111,
            'telegram_chat_id' => 1234567890111,
            'connected_at' => now(),
        ]);
        $oldOrder = $this->checkout($product);
        $this->expireAndRelease($oldOrder);
        $replacement = $this->checkout($product);
        $verification = $this->verificationFor($oldOrder);
        $evidence = $this->validProviderEvidence($verification);

        $this->assertSame('manual_review', app(VerifyEtGateway::class)->processResult($verification, $evidence));
        $this->assertSame('manual_review', $verification->fresh()->status);
        $this->assertSame('free_allowance_exhausted', $verification->fresh()->latest_error_code);
        $this->assertNotNull($verification->fresh()->verified_at);
        $this->assertSame(strtoupper($verification->reference), $verification->fresh()->canonical_transaction_identity);
        $this->assertSame('manual_review', $oldOrder->fresh()->status);
        $this->assertNull($oldOrder->fresh()->paid_at);
        $this->assertSame(0, $oldOrder->entitlements()->count());
        $this->assertSame('pending_payment', $replacement->fresh()->status);
        $this->assertSame('reserved', $this->rowStatus($replacement));

        $this->assertSame(['consumed' => 0, 'reserved' => 1, 'remaining' => 0],
            app(CreatorVerificationAllowance::class)->usage($creator, 1));

        // A duplicate provider callback cannot claim another slot or mint a download.
        $this->assertSame('manual_review', app(VerifyEtGateway::class)->processResult($verification, $evidence));
        $this->assertSame(0, $oldOrder->entitlements()->count());
        $this->assertSame('reserved', $this->rowStatus($replacement));
        \Illuminate\Support\Facades\Notification::assertSentToTimes(
            $creator, \App\Storefront\Notifications\PaymentReviewNeededNotification::class, 1,
        );
    }

    public function testAReleasedOrderReclaimsCapacityWhenItIsStillAvailable(): void
    {
        \Illuminate\Support\Facades\Notification::fake();
        config()->set('services.telegram.enabled', true);
        config()->set('services.telegram.token', 'synthetic-bot-token');
        [$creator, $product] = $this->creatorAndProduct();
        $creator->telegramConnection()->create([
            'telegram_user_id' => 1234567890222,
            'telegram_chat_id' => 1234567890222,
            'connected_at' => now(),
        ]);
        $oldOrder = $this->checkout($product);
        $this->expireAndRelease($oldOrder);
        $verification = $this->verificationFor($oldOrder);
        $evidence = $this->validProviderEvidence($verification);

        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $evidence));
        $this->assertSame('paid', $oldOrder->fresh()->status);
        $this->assertSame('consumed', $this->rowStatus($oldOrder));
        $this->assertSame(1, $oldOrder->entitlements()->count());
        $this->assertSame(['consumed' => 1, 'reserved' => 0, 'remaining' => 0],
            app(CreatorVerificationAllowance::class)->usage($creator, 1));
        $this->assertSame('success', app(VerifyEtGateway::class)->processResult($verification, $evidence));
        $this->assertSame(1, $oldOrder->entitlements()->count());
        \Illuminate\Support\Facades\Notification::assertSentToTimes(
            $creator, \App\Storefront\Notifications\FreeQuotaMilestoneNotification::class, 1,
        );
    }

    public function testHeldVerifiedPaymentCanSettleAfterTheReservedSlotBecomesAvailable(): void
    {
        [$creator, $product] = $this->creatorAndProduct();
        $oldOrder = $this->checkout($product);
        $this->expireAndRelease($oldOrder);
        $replacement = $this->checkout($product);
        $verification = $this->verificationFor($oldOrder);
        $evidence = $this->validProviderEvidence($verification);
        $gateway = app(VerifyEtGateway::class);

        $this->assertSame('manual_review', $gateway->processResult($verification, $evidence));

        $this->expireAndRelease($replacement);
        $this->assertSame('success', $gateway->processResult($verification, $evidence));
        $this->assertSame('paid', $oldOrder->fresh()->status);
        $this->assertSame('consumed', $this->rowStatus($oldOrder));
        $this->assertSame('released', $this->rowStatus($replacement));
        $this->assertSame(1, $oldOrder->entitlements()->count());
        $this->assertSame(['consumed' => 1, 'reserved' => 0, 'remaining' => 0],
            app(CreatorVerificationAllowance::class)->usage($creator, 1));
    }

    public function testVerifiedProUpgradeSettlesHeldPaymentWithoutConsumingAFreeAllowance(): void
    {
        [$creator, $product] = $this->creatorAndProduct();
        $oldOrder = $this->checkout($product);
        $this->expireAndRelease($oldOrder);
        $replacement = $this->checkout($product);
        $verification = $this->verificationFor($oldOrder);
        $evidence = $this->validProviderEvidence($verification);
        $gateway = app(VerifyEtGateway::class);

        $this->assertSame('manual_review', $gateway->processResult($verification, $evidence));
        $plan = Product::query()->where('system_key', 'pro')->where('active', true)->firstOrFail();
        $price = Price::query()->where('product_id', $plan->id)->firstOrFail();
        Subscription::query()->create([
            'user_id' => $creator->id, 'product_id' => $plan->id, 'price_id' => $price->id,
            'gateway_name' => 'verify_et', 'gateway_status' => 'active', 'renews_at' => now()->addMonth(),
        ]);

        $this->assertSame('success', $gateway->processResult($verification, $evidence));
        $this->assertSame('paid', $oldOrder->fresh()->status);
        $this->assertSame(CreatorVerificationAllowance::PRO_POLICY, $oldOrder->fresh()->monetization_policy);
        $this->assertSame('released', $this->rowStatus($oldOrder));
        $this->assertSame('reserved', $this->rowStatus($replacement));
        $this->assertSame(1, $oldOrder->entitlements()->count());
        $this->assertSame(['consumed' => 0, 'reserved' => 1, 'remaining' => 0],
            app(CreatorVerificationAllowance::class)->usage($creator, 1));
    }

    public function testTenOccupiedSlotsCannotBeOverrunByAnEarlierReleasedOrder(): void
    {
        $this->freeLimit(10);
        [$creator, $product] = $this->creatorAndProduct();
        $oldOrder = $this->checkout($product);
        $this->expireAndRelease($oldOrder);
        $replacementOrders = [];
        for ($i = 0; $i < 10; $i++) {
            $replacementOrders[] = $this->checkout($product);
        }
        $verification = $this->verificationFor($oldOrder);

        $this->assertSame('manual_review', app(VerifyEtGateway::class)->processResult(
            $verification, $this->validProviderEvidence($verification)));
        $this->assertSame(10, app(CreatorVerificationAllowance::class)->usage($creator, 10)['reserved']);
        $this->assertSame(0, app(CreatorVerificationAllowance::class)->usage($creator, 10)['remaining']);
        $this->assertSame('released', $this->rowStatus($oldOrder));
        $this->assertSame(0, $oldOrder->entitlements()->count());
        foreach ($replacementOrders as $replacement) {
            $this->assertSame('reserved', $this->rowStatus($replacement));
        }
    }

    private function freeLimit(int $limit): void
    {
        $plan = Product::query()->where('system_key', 'free')->first()
            ?? Product::query()->where('free', true)->orderByDesc('is_default')->firstOrFail();
        $plan->update(['storefront_benefits' => [
            ...($plan->storefront_benefits ?? []),
            'free_verified_sales' => $limit,
        ]]);
    }

    private function creatorAndProduct(): array
    {
        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'SEC-001 synthetic digital guide',
            'price_cents' => 10000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);
        $file = FileEntry::query()->create([
            'name' => 'synthetic-guide.pdf',
            'file_name' => Str::random(24),
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
            'account_fingerprint' => hash('sha256', 'sec001-' . $creator->id),
            'account_name_raw' => 'Synthetic Account Holder',
            'account_name_normalized' => 'synthetic account holder',
            'status' => 'approved',
            'provider_registration_status' => 'registered',
            'is_active' => true,
        ]);

        return [$creator, $product];
    }

    private function checkout(DigitalProduct $product): StorefrontOrder
    {
        return app(DirectStorefrontCheckout::class)->create($product->load('creator'), null, [
            'name' => 'Synthetic buyer', 'email' => 'sec001-buyer@example.test',
        ]);
    }

    private function expireAndRelease(StorefrontOrder $order): void
    {
        StorefrontOrder::query()->whereKey($order->id)->update(['status' => 'expired', 'payment_expires_at' => now()->subMinute()]);
        app(CreatorVerificationAllowance::class)->release($order, 'abandoned_without_submitted_reference');
        $this->assertSame('released', $this->rowStatus($order));
    }

    private function rowStatus(StorefrontOrder $order): string
    {
        return (string) DB::table('creator_verification_allowances')
            ->where('storefront_order_id', $order->id)->value('status');
    }

    private function verificationFor(StorefrontOrder $order): DirectPaymentVerification
    {
        return DirectPaymentVerification::query()->create([
            'reference' => 'FT26' . Str::upper(Str::random(14)),
            'payable_type' => StorefrontOrder::class,
            'payable_id' => $order->id,
            'bank_code' => 'cbe',
            'settlement_account' => '1000123456789',
            'amount_cents' => $order->gross_amount_cents,
            'currency' => 'ETB',
            'provider_request_id' => 'req_' . Str::lower(Str::random(15)),
        ]);
    }

    private function validProviderEvidence(DirectPaymentVerification $verification): array
    {
        return [
            'requestId' => $verification->provider_request_id,
            'verification' => ['processingStatus' => 'completed', 'status' => 'success', 'verified' => true],
            'data' => [[
                'bank' => 'cbe',
                'status' => 'success',
                'verified' => true,
                'amount' => '100.00',
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
}
