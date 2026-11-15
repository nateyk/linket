<?php

namespace Tests\Unit;

use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Ledger\Exceptions\InsufficientBalanceException;
use App\Storefront\Ledger\JournalEntryData;
use App\Storefront\Ledger\JournalPostingService;
use App\Storefront\Models\PayoutRequest;
use App\Storefront\Models\StorefrontJournalEntry;
use App\Storefront\Models\StorefrontOrder;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CreatorLedgerServiceTest extends TestCase
{
    public function testIgnoresNonPlatformChapaOrdersForPlatformLiabilities(): void
    {
        $postingServiceMock = $this->createMock(JournalPostingService::class);
        $postingServiceMock->expects($this->never())->method('post');

        $service = new CreatorLedgerService($postingServiceMock);

        $creatorChapaOrder = new StorefrontOrder([
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_CREATOR_CHAPA,
            'status' => 'paid',
        ]);

        $this->assertNull($service->recordPlatformSale($creatorChapaOrder));

        $verifyEtOrder = new StorefrontOrder([
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_VERIFY_ET_CREATOR,
            'status' => 'paid',
        ]);

        $this->assertNull($service->recordPlatformSale($verifyEtOrder));
    }

    public function testRecordsPlatformSaleWithBalancedLines(): void
    {
        $postingServiceMock = $this->createMock(JournalPostingService::class);
        $postingServiceMock->expects($this->once())
            ->method('post')
            ->with(
                $this->callback(function (JournalEntryData $entry) {
                    return $entry->sourceType === 'order'
                        && $entry->sourceId === 101
                        && $entry->eventType === 'sale_settled'
                        && $entry->currency === 'ETB'
                        && $entry->creatorId === 42;
                }),
                $this->callback(function (array $lines) {
                    $this->assertCount(3, $lines);
                    $this->assertSame(AccountCodes::PLATFORM_CHAPA_CLEARING, $lines[0]->accountCode);
                    $this->assertSame(100000, $lines[0]->debitCents);
                    $this->assertSame(0, $lines[0]->creditCents);

                    $this->assertSame(AccountCodes::CREATOR_HELD, $lines[1]->accountCode);
                    $this->assertSame(0, $lines[1]->debitCents);
                    $this->assertSame(90000, $lines[1]->creditCents);

                    $this->assertSame(AccountCodes::PLATFORM_COMMISSION, $lines[2]->accountCode);
                    $this->assertSame(0, $lines[2]->debitCents);
                    $this->assertSame(10000, $lines[2]->creditCents);

                    return true;
                })
            )
            ->willReturn(new StorefrontJournalEntry());

        $service = new CreatorLedgerService($postingServiceMock);

        $order = new StorefrontOrder([
            'id' => 101,
            'creator_id' => 42,
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA,
            'currency' => 'ETB',
            'gross_amount_cents' => 100000,
            'creator_earnings_cents' => 90000,
            'platform_fee_cents' => 10000,
            'status' => 'paid',
        ]);

        $result = $service->recordPlatformSale($order);
        $this->assertInstanceOf(StorefrontJournalEntry::class, $result);
    }

    public function testReserveForPayoutThrowsWhenExceedingAvailableBalance(): void
    {
        $postingServiceMock = $this->createMock(JournalPostingService::class);
        $service = new CreatorLedgerService($postingServiceMock);

        $payout = new PayoutRequest([
            'creator_id' => 42,
            'amount_cents' => 100000,
            'currency' => 'ETB',
        ]);
        $payout->id = 1;

        $this->expectException(InsufficientBalanceException::class);
        $service->reserveForPayout($payout, availableBalance: 50000);
    }

    #[DataProvider('payoutLifecycleProvider')]
    public function testPayoutLifecycleTransitions(array $spec): void
    {
        $postingServiceMock = $this->createMock(JournalPostingService::class);
        $postingServiceMock->expects($this->once())
            ->method('post')
            ->with(
                $this->callback(fn (JournalEntryData $entry) =>
                    $entry->sourceType === 'payout'
                    && $entry->sourceId === 5
                    && $entry->eventType === $spec['event']
                ),
                $this->callback(function (array $lines) use ($spec) {
                    $this->assertSame($spec['from'], $lines[0]->accountCode);
                    $this->assertSame(50000, $lines[0]->debitCents);

                    $this->assertSame($spec['to'], $lines[1]->accountCode);
                    $this->assertSame(50000, $lines[1]->creditCents);

                    return true;
                })
            )
            ->willReturn(new StorefrontJournalEntry());

        $service = new CreatorLedgerService($postingServiceMock);

        $payout = new PayoutRequest([
            'creator_id' => 42,
            'amount_cents' => 50000,
            'currency' => 'ETB',
        ]);
        $payout->id = 5;

        $method = $spec['method'];
        $extraArgs = $spec['args'] ?? [];
        $result = $service->$method($payout, ...$extraArgs);
        $this->assertInstanceOf(StorefrontJournalEntry::class, $result);
    }

    public static function payoutLifecycleProvider(): array
    {
        return [
            'reserve' => [[
                'method' => 'reserveForPayout',
                'event' => 'withdrawal_reserved',
                'from' => AccountCodes::CREATOR_AVAILABLE,
                'to' => AccountCodes::CREATOR_RESERVED,
                'args' => [50000],
            ]],
            'release' => [[
                'method' => 'releasePayoutReservation',
                'event' => 'withdrawal_released',
                'from' => AccountCodes::CREATOR_RESERVED,
                'to' => AccountCodes::CREATOR_AVAILABLE,
                'args' => [],
            ]],
            'disburse' => [[
                'method' => 'disbursePayout',
                'event' => 'withdrawal_disbursed',
                'from' => AccountCodes::CREATOR_RESERVED,
                'to' => AccountCodes::PLATFORM_BANK_DISBURSED,
                'args' => [],
            ]],
        ];
    }

    public function testRecordRefundRoutesShortageToDeficitReceivableWhenBalanceZero(): void
    {
        $postingServiceMock = $this->createMock(JournalPostingService::class);
        $postingServiceMock->expects($this->once())
            ->method('post')
            ->with(
                $this->callback(function (JournalEntryData $entry) {
                    return $entry->sourceType === 'refund'
                        && $entry->sourceId === 99
                        && $entry->eventType === 'refund_executed';
                }),
                $this->callback(function (array $lines) {
                    $this->assertCount(3, $lines);
                    $this->assertSame(AccountCodes::PLATFORM_COMMISSION, $lines[0]->accountCode);
                    $this->assertSame(1000, $lines[0]->debitCents);

                    $this->assertSame(AccountCodes::CREATOR_DEFICIT_RECEIVABLE, $lines[1]->accountCode);
                    $this->assertSame(9000, $lines[1]->debitCents);

                    $this->assertSame(AccountCodes::PLATFORM_CHAPA_CLEARING, $lines[2]->accountCode);
                    $this->assertSame(10000, $lines[2]->creditCents);

                    return true;
                })
            )
            ->willReturn(new StorefrontJournalEntry());

        $service = new class($postingServiceMock) extends CreatorLedgerService {
            public function getBalances(\App\Storefront\Ledger\BalanceQuery $query): array
            {
                return ['held' => 0, 'available' => 0, 'reserved' => 0, 'deficit' => 0, 'currency' => $query->currency];
            }
        };

        $order = new StorefrontOrder([
            'id' => 99,
            'creator_id' => 42,
            'currency' => 'ETB',
            'gross_amount_cents' => 10000,
            'creator_earnings_cents' => 9000,
            'platform_fee_cents' => 1000,
        ]);

        $breakdown = new \App\Storefront\Ledger\RefundBreakdown(
            grossCents: 10000,
            creatorCents: 9000,
            feeCents: 1000,
            refundId: 99,
        );

        $result = $service->recordRefund($order, $breakdown);
        $this->assertInstanceOf(StorefrontJournalEntry::class, $result);
    }
}
