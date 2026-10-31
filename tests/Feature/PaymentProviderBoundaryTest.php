<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\ChapaGateway;
use App\Payments\ChapaPaymentFulfillment;
use App\Payments\Models\PaymentTransaction;
use App\Payments\PaymentVerificationException;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductPaymentRefund;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Resources\PublicDigitalProductResource;
use App\Storefront\Services\CreatorVerificationAllowance;
use App\Storefront\StorefrontCheckout;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class PaymentProviderBoundaryTest extends TestCase
{
    use DatabaseTransactions;

    public function testPaidCheckoutStaysUnavailableWhenVerifyEtIsDisabled(): void
    {
        config()->set('services.verify_et.enabled', false);
        [$creator, $product] = $this->product();
        $gateway = $this->getMockBuilder(ChapaGateway::class)->disableOriginalConstructor()->getMock();
        $gateway->expects($this->never())->method('createTransaction');
        app()->instance(ChapaGateway::class, $gateway);

        try {
            app(StorefrontCheckout::class)->create($product->fresh()->load('creator'), null, [
                'name' => 'Buyer',
                'email' => 'buyer@example.test',
            ]);
            $this->fail('Paid checkout started while Verify.et was unavailable.');
        } catch (HttpException $exception) {
            $this->assertSame(503, $exception->getStatusCode());
        }

        $this->assertSame(0, StorefrontOrder::query()->where('digital_product_id', $product->id)->count());
        $payload = (new PublicDigitalProductResource($product->fresh()->load('creator')))->resolve(request());
        $this->assertFalse($payload['can_buy']);
        $this->assertSame('unavailable', $payload['payment_mode']);
        $this->assertSame($creator->id, $product->user_id);
    }

    public function testNewPolicyOrderCannotBeMarkedPaidByChapa(): void
    {
        [$creator, $product] = $this->product();
        $order = $this->order($product, $creator, [
            'monetization_policy' => CreatorVerificationAllowance::FREE_POLICY,
            'payment_gateway' => 'chapa',
            'commission_bps' => 0,
            'platform_fee_cents' => 0,
            'creator_earnings_cents' => 5000,
        ]);
        $transaction = $this->transaction($order);
        $gateway = $this->getMockBuilder(ChapaGateway::class)->disableOriginalConstructor()->getMock();
        $gateway->expects($this->never())->method('verify');
        app()->instance(ChapaGateway::class, $gateway);

        app(ChapaPaymentFulfillment::class)->syncPendingStorefrontOrder($order);

        try {
            app(ChapaPaymentFulfillment::class)->fulfill($transaction, $this->successPayload($transaction->tx_ref));
            $this->fail('Chapa fulfillment accepted a new-policy order.');
        } catch (PaymentVerificationException $exception) {
            $this->assertSame('new_policy_requires_verify_et', $exception->reason);
            $this->assertFalse($exception->shouldMarkFailed);
        }

        $this->assertSame('pending', $order->fresh()->status);
        $this->assertNull($order->fresh()->paid_at);
        $this->assertSame('pending', $transaction->fresh()->status);
        $this->assertSame(0, DownloadEntitlement::query()->where('storefront_order_id', $order->id)->count());
    }

    public function testLegacyChapaPaymentAndRefundStayIntact(): void
    {
        [$creator, $product] = $this->product();
        $order = $this->order($product, $creator, [
            'payment_gateway' => 'chapa',
            'commission_bps' => 1000,
            'platform_fee_cents' => 500,
            'creator_earnings_cents' => 4500,
        ]);
        $transaction = $this->transaction($order);
        $this->mockSuccessfulChapa($transaction->tx_ref);

        app(ChapaPaymentFulfillment::class)->syncPendingStorefrontOrder($order);
        $paidAt = $order->fresh()->paid_at;
        $this->assertSame('paid', $order->fresh()->status);
        $this->assertSame('paid', $transaction->fresh()->status);
        $this->assertSame(1, DownloadEntitlement::query()->where('storefront_order_id', $order->id)->count());

        $refund = DigitalProductPaymentRefund::query()->create([
            'payment_transaction_id' => $transaction->id,
            'storefront_order_id' => $order->id,
            'recorded_by' => $creator->id,
            'amount_cents' => 5000,
            'creator_earnings_reversal_cents' => 4500,
            'platform_fee_reversal_cents' => 500,
            'currency' => 'ETB',
            'external_reference' => 'legacy-refund-'.$order->id,
            'reason' => 'Historical refund',
            'refunded_at' => now(),
        ]);

        app(ChapaPaymentFulfillment::class)->syncPendingStorefrontOrder($order->fresh());
        app(ChapaPaymentFulfillment::class)->fulfill($transaction->fresh(), $this->successPayload($transaction->tx_ref));

        $this->assertTrue($order->fresh()->paid_at->equalTo($paidAt));
        $this->assertSame(1, DownloadEntitlement::query()->where('storefront_order_id', $order->id)->count());
        $this->assertSame(5000, $refund->fresh()->amount_cents);
        $this->assertSame('Historical refund', $refund->fresh()->reason);
        $this->assertSame('paid', $transaction->fresh()->status);
    }

    public function testVerifyEtOrderIsNotSettledByChapa(): void
    {
        [$creator, $product] = $this->product();
        $order = $this->order($product, $creator, [
            'payment_gateway' => 'verify_et',
            'monetization_policy' => null,
        ]);
        $transaction = $this->transaction($order);

        try {
            app(ChapaPaymentFulfillment::class)->fulfill($transaction, $this->successPayload($transaction->tx_ref));
            $this->fail('Chapa fulfillment settled a Verify.et order.');
        } catch (PaymentVerificationException $exception) {
            $this->assertFalse($exception->shouldMarkFailed);
        }

        $this->assertSame('pending', $order->fresh()->status);
        $this->assertSame('pending', $transaction->fresh()->status);
    }

    /** @return array{0: User, 1: DigitalProduct} */
    private function product(): array
    {
        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Boundary guide',
            'price_cents' => 5000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);
        $file = FileEntry::query()->create([
            'name' => 'guide.pdf',
            'file_name' => Str::random(12).'.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);

        return [$creator, $product];
    }

    /** @param array<string, mixed> $overrides */
    private function order(DigitalProduct $product, User $creator, array $overrides): StorefrontOrder
    {
        $txRef = 'boundary_'.Str::lower(Str::random(8));

        return StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_email' => 'buyer@example.test',
            'currency' => 'ETB',
            'gross_amount_cents' => 5000,
            'commission_bps' => 0,
            'platform_fee_cents' => 0,
            'creator_earnings_cents' => 5000,
            'status' => 'pending',
            'payment_gateway' => 'chapa',
            'chapa_tx_ref' => $txRef,
            ...$overrides,
        ]);
    }

    private function transaction(StorefrontOrder $order): PaymentTransaction
    {
        return PaymentTransaction::query()->create([
            'uuid' => (string) Str::uuid(),
            'gateway' => 'chapa',
            'payable_type' => StorefrontOrder::class,
            'payable_id' => $order->id,
            'purpose' => 'digital_product',
            'tx_ref' => $order->chapa_tx_ref,
            'amount' => '50.00',
            'currency' => 'ETB',
            'status' => 'pending',
            'buyer_email' => 'buyer@example.test',
        ]);
    }

    /** @return array<string, mixed> */
    private function successPayload(string $txRef): array
    {
        return ['data' => [
            'status' => 'success',
            'tx_ref' => $txRef,
            'amount' => '50.00',
            'currency' => 'ETB',
            'email' => 'buyer@example.test',
        ]];
    }

    private function mockSuccessfulChapa(string $txRef): void
    {
        $gateway = $this->getMockBuilder(ChapaGateway::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['verify', 'verifiedData', 'isSuccessful'])
            ->getMock();
        $gateway->method('verify')->willReturn($this->successPayload($txRef));
        $gateway->method('verifiedData')->willReturnCallback(
            fn (array $response) => (array) ($response['data'] ?? $response),
        );
        $gateway->method('isSuccessful')->willReturn(true);
        app()->instance(ChapaGateway::class, $gateway);
    }
}
