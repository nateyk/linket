<?php

namespace App\Storefront\Ledger;

final class BalanceQuery
{
    public function __construct(
        public readonly int $creatorId,
        public readonly string $currency,
        public readonly ?int $workspaceId = null,
        public readonly bool $lock = false,
    ) {
    }

    public static function for(int $creatorId, string $currency, ?int $workspaceId = null, bool $lock = false): self
    {
        return new self($creatorId, $currency, $workspaceId, $lock);
    }
}
