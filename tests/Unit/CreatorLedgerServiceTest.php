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
    public function testPayoutLifecycleTransitions(
        string $method,
        string $expectedEventType,
        string $expectedFromAccount,
        string $expectedToAccount,
        array $extraArgs,
    ): void {
        $postingServiceMock = $this->createMock(JournalPostingService::class);
        $postingServiceMock->expects($this->once())
            ->method('post')
            ->with(
                $this->callback(fn (JournalEntryData $entry) =>
                    $entry->sourceType === 'payout'
                    && $entry->sourceId === 5
                    && $entry->eventType === $expectedEventType
                ),
                $this->callback(function (array $lines) use ($expectedFromAccount, $expectedToAccount) {
                    $this->assertSame($expectedFromAccount, $lines[0]->accountCode);
                    $this->assertSame(50000, $lines[0]->debitCents);

                    $this->assertSame($expectedToAccount, $lines[1]->accountCode);
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

        $result = $service->$method($payout, ...$extraArgs);
        $this->assertInstanceOf(StorefrontJournalEntry::class, $result);
    }

    public static function payoutLifecycleProvider(): array
    {
        return [
            'reserve' => ['reserveForPayout', 'withdrawal_reserved', AccountCodes::CREATOR_AVAILABLE, AccountCodes::CREATOR_RESERVED, [50000]],
            'release' => ['releasePayoutReservation', 'withdrawal_released', AccountCodes::CREATOR_RESERVED, AccountCodes::CREATOR_AVAILABLE, []],
            'disburse' => ['disbursePayout', 'withdrawal_disbursed', AccountCodes::CREATOR_RESERVED, AccountCodes::PLATFORM_BANK_DISBURSED, []],
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
            public function getBalances(int $creatorId, string $currency, ?int $workspaceId = null, bool $lock = false): array
            {
                return ['held' => 0, 'available' => 0, 'reserved' => 0, 'deficit' => 0, 'currency' => $currency];
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

        $result = $service->recordRefund($order, 10000, 9000, ['fee_reversal_cents' => 1000, 'refund_id' => 99]);
        $this->assertInstanceOf(StorefrontJournalEntry::class, $result);
    }
}
