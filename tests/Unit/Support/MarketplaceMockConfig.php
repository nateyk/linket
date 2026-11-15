<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

final class MarketplaceMockConfig
{
    public string $status = 'SUCCESS';
    public string $reference = 'ref';
    public int $amount = 100000;
    public bool $isRefund = true;

    public static function forRefund(string $ref): self
    {
        $cfg = new self();
        $cfg->reference = $ref;
        $cfg->isRefund = true;

        return $cfg;
    }

    public static function forPayment(string $ref, int $amount): self
    {
        $cfg = new self();
        $cfg->reference = $ref;
        $cfg->amount = $amount;
        $cfg->isRefund = false;

        return $cfg;
    }
}
