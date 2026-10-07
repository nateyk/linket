<?php

namespace Tests\Feature;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\StorefrontCheckout;
use Common\Files\FileEntry;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductCheckoutAnalyticsCaptureTest extends TestCase
{
    use DatabaseTransactions;

    private const IP_HEADERS = [
        'HTTP_CF_CONNECTING_IP',
        'HTTP_CLIENT_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_FORWARDED',
        'HTTP_X_CLUSTER_CLIENT_IP',
        'HTTP_FORWARDED_FOR',
        'HTTP_FORWARDED',
        'REMOTE_ADDR',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        foreach (self::IP_HEADERS as $key) {
            unset($_SERVER[$key]);
            request()->server->remove($key);
        }
        unset($_SERVER['HTTP_REFERER']);
        request()->server->remove('HTTP_REFERER');
        request()->headers->remove('User-Agent');
        request()->server->set('REMOTE_ADDR', '10.0.0.1');
        config(['geoip.default_location.iso_code' => null]);
        app()->forgetInstance('geoip');
    }

    protected function tearDown(): void
    {
        config(['geoip.default_location.iso_code' => null]);
        app()->forgetInstance('geoip');
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    private function freeProduct(): DigitalProduct
    {
        $token = Str::lower(Str::random(12));
        $creator = User::query()->forceCreate([
            'name' => 'Creator '.$token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        ActiveWorkspace::clearCache();

        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Free Product '.Str::random(6),
            'price_cents' => 0,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);

        $file = FileEntry::query()->create([
            'name' => 'file-'.Str::random(6).'.pdf',
            'file_name' => 'file-'.Str::random(6).'.pdf',
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'file_size' => 100,
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);

        return $product;
    }

    private function checkout(DigitalProduct $product): StorefrontOrder
    {
        return app(StorefrontCheckout::class)->create($product->fresh()->load('creator'), null, [
            'name' => 'Buyer',
            'email' => 'buyer@example.test',
        ]);
    }

    public function testCheckoutStoresExternalReferrer(): void
    {
        request()->server->set('HTTP_REFERER', 'https://external.example/ref');

        $order = $this->checkout($this->freeProduct());

        $this->assertSame('https://external.example/ref', $order->fresh()->buyer_referrer);
    }

    public function testCheckoutNullsInternalReferrer(): void
    {
        request()->server->set('HTTP_REFERER', url('/some-internal-page'));

        $order = $this->checkout($this->freeProduct());

        $this->assertNull($order->fresh()->buyer_referrer);
    }

    public function testCheckoutCapturesBuyerCountryFromGeoipFallback(): void
    {
        config(['geoip.default_location.iso_code' => 'US']);
        app()->forgetInstance('geoip');

        $order = $this->checkout($this->freeProduct());

        $this->assertSame('US', $order->fresh()->buyer_country);
    }

    public function testLegacyOrdersWithoutAnalyticsColumnsStillInsertWithNulls(): void
    {
        $product = $this->freeProduct();

        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $product->user_id,
            'currency' => 'ETB',
            'gross_amount_cents' => 1000,
            'commission_bps' => 1000,
            'platform_fee_cents' => 100,
            'creator_earnings_cents' => 900,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $this->assertNull($order->fresh()->buyer_country);
        $this->assertNull($order->fresh()->buyer_referrer);
    }
}