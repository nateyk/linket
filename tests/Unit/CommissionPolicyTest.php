<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\User;
use App\Storefront\Commission\CommissionPolicy;
use App\Storefront\Commission\CommissionSnapshot;
use Common\Billing\Models\Product;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final readonly class CommissionTestCase
{
    public function __construct(
        public int $grossAmountCents,
        public int $bps,
        public int $expectedFeeCents,
        public int $expectedEarningsCents,
        public float $expectedPercent,
    ) {
    }
}

class CommissionPolicyTest extends TestCase
{
    #[DataProvider('calculationCases')]
    public function testCommissionCalculations(CommissionTestCase $case): void
    {
        $policy = new CommissionPolicy(bpsResolver: fn (User $u) => $case->bps);
        $creator = new User(['id' => 42]);

        $snapshot = $policy->calculate($creator, $case->grossAmountCents);

        $this->assertSame($case->grossAmountCents, $snapshot->grossAmountCents);
        $this->assertSame($case->bps, $snapshot->commissionBps);
        $this->assertSame($case->expectedPercent, $snapshot->platformFeePercent);
        $this->assertSame($case->expectedFeeCents, $snapshot->platformFeeCents);
        $this->assertSame($case->expectedEarningsCents, $snapshot->creatorEarningsCents);
        $this->assertSame($case->grossAmountCents, $snapshot->platformFeeCents + $snapshot->creatorEarningsCents);
    }

    public static function calculationCases(): array
    {
        return [
            '10% commission on 1000 ETB' => [
                new CommissionTestCase(100000, 1000, 10000, 90000, 10.0),
            ],
            '3% commission on 150 ETB' => [
                new CommissionTestCase(15000, 300, 450, 14550, 3.0),
            ],
            'odd cent rounding at 3%' => [
                new CommissionTestCase(99, 300, 3, 96, 3.0),
            ],
            '0% commission on 50 ETB' => [
                new CommissionTestCase(5000, 0, 0, 5000, 0.0),
            ],
            'zero gross amount' => [
                new CommissionTestCase(0, 1000, 0, 0, 10.0),
            ],
        ];
    }

    public function testZeroLossInvariantAcrossExtensiveAmounts(): void
    {
        $creator = new User(['id' => 99]);
        $testBpsRates = [0, 50, 150, 300, 500, 750, 1000, 1500, 2500];

        foreach ($testBpsRates as $bps) {
            $policy = new CommissionPolicy(bpsResolver: fn (User $u) => $bps);

            for ($amount = 1; $amount <= 200; $amount++) {
                $snapshot = $policy->calculate($creator, $amount);
                $this->assertSame(
                    $amount,
                    $snapshot->platformFeeCents + $snapshot->creatorEarningsCents,
                    "Failed invariant on amount {$amount} with bps {$bps}"
                );
            }
        }
    }

    public function testPlanIdSnapshotting(): void
    {
        $plan = new Product(['id' => 7]);
        $policy = new CommissionPolicy(
            bpsResolver: fn (User $u) => 500,
            planResolver: fn (User $u) => $plan,
        );
        $creator = new User(['id' => 1]);

        $snapshot = $policy->calculate($creator, 20000);

        $this->assertSame(7, $snapshot->planId);
        $this->assertSame(1000, $snapshot->platformFeeCents);
        $this->assertSame(19000, $snapshot->creatorEarningsCents);

        $array = $snapshot->toArray();
        $this->assertSame(7, $array['commission_plan_id']);
        $this->assertSame(500, $array['commission_bps']);
        $this->assertSame(1000, $array['platform_fee_cents']);
        $this->assertSame(19000, $array['creator_earnings_cents']);
    }

    public function testDefaultEntitlementsFallback(): void
    {
        $policy = new CommissionPolicy();
        $creator = new User(['id' => 999]);

        $snapshot = $policy->calculate($creator, 10000);
        $this->assertSame(10000, $snapshot->grossAmountCents);
        $this->assertSame(10000, $snapshot->platformFeeCents + $snapshot->creatorEarningsCents);
    }
}

