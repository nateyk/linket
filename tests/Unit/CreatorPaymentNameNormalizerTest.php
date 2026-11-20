<?php

namespace Tests\Unit;

use App\Storefront\Support\EthiopianNameNormalizer;
use PHPUnit\Framework\TestCase;

class CreatorPaymentNameNormalizerTest extends TestCase
{
    public function testHonorificsAndPunctuationAreNormalized(): void
    {
        $normalizer = new EthiopianNameNormalizer();

        $this->assertSame(['abebe', 'kebede', 'wolde'], $normalizer->normalizeTokens(' Ato. Abebe  Kebede-Wolde '));
        $this->assertTrue($normalizer->matches('Abebe Kebede Wolde', 'Dr. Wolde Abebe Kebede'));
        $this->assertFalse($normalizer->matches('Abebe Kebede Wolde', 'Abebe Kebede Tadesse'));
    }

    public function testApprovedAliasCanMatchTransliteratedName(): void
    {
        $normalizer = new EthiopianNameNormalizer();

        $this->assertTrue($normalizer->matches('Abebe Kebede Wolde', 'Abebe Kebede Welde', ['Abebe Kebede Welde']));
    }
}
