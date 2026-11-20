<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Jobs\SendStorefrontReceipt;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Notifications\ChapaCreatorSaleNotification;
use App\Storefront\StorefrontWebhookHandler;
use Common\Files\FileEntry;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ChapaCreatorSaleEmailTest extends TestCase
{
    use DatabaseTransactions;

    #[Test]
    public function paid_chapa_order_notifies_the_creator(): void
    {
        Notification::fake();
        Bus::fake([SendStorefrontReceipt::class]);

        $creator = User::factory()->create();
        $order = $this->pendingOrder($creator);

        app(StorefrontWebhookHandler::class)->fulfill($order, 'buyer@example.test', [
            'payment_gateway' => 'chapa',
            'chapa_tx_ref' => 'lk-sale-1',
        ]);

        Notification::assertSentTo($creator, ChapaCreatorSaleNotification::class);
    }

    #[Test]
    public function non_chapa_order_does_not_notify_the_creator(): void
    {
        Notification::fake();
        Bus::fake([SendStorefrontReceipt::class]);

        $creator = User::factory()->create();
        $order = $this->pendingOrder($creator);

        app(StorefrontWebhookHandler::class)->fulfill($order, 'buyer@example.test');

        Notification::assertNotSentTo($creator, ChapaCreatorSaleNotification::class);
    }

    private function pendingOrder(User $creator): StorefrontOrder
    {
        $workspace = $creator->workspaces()->first()
            ?? \Common\Workspaces\Models\Workspace::factory()->create(['owner_id' => $creator->id]);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Creator toolkit',
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => 'approved',
        ]);
        $file = FileEntry::query()->create([
            'name' => 'toolkit.pdf',
            'file_name' => 'toolkit-'.Str::lower(Str::random(6)).'.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'file_size' => 1024,
            'type' => 'file',
            'public' => 1,
            'user_id' => (string) $creator->id,
            'disk_prefix' => 'uploads',
            'workspace_id' => $workspace->id,
        ]);
        $product->files()->attach($file->id);

        return StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $creator->id,
            'buyer_email' => 'buyer@example.test',
            'buyer_name' => 'Buyer',
            'currency' => 'ETB',
            'gross_amount_cents' => 1000,
            'commission_bps' => 500,
            'platform_fee_percent' => 5,
            'platform_fee_cents' => 50,
            'creator_earnings_cents' => 950,
            'status' => 'pending',
        ]);
    }
}
