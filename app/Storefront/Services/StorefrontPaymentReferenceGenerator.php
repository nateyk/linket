<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Storefront\Models\StorefrontPaymentAttempt;
use Closure;
use Nateyk\Chapa\Support\MerchantReference;
use RuntimeException;

class StorefrontPaymentReferenceGenerator
{
    private const MAX_ATTEMPTS = 3;
    private const PREFIX = 'lk';

    /** @var (Closure(string): bool)|null */
    private ?Closure $existsChecker;

    /** @param (Closure(string): bool)|null $existsChecker */
    public function __construct(?Closure $existsChecker = null)
    {
        $this->existsChecker = $existsChecker;
    }

    public function generate(): string
    {
        for ($i = 0; $i < self::MAX_ATTEMPTS; $i++) {
            $reference = MerchantReference::generate(self::PREFIX);

            if ($this->isValid($reference) && !$this->alreadyExists($reference)) {
                return $reference;
            }
        }

        throw new RuntimeException('Failed to generate unique merchant reference after '.self::MAX_ATTEMPTS.' attempts.');
    }

    private function isValid(string $reference): bool
    {
        return strlen($reference) <= 20
            && preg_match('/^[A-Za-z0-9_-]{1,20}$/', $reference) === 1;
    }

    private function alreadyExists(string $reference): bool
    {
        if ($this->existsChecker !== null) {
            return ($this->existsChecker)($reference);
        }

        return StorefrontPaymentAttempt::query()
            ->where('merchant_reference', $reference)
            ->exists();
    }
}
