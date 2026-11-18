<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class PurgeVerifyEtDataTest extends TestCase
{
    use DatabaseTransactions;

    public function testPurgeIsPreviewOnlyWithoutExplicitExecution(): void
    {
        $eventId = (string) Str::uuid();
        DB::table('verify_et_webhook_deliveries')->insert([
            'event_id' => $eventId,
            'status' => 'test',
            'received_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('billing:purge-verify-et')->assertExitCode(0);
        $this->assertDatabaseHas('verify_et_webhook_deliveries', ['event_id' => $eventId]);

        $this->artisan('billing:purge-verify-et', ['--execute' => true])->assertExitCode(1);
        $this->assertDatabaseHas('verify_et_webhook_deliveries', ['event_id' => $eventId]);
    }

    public function testExplicitPurgeRemovesOnlyLegacyOrdersAndProviderEvidence(): void
    {
        $creator = User::factory()->create();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Payment reset fixture',
            'price_cents' => 3500,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);

        $legacy = $this->order($creator->id, $product->id, 'verify_et');
        $chapa = $this->order($creator->id, $product->id, 'chapa');
        $free = $this->order($creator->id, $product->id, null);

        $eventId = (string) Str::uuid();
        DB::table('verify_et_webhook_deliveries')->insert([
            'event_id' => $eventId,
            'status' => 'test',
            'received_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('billing:purge-verify-et', [
            '--execute' => true,
            '--confirm' => 'PURGE-VERIFY-ET',
        ])->assertExitCode(0);

        $this->assertDatabaseMissing('storefront_orders', ['id' => $legacy->id]);
        $this->assertDatabaseHas('storefront_orders', ['id' => $chapa->id, 'payment_gateway' => 'chapa']);
        $this->assertDatabaseHas('storefront_orders', ['id' => $free->id]);
        $this->assertDatabaseMissing('verify_et_webhook_deliveries', ['event_id' => $eventId]);
    }

    private function order(int $creatorId, int $productId, ?string $gateway): StorefrontOrder
    {
        return StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $productId,
            'creator_id' => $creatorId,
            'buyer_email' => 'buyer@example.test',
            'currency' => 'ETB',
            'gross_amount_cents' => $gateway === null ? 0 : 3500,
            'commission_bps' => 0,
            'platform_fee_cents' => 0,
            'creator_earnings_cents' => $gateway === null ? 0 : 3500,
            'status' => 'pending',
            'payment_gateway' => $gateway,
        ]);
    }
}
