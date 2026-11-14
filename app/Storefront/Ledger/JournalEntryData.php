<?php

namespace App\Storefront\Ledger;

use Carbon\CarbonInterface;
use DateTimeInterface;

final class JournalEntryData
{
    public function __construct(
        public readonly string $sourceType,
        public readonly int $sourceId,
        public readonly string $eventType,
        public readonly string $currency,
        public readonly ?int $creatorId = null,
        public readonly ?int $workspaceId = null,
        public readonly ?string $description = null,
        public readonly ?DateTimeInterface $occurredAt = null,
        public readonly ?int $reversalOfId = null,
        public readonly ?array $metadata = null,
    ) {
    }
}
