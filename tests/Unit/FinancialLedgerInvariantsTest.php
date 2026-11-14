<?php

namespace Tests\Unit;

use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Ledger\Exceptions\InsufficientBalanceException;
use App\Storefront\Ledger\Exceptions\InvalidJournalLineException;
use App\Storefront\Ledger\Exceptions\UnbalancedJournalEntryException;
use App\Storefront\Ledger\JournalEntryData;
use App\Storefront\Ledger\JournalLineData;
use App\Storefront\Ledger\JournalPostingService;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontJournalEntry;
use App\Storefront\Models\StorefrontOrder;
use Tests\TestCase;

class FinancialLedgerInvariantsTest extends TestCase
{
    public function testDoubleEntryZeroSumRuleEnforced(): void
    {
        $service = new JournalPostingService();
        $this->expectException(UnbalancedJournalEntryException::class);
        $entryData = new JournalEntryData('order', 1, 'sale_settled', 'ETB');
        $lines = [
            new JournalLineData(AccountCodes::PLATFORM_CHAPA_CLEARING, 1000, 0, 'ETB'),
            new JournalLineData(AccountCodes::CREATOR_HELD, 0, 900, 'ETB'),
        ];
        $service->validateBalanced($entryData, $lines);
    }

    public function testMixedCurrencyMismatchesRejected(): void
    {
        $service = new JournalPostingService();
        $this->expectException(InvalidJournalLineException::class);
        $entryData = new JournalEntryData('order', 1, 'sale_settled', 'ETB');
        $lines = [
            new JournalLineData(AccountCodes::PLATFORM_CHAPA_CLEARING, 1000, 0, 'USD'),
            new JournalLineData(AccountCodes::CREATOR_HELD, 0, 1000, 'ETB'),
        ];
        $service->validateBalanced($entryData, $lines);
    }

    public function testNegativeBalancePreventedOnPayoutReservation(): void
    {
        $postingMock = $this->createMock(JournalPostingService::class);
        $service = new CreatorLedgerService($postingMock);

        $payout = new PayoutRequest([
            'creator_id' => 42,
            'amount_cents' => 100000,
            'currency' => 'ETB',
        ]);
        $payout->id = 1;

        $this->expectException(InsufficientBalanceException::class);
        $service->reserveForPayout($payout, availableBalance: 50000);
    }

    public function testExactIntegerCentsMaintainedAcrossLedgerCalculations(): void
    {
        $postingMock = $this->createMock(JournalPostingService::class);
        $postingMock->expects($this->once())
            ->method('post')
            ->with(
                $this->anything(),
                $this->callback(function (array $lines) {
                    // Check strict integer typing and values
                    foreach ($lines as $line) {
                        $this->assertIsInt($line->debitCents);
                        $this->assertIsInt($line->creditCents);
                        $this->assertGreaterThanOrEqual(0, $line->debitCents);
                        $this->assertGreaterThanOrEqual(0, $line->creditCents);
                    }
                    return true;
                })
            )
            ->willReturn(new StorefrontJournalEntry());

        $service = new CreatorLedgerService($postingMock);

        $order = new StorefrontOrder([
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA,
            'currency' => 'ETB',
            'gross_amount_cents' => 123456,
            'creator_earnings_cents' => 111110,
            'platform_fee_cents' => 12346,
            'status' => 'paid',
        ]);
        $order->id = 999;

        $service->recordPlatformSale($order);
    }

    public function testHistoricalOrderWithoutPlatformOwnerNeverPostsToPlatformLiabilities(): void
    {
        $postingMock = $this->createMock(JournalPostingService::class);
        $postingMock->expects($this->never())->method('post');

        $service = new CreatorLedgerService($postingMock);

        $order = new StorefrontOrder([
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_CREATOR_CHAPA,
            'currency' => 'ETB',
            'gross_amount_cents' => 50000,
            'creator_earnings_cents' => 50000,
            'platform_fee_cents' => 0,
            'status' => 'paid',
        ]);
        $order->id = 888;

        $result = $service->recordPlatformSale($order);
        $this->assertNull($result);
    }
}
