<?php

namespace Tests\Unit;

use App\Storefront\Models\StorefrontJournalEntry;
use App\Storefront\Models\StorefrontJournalLine;
use App\Storefront\Models\StorefrontOrder;
use Tests\TestCase;

class StorefrontJournalSchemaTest extends TestCase
{
    public function testStorefrontOrderHasCollectionOwnerConstants(): void
    {
        $this->assertSame('platform_chapa', StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA);
        $this->assertSame('creator_chapa', StorefrontOrder::COLLECTION_OWNER_CREATOR_CHAPA);
        $this->assertSame('verify_et_creator', StorefrontOrder::COLLECTION_OWNER_VERIFY_ET_CREATOR);
    }

    public function testJournalModelsExistAndHaveExpectedCasts(): void
    {
        $entry = new StorefrontJournalEntry([
            'metadata' => ['order_id' => 123],
            'occurred_at' => '2026-11-14 12:00:00',
        ]);
        $line = new StorefrontJournalLine([
            'debit_cents' => 5000,
            'credit_cents' => 0,
        ]);

        $this->assertIsArray($entry->metadata);
        $this->assertInstanceOf(\Carbon\CarbonInterface::class, $entry->occurred_at);
        $this->assertSame(5000, $line->debit_cents);
        $this->assertSame(0, $line->credit_cents);
    }
}
