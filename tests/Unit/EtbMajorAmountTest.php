<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Storefront\Support\EtbMajorAmount;
use PHPUnit\Framework\TestCase;

class EtbMajorAmountTest extends TestCase
{
    public function testExactEtbAmountsConvertToIntegerCents(): void
    {
        foreach ([
            '0' => 0,
            '0.01' => 1,
            '0.10' => 10,
            '1' => 100,
            '500.00' => 50000,
            '500.0000' => 50000,
            '500.0100' => 50001,
            '001.09' => 109,
            '999999999999999.99' => 99999999999999999,
        ] as $major => $expected) {
            $this->assertSame($expected, EtbMajorAmount::cents($major));
        }

        $this->assertSame(50000, EtbMajorAmount::cents(500));
        $this->assertSame(50000, EtbMajorAmount::cents(500.0));
        $this->assertSame(50001, EtbMajorAmount::cents(500.01));
    }

    public function testMalformedOrSubCentAmountsAreNeverRounded(): void
    {
        foreach ([
            null,
            '',
            '500.001',
            '499.999',
            '500.009',
            '5e2',
            '1E3',
            '-500.00',
            '+500.00',
            '500.',
            '.50',
            '1,000.00',
            '1000000000000000.00',
            false,
            [],
            INF,
        ] as $invalid) {
            $this->assertNull(EtbMajorAmount::cents($invalid));
        }
    }
}
