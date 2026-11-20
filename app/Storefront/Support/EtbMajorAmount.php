<?php

declare(strict_types=1);

namespace App\Storefront\Support;

/**
 * Convert a major-unit ETB decimal into integer cents without floating-point rounding.
 *
 * Provider balances and signed transfer approvals must not accept fractional cents,
 * exponent notation, signed numbers, or malformed decimals.
 */
final class EtbMajorAmount
{
    public static function cents(mixed $amount): ?int
    {
        if (!is_scalar($amount)) {
            return null;
        }
        if (is_bool($amount)) {
            return null;
        }

        $value = trim((string) $amount);
        if (preg_match('/^([0-9]{1,15})(?:\.([0-9]{1,2})(?:0+)?)?$/D', $value, $matches) !== 1) {
            return null;
        }

        $fraction = str_pad($matches[2] ?? '', 2, '0');

        return ((int) $matches[1] * 100) + (int) $fraction;
    }
}
