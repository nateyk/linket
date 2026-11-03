<?php

use App\CreatorAi\Services\SalesSummaryService;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Carbon\CarbonImmutable;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(DatabaseTransactions::class);

/** @return array{0: User, 1: \Common\Workspaces\Models\Workspace, 2: DigitalProduct} */
function creatorAiSalesFixture(): array
{
    $creator = User::factory()->create();
    $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
    $product = DigitalProduct::query()->create([
        'workspace_id' => $workspace->id,
        'user_id' => $creator->id,
        'title' => 'Synthetic AI reporting product',
        'price_cents' => 10000,
        'currency' => 'ETB',
        'status' => 'approved',
        'approved_at' => now(),
        'type' => 'digital',
    ]);

    return [$creator, $workspace, $product];
}

/** @param array<string, mixed> $attributes */
function creatorAiSalesOrder(User $creator, DigitalProduct $product, array $attributes = []): StorefrontOrder
{
    return StorefrontOrder::query()->create([
        'uuid' => (string) Str::uuid(),
        'creator_id' => $creator->id,
        'digital_product_id' => $product->id,
        'buyer_name' => 'PRIVATE BUYER NAME',
        'buyer_email' => 'private-buyer@example.test',
        'payment_reference' => 'PRIVATE-TRANSACTION-REF',
        'currency' => 'ETB',
        'gross_amount_cents' => 10000,
        'commission_bps' => 0,
        'platform_fee_cents' => 0,
        'creator_earnings_cents' => 10000,
        'status' => 'paid',
        'paid_at' => '2026-10-12 10:30:00',
        'payment_gateway' => 'verify_et',
        ...$attributes,
    ]);
}

test('AI sales summary counts only verified ETB orders in the selected creator workspace and period', function () {
    [$creator, $workspace, $product] = creatorAiSalesFixture();
    [$otherCreator, , $otherProduct] = creatorAiSalesFixture();

    creatorAiSalesOrder($creator, $product, ['status' => 'paid', 'gross_amount_cents' => 12000]);
    creatorAiSalesOrder($creator, $product, ['status' => 'fulfilled', 'gross_amount_cents' => 8000]);
    creatorAiSalesOrder($creator, $product, ['status' => 'manual_review', 'gross_amount_cents' => 300000]);
    creatorAiSalesOrder($creator, $product, ['status' => 'verifying', 'gross_amount_cents' => 400000]);
    creatorAiSalesOrder($creator, $product, ['status' => 'paid', 'currency' => 'USD', 'gross_amount_cents' => 200000]);
    creatorAiSalesOrder($creator, $product, ['status' => 'paid', 'paid_at' => null, 'gross_amount_cents' => 600000]);
    creatorAiSalesOrder($creator, $product, ['status' => 'paid', 'paid_at' => '2026-09-30 23:00:00', 'gross_amount_cents' => 700000]);
    creatorAiSalesOrder($otherCreator, $otherProduct, ['status' => 'paid', 'gross_amount_cents' => 900000]);

    $result = app(SalesSummaryService::class)->summary(
        $creator,
        $workspace->id,
        CarbonImmutable::parse('2026-10-01'),
        CarbonImmutable::parse('2026-10-31'),
    );

    expect($result)->toBe([
        'verified_sales_count' => 2,
        'verified_revenue_cents' => 20000,
        'currency' => 'ETB',
        'from' => '2026-10-01',
        'to' => '2026-10-31',
    ]);

    $serialized = json_encode($result, JSON_THROW_ON_ERROR);
    foreach (['PRIVATE BUYER NAME', 'private-buyer@example.test', 'PRIVATE-TRANSACTION-REF'] as $secret) {
        expect($serialized)->not->toContain($secret);
    }
});

test('AI sales summary denies a workspace not authorized for the requesting creator', function () {
    [$creator] = creatorAiSalesFixture();
    [, $foreignWorkspace] = creatorAiSalesFixture();

    try {
        app(SalesSummaryService::class)->summary(
            $creator,
            $foreignWorkspace->id,
            CarbonImmutable::parse('2026-10-01'),
            CarbonImmutable::parse('2026-10-31'),
        );
        $this->fail('Creator accessed an unrelated workspace.');
    } catch (HttpException $exception) {
        expect($exception->getStatusCode())->toBe(403);
    }
});

test('AI sales summary rejects inverted dates without querying orders', function () {
    [$creator, $workspace] = creatorAiSalesFixture();

    $this->expectException(InvalidArgumentException::class);
    app(SalesSummaryService::class)->summary(
        $creator,
        $workspace->id,
        CarbonImmutable::parse('2026-11-01'),
        CarbonImmutable::parse('2026-10-01'),
    );
});
