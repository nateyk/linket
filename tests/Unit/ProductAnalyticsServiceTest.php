<?php

namespace Tests\Unit;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\ProductView;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\ProductAnalytics;
use Carbon\CarbonImmutable;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ProductAnalyticsServiceTest extends TestCase
{
    use DatabaseTransactions;

    protected function tearDown(): void
    {
        ActiveWorkspace::clearCache();
        parent::tearDown();
    }

    private function createProduct(): DigitalProduct
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
            'price_cents' => 10000,
            'currency' => 'ETB',
            'status' => 'approved',
            'approved_at' => now(),
            'type' => 'digital',
        ]);
    }

    private function paidOrder(DigitalProduct $product, string $paidAt, int $grossCents, int $earnedCents, ?string $country = 'ET'): StorefrontOrder
    {
        return StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $product->user_id,
            'currency' => 'ETB',
            'gross_amount_cents' => $grossCents,
            'commission_bps' => 1000,
            'platform_fee_percent' => 10.0,
            'platform_fee_cents' => $grossCents - $earnedCents,
            'creator_earnings_cents' => $earnedCents,
            'status' => 'paid',
            'paid_at' => $paidAt,
            'buyer_country' => $country,
        ]);
    }

    private function addView(DigitalProduct $product, string $createdAt, ?string $referrer = null): ProductView
    {
        return $product->views()->create([
            'ip_hash' => hash('sha256', Str::random(12)),
            'country' => null,
            'referrer' => $referrer,
            'created_at' => $createdAt,
        ]);
    }

    private function stats(DigitalProduct $product, string $from, string $to): array
    {
        return app(ProductAnalytics::class)->stats(
            $product,
            CarbonImmutable::parse($from),
            CarbonImmutable::parse($to),
        );
    }

    public function testKpisAggregateOnlyPaidOrdersInPeriod(): void
    {
        $product = $this->createProduct();
        $this->paidOrder($product, now()->toDateTimeString(), 10000, 9000);
        $this->paidOrder($product, now()->toDateTimeString(), 5000, 4500);
        $this->paidOrder($product, now()->toDateTimeString(), 0, 0); // free paid order still counts as sale
        StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id,
            'creator_id' => $product->user_id,
            'currency' => 'ETB',
            'gross_amount_cents' => 2000,
            'commission_bps' => 1000,
            'platform_fee_percent' => 10.0,
            'platform_fee_cents' => 200,
            'creator_earnings_cents' => 1800,
            'status' => 'pending',
        ]);
        $this->addView($product, now()->toDateTimeString());
        $this->addView($product, now()->toDateTimeString());

        $stats = $this->stats($product, now()->startOfMonth()->format('Y-m-d'), now()->format('Y-m-d'));

        $this->assertSame(3, $stats['kpis']['sales_count']);
        $this->assertSame(15000, $stats['kpis']['gross_cents']);
        $this->assertSame(13500, $stats['kpis']['creator_earnings_cents']);
        $this->assertSame(2, $stats['kpis']['views_count']);
        $this->assertSame(150.0, $stats['kpis']['conversion_pct']);
    }

    public function testConversionIsNullWhenThereAreNoViews(): void
    {
        $product = $this->createProduct();
        $this->paidOrder($product, now()->toDateTimeString(), 10000, 9000);
        $this->paidOrder($product, now()->toDateTimeString(), 5000, 4500);

        $stats = $this->stats($product, now()->startOfMonth()->format('Y-m-d'), now()->format('Y-m-d'));

        $this->assertSame(2, $stats['kpis']['sales_count']);
        $this->assertSame(0, $stats['kpis']['views_count']);
        $this->assertNull($stats['kpis']['conversion_pct']);
    }

    public function testEmptyPeriodReturnsZeroedScaffold(): void
    {
        $product = $this->createProduct();
        $this->paidOrder($product, now()->toDateTimeString(), 10000, 9000);
        $this->addView($product, now()->toDateTimeString());

        $stats = $this->stats($product, '2020-01-01', '2020-01-31');

        $this->assertSame(0, $stats['kpis']['sales_count']);
        $this->assertSame(0, $stats['kpis']['gross_cents']);
        $this->assertSame(0, $stats['kpis']['creator_earnings_cents']);
        $this->assertSame(0, $stats['kpis']['views_count']);
        $this->assertNull($stats['kpis']['conversion_pct']);
        $this->assertCount(31, $stats['sales_series']);
        $this->assertCount(31, $stats['views_series']);
        $this->assertSame('2020-01-01', $stats['sales_series'][0]['date']);
        $this->assertSame(0, $stats['sales_series'][0]['count']);
        $this->assertSame(0, $stats['sales_series'][15]['count']);
        $this->assertSame(0, $stats['views_series'][0]['count']);
    }

    public function testSeriesAreZeroFilledBetweenSales(): void
    {
        $product = $this->createProduct();
        $this->paidOrder($product, '2026-10-01 09:00:00', 10000, 9000);
        $this->paidOrder($product, '2026-10-05 09:00:00', 5000, 4500);

        $stats = $this->stats($product, '2026-10-01', '2026-10-31');

        $series = $stats['sales_series'];
        $this->assertCount(31, $series);
        $this->assertSame(1, $series[0]['count']);   // 2026-10-01
        $this->assertSame(0, $series[1]['count']);   // 2026-10-02
        $this->assertSame(0, $series[2]['count']);   // 2026-10-03
        $this->assertSame(0, $series[3]['count']);   // 2026-10-04
        $this->assertSame(1, $series[4]['count']);   // 2026-10-05
        $this->assertSame(10000, $series[0]['gross_cents']);
        $this->assertSame(5000, $series[4]['gross_cents']);
    }

    public function testTopCountriesRankBySalesCountAndSkipNullCountries(): void
    {
        $product = $this->createProduct();
        $this->paidOrder($product, now()->toDateTimeString(), 100, 90, 'ET');
        $this->paidOrder($product, now()->toDateTimeString(), 100, 90, 'ET');
        $this->paidOrder($product, now()->toDateTimeString(), 100, 90, 'ET');
        $this->paidOrder($product, now()->toDateTimeString(), 100, 90, 'US');
        $this->paidOrder($product, now()->toDateTimeString(), 100, 90, null);

        $stats = $this->stats($product, now()->startOfMonth()->format('Y-m-d'), now()->format('Y-m-d'));

        $this->assertSame([
            ['country' => 'ET', 'sales_count' => 3, 'gross_cents' => 300],
            ['country' => 'US', 'sales_count' => 1, 'gross_cents' => 100],
        ], $stats['top_countries']);
    }

    public function testTopReferrersRankByViewCountAndSkipNullReferrers(): void
    {
        $product = $this->createProduct();
        $this->addView($product, now()->toDateTimeString(), 'https://x.com/a');
        $this->addView($product, now()->toDateTimeString(), 'https://x.com/a');
        $this->addView($product, now()->toDateTimeString(), 'https://y.com/b');
        $this->addView($product, now()->toDateTimeString(), null);

        $stats = $this->stats($product, now()->startOfMonth()->format('Y-m-d'), now()->format('Y-m-d'));

        $this->assertSame([
            ['referrer' => 'https://x.com/a', 'views_count' => 2],
            ['referrer' => 'https://y.com/b', 'views_count' => 1],
        ], $stats['top_referrers']);
    }

    public function testResolvePeriodDefaultsToCurrentMonth(): void
    {
        [$from, $to] = app(ProductAnalytics::class)->resolvePeriod(Request::create('/statistics'));

        $this->assertSame(CarbonImmutable::now()->startOfMonth()->format('Y-m-d'), $from->format('Y-m-d'));
        $this->assertSame(CarbonImmutable::now()->format('Y-m-d'), $to->format('Y-m-d'));
    }

    public function testResolvePeriodEchoesProvidedDates(): void
    {
        [$from, $to] = app(ProductAnalytics::class)->resolvePeriod(
            Request::create('/statistics', 'GET', ['from' => '2026-10-01', 'to' => '2026-10-31']),
        );

        $this->assertSame('2026-10-01', $from->format('Y-m-d'));
        $this->assertSame('2026-10-31', $to->format('Y-m-d'));
    }

    public function testResolvePeriodRejectsInvalidRanges(): void
    {
        $this->assertPeriodRejected(['from' => '2026-10-31', 'to' => '2026-10-01'], 'from after to');
        $this->assertPeriodRejected(['from' => '2026-01-01', 'to' => '2027-02-04'], '400-day range');
        $this->assertPeriodRejected(['from' => '10-2026', 'to' => '2026-10-31'], 'bad format');
    }

    private function assertPeriodRejected(array $params, string $label): void
    {
        try {
            app(ProductAnalytics::class)->resolvePeriod(Request::create('/statistics', 'GET', $params));
            $this->fail("Expected period rejection for: {$label}");
        } catch (HttpException $e) {
            $this->assertSame(422, $e->getStatusCode(), "{$label} expected HTTP 422");
        } catch (\Illuminate\Validation\ValidationException $e) {
            $this->assertSame(422, $e->status, "{$label} expected validation 422");
        }
    }
}