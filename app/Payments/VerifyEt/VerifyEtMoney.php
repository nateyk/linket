<?php

namespace App\Payments\VerifyEt;

final class VerifyEtMoney
{
    public function cents(mixed $amount): ?int
    {
        if (!is_int($amount) && !is_string($amount)) {
            return null;
        }
        $amount = (string) $amount;
        if (!preg_match('/^(0|[1-9][0-9]*)(?:\.([0-9]{1,2}))?$/D', $amount, $parts)) {
            return null;
        }

        $digits = ltrim($parts[1] . str_pad($parts[2] ?? '', 2, '0'), '0');
        $digits = $digits === '' ? '0' : $digits;
        $maximum = (string) PHP_INT_MAX;
        if (strlen($digits) > strlen($maximum) || (strlen($digits) === strlen($maximum) && strcmp($digits, $maximum) > 0)) {
            return null;
        }

        return (int) $digits;
    }
}
