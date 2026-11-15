<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Storefront\Services\StorefrontPaymentReferenceGenerator;
use RuntimeException;
use Tests\TestCase;

class StorefrontPaymentReferenceGeneratorTest extends TestCase
{
    public function testGeneratesValidTwentyCharacterAsciiReference(): void
    {
        $generator = new StorefrontPaymentReferenceGenerator(fn (): bool => false);
        $reference = $generator->generate();

        $this->assertLessThanOrEqual(20, strlen($reference));
        $this->assertGreaterThanOrEqual(10, strlen($reference));
        $this->assertMatchesRegularExpression('/^lk-[A-Za-z0-9_-]{1,17}$/', $reference);
        $this->assertTrue(mb_check_encoding($reference, 'ASCII'));
    }

    public function testGeneratesUniqueReferencesConsecutively(): void
    {
        $generator = new StorefrontPaymentReferenceGenerator(fn (): bool => false);
        $generated = [];

        for ($i = 0; $i < 50; $i++) {
            $ref = $generator->generate();
            $this->assertArrayNotHasKey($ref, $generated);
            $generated[$ref] = true;
        }
    }

    public function testRetriesOnCollisionAndSucceeds(): void
    {
        $attempts = 0;
        $existsCallback = function (string $ref) use (&$attempts): bool {
            $attempts++;
            return $attempts < 2; // Collides on first attempt, passes on second
        };

        $generator = new StorefrontPaymentReferenceGenerator($existsCallback);
        $ref = $generator->generate();

        $this->assertNotEmpty($ref);
        $this->assertSame(2, $attempts);
    }

    public function testThrowsIfMaxCollisionRetriesExceeded(): void
    {
        $alwaysCollides = fn (string $ref): bool => true;
        $generator = new StorefrontPaymentReferenceGenerator($alwaysCollides);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Failed to generate unique merchant reference');
        $generator->generate();
    }
}
