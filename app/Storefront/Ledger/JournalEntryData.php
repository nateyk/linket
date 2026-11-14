<?php

namespace App\Storefront\Ledger;

use DateTimeInterface;

final class JournalEntryData
{
    public readonly ?int $creatorId;
    public readonly ?int $workspaceId;
    public readonly ?string $description;
    public readonly ?DateTimeInterface $occurredAt;
    public readonly ?int $reversalOfId;
    public readonly ?array $metadata;

    public function __construct(
        public readonly string $sourceType,
        public readonly int $sourceId,
        public readonly string $eventType,
        public readonly string $currency,
        array $attributes = [],
    ) {
        $this->creatorId = $attributes['creator_id'] ?? null;
        $this->workspaceId = $attributes['workspace_id'] ?? null;
        $this->description = $attributes['description'] ?? null;
        $this->occurredAt = $attributes['occurred_at'] ?? null;
        $this->reversalOfId = $attributes['reversal_of_id'] ?? null;
        $this->metadata = $attributes['metadata'] ?? null;
    }
}
