<?php

namespace Tests\Unit;

use App\Models\User;
use App\Storefront\Actions\RecordProductView;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductView;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class RecordProductViewTest extends TestCase
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
        request()->server->set('REMOTE_ADDR', '10.0.0.1');
        request()->headers->remove('User-Agent');
    }

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    private function createProduct(string $status = 'approved'): DigitalProduct
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

        return DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Product '.Str::random(6),
            'price_cents' => 1000,
            'currency' => 'ETB',
            'status' => $status,
            'approved_at' => $status === 'approved' ? now() : null,
            'type' => 'digital',
        ]);
    }

    public function testRecordsViewAndBumpsCounterForApprovedProduct(): void
    {
        $product = $this->createProduct();

        $this->assertTrue(app(RecordProductView::class)->execute($product));

        $this->assertDatabaseCount('product_views', 1);
        $this->assertSame(1, $product->fresh()->views_count);
        $this->assertSame(hash('sha256', '10.0.0.1'), $product->views()->first()->ip_hash);
    }

    public function testDeduplicatesWithin24HoursPerIp(): void
    {
        $product = $this->createProduct();

        app(RecordProductView::class)->execute($product);
        app(RecordProductView::class)->execute($product);

        $this->assertDatabaseCount('product_views', 1);
        $this->assertSame(1, $product->fresh()->views_count);
    }

    public function testRecordsAgainAfter24Hours(): void
    {
        $product = $this->createProduct();

        app(RecordProductView::class)->execute($product);
        ProductView::query()->update(['created_at' => now()->subHours(25)]);
        app(RecordProductView::class)->execute($product);

        $this->assertDatabaseCount('product_views', 2);
        $this->assertSame(2, $product->fresh()->views_count);
    }

    public function testSkipsNonApprovedProduct(): void
    {
        $product = $this->createProduct('draft');

        $this->assertFalse(app(RecordProductView::class)->execute($product));

        $this->assertDatabaseCount('product_views', 0);
        $this->assertSame(0, $product->fresh()->views_count);
    }

    public function testSkipsRobots(): void
    {
        $product = $this->createProduct();
        request()->headers->set('User-Agent', 'Googlebot/2.1');

        $this->assertFalse(app(RecordProductView::class)->execute($product));

        $this->assertDatabaseCount('product_views', 0);
        $this->assertSame(0, $product->fresh()->views_count);
    }
}