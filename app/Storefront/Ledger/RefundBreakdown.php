<?php

namespace App\Storefront\Ledger;

final class RefundBreakdown
{
    public function __construct(
        public readonly int $grossCents,
        public readonly int $creatorCents,
        public readonly int $feeCents = 0,
        public readonly ?int $refundId = null,
    ) {
    }
}
