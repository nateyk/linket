<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\ChapaGateway;
use App\Payments\ChapaPaymentFulfillment;
use App\Payments\Models\PaymentTransaction;
use App\Payments\PaymentVerificationException;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use Common\Files\FileEntry;
use Common\Roles\Models\Role;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductionHardeningTest extends TestCase
{
    use DatabaseTransactions;

    public function testLateVerificationFailureCannotDowngradePaidTransaction(): void
    {
        [$creator, $product] = $this->createProductFixture();
        $order = $this->createOrder($product, $creator, 'paid');
        $transaction = PaymentTransaction::query()->create([
            'uuid' => (string) Str::uuid(),
            'gateway' => 'chapa',
            'payable_type' => StorefrontOrder::class,
            'payable_id' => $order->id,
            'purpose' => 'digital_product_purchase',
            'tx_ref' => 'late_failure_tx_ref',
            'amount' => '50.00',
            'currency' => 'ETB',
            'status' => 'pending',
        ]);
        $staleTransaction = $transaction->fresh();

        $transaction->update([
            'status' => 'paid',
            'verification_data' => ['status' => 'success'],
            'verified_at' => now(),
        ]);

        app(ChapaPaymentFulfillment::class)->recordVerificationFailure(
            $staleTransaction,
            new PaymentVerificationException('amount_mismatch', true),
        );

        $transaction->refresh();

        $this->assertSame('paid', $transaction->status);
        $this->assertSame('success', $transaction->verification_data['status']);
        $this->assertNotNull($transaction->verified_at);
    }

    public function testChapaVerificationRejectsMismatchedTransactionReference(): void
    {
        [$creator, $product] = $this->createProductFixture();
        $order = $this->createOrder($product, $creator, 'pending');
        $transaction = PaymentTransaction::query()->create([
            'uuid' => (string) Str::uuid(),
            'gateway' => 'chapa',
            'payable_type' => StorefrontOrder::class,
            'payable_id' => $order->id,
            'purpose' => 'digital_product_purchase',
            'tx_ref' => 'expected_tx_ref',
            'amount' => '50.00',
            'currency' => 'ETB',
        ]);
        $gateway = $this->getMockBuilder(ChapaGateway::class)
            ->disableOriginalConstructor()
            ->getMock();
        $gateway->method('verifiedData')->willReturn([
            'status' => 'success',
            'tx_ref' => 'different_tx_ref',
            'amount' => '50.00',
            'currency' => 'ETB',
        ]);
        $gateway->method('isSuccessful')->willReturn(true);
        app()->instance(ChapaGateway::class, $gateway);

        try {
            app(ChapaPaymentFulfillment::class)->fulfill($transaction, []);
            $this->fail('Expected mismatched Chapa transaction reference to be rejected.');
        } catch (PaymentVerificationException $exception) {
            $this->assertSame('transaction_reference_mismatch', $exception->reason);
            $this->assertTrue($exception->shouldMarkFailed);
        }

        $this->assertSame('pending', $transaction->fresh()->status);
        $this->assertSame('pending', $order->fresh()->status);
    }

    public function testMissingProtectedFileDoesNotConsumeDownloadAttempt(): void
    {
        [$creator, $product, $file] = $this->createProductFixture();
        $order = $this->createOrder($product, $creator, 'paid');
        $entitlement = DownloadEntitlement::query()->create([
            'token' => (string) Str::uuid(),
            'storefront_order_id' => $order->id,
            'file_entry_id' => $file->id,
            'download_count' => 0,
            'download_limit' => 10,
            'expires_at' => now()->addDay(),
        ]);
        $file->delete();

        $url = URL::temporarySignedRoute(
            'storefront.download',
            now()->addHour(),
            ['token' => $entitlement->token],
        );

        $this->get($url)->assertGone();
        $this->assertSame(0, $entitlement->fresh()->download_count);
    }

    public function testDigitalProductUploadRejectsSpoofedMimeType(): void
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $creator->roles()->attach(Role::query()->where('default', true)->firstOrFail());
        $path = tempnam(sys_get_temp_dir(), 'linket-upload-');
        file_put_contents($path, "\x7fELF\x02\x01\x01\x00not-a-pdf-executable");
        $file = new UploadedFile(
            $path,
            'malware.pdf',
            'application/pdf',
            null,
            true,
        );

        try {
            $this->stateful()->actingAs($creator)
                ->post('/api/v1/file-entries', [
                    'file' => $file,
                    'clientMime' => 'application/pdf',
                    'workspaceId' => $workspace->id,
                    'uploadType' => 'digitalProductFiles',
                ])
                ->assertUnprocessable();
        } finally {
            if (is_file($path)) {
                unlink($path);
            }
        }
    }

    /** @return array{User, DigitalProduct, FileEntry} */
    private function createProductFixture(): array
    {
        $creator = $this->createCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Creator toolkit',
            'price_cents' => 5000,
            'currency' => 'ETB',
            'status' => 'approved',
        ]);
        $fileName = 'creator-toolkit-' . Str::lower(Str::random(12)) . '.pdf';
        $file = FileEntry::query()->create([
            'name' => $fileName,
            'file_name' => $fileName,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);

        return [$creator, $product, $file];
    }

    private function createCreator(): User
    {
        $token = Str::lower(Str::random(12));

        return User::query()->forceCreate([
            'name' => 'Creator ' . $token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
    }

    private function createOrder(
        DigitalProduct $product,
        User $creator,
        string $status,
    ): StorefrontOrder {
        return StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'currency' => $product->currency,
            'gross_amount_cents' => 5000,
            'commission_bps' => 1000,
            'platform_fee_cents' => 500,
            'creator_earnings_cents' => 4500,
            'status' => $status,
            'paid_at' => $status === 'paid' ? now() : null,
        ]);
    }

    private function stateful(): static
    {
        $csrfToken = 'test-csrf-token';

        return $this->withSession(['_token' => $csrfToken])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', $csrfToken);
    }
}
