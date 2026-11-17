<?php

namespace Tests\Feature;

use App\Mail\ReactEmailMailable;
use App\Mail\ReactEmailRenderer;
use App\Models\User;
use App\Storefront\Jobs\SendStorefrontReceipt;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use Common\Database\Seeders\RolesTableSeeder;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ReactEmailStorefrontReceiptTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesTableSeeder::class);
        config()->set('app.url', 'http://localhost');
    }

    #[Test]
    public function receipt_job_sends_react_email_mailable(): void
    {
        Mail::fake();

        $this->app->instance(ReactEmailRenderer::class, new class
        {
            public function render(string $template, array $props): array
            {
                \PHPUnit\Framework\Assert::assertSame('order-confirmation', $template);

                return ['html' => '<p>Receipt</p>', 'text' => 'Receipt'];
            }
        });

        $order = $this->seedPaidOrderWithEntitlement();

        (new SendStorefrontReceipt($order->id, force: true))->handle();

        Mail::assertSent(ReactEmailMailable::class, function (ReactEmailMailable $mail) {
            if ($mail->subjectLine !== __('Your digital product receipt')) {
                return false;
            }

            $mail->assertSeeInHtml('Receipt');

            return true;
        });

        $this->assertNotNull($order->fresh()->receipt_sent_at);
    }

    private function seedPaidOrderWithEntitlement(): StorefrontOrder
    {
        $creator = User::query()->forceCreate([
            'name' => 'Creator '.Str::lower(Str::random(8)),
            'username' => Str::lower(Str::random(12)),
            'email' => Str::lower(Str::random(12)).'@example.test',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Creator toolkit',
            'price_cents' => 5000,
            'currency' => 'ETB',
            'status' => 'approved',
        ]);
        $fileName = 'creator-toolkit-'.Str::lower(Str::random(12)).'.pdf';
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

        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_name' => 'Buyer',
            'buyer_email' => 'buyer@example.test',
            'currency' => $product->currency,
            'gross_amount_cents' => 5000,
            'commission_bps' => 1000,
            'platform_fee_cents' => 500,
            'creator_earnings_cents' => 4500,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        DownloadEntitlement::query()->create([
            'token' => (string) Str::uuid(),
            'storefront_order_id' => $order->id,
            'file_entry_id' => $file->id,
            'download_count' => 0,
            'download_limit' => 10,
            'expires_at' => now()->addDays(30),
        ]);

        return $order;
    }
}