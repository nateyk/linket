<?php

namespace Tests\Unit;

use App\Storefront\Ledger\AccountCodes;
use App\Storefront\Ledger\JournalEntryData;
use App\Storefront\Ledger\JournalLineData;
use App\Storefront\Ledger\JournalPostingService;
use App\Storefront\Ledger\Exceptions\UnbalancedJournalEntryException;
use App\Storefront\Ledger\Exceptions\InvalidJournalLineException;
use Tests\TestCase;

class JournalPostingServiceTest extends TestCase
{
    public function testAccountCodesAreDefined(): void
    {
        $this->assertSame('1010_PLATFORM_CHAPA_CLEARING', AccountCodes::PLATFORM_CHAPA_CLEARING);
        $this->assertSame('1020_PLATFORM_BANK_DISBURSED', AccountCodes::PLATFORM_BANK_DISBURSED);
        $this->assertSame('1030_CREATOR_DEFICIT_RECEIVABLE', AccountCodes::CREATOR_DEFICIT_RECEIVABLE);
        $this->assertSame('2010_CREATOR_HELD', AccountCodes::CREATOR_HELD);
        $this->assertSame('2020_CREATOR_AVAILABLE', AccountCodes::CREATOR_AVAILABLE);
        $this->assertSame('2030_CREATOR_RESERVED', AccountCodes::CREATOR_RESERVED);
        $this->assertSame('4010_PLATFORM_COMMISSION', AccountCodes::PLATFORM_COMMISSION);
    }

    public function testRejectsUnbalancedJournalEntry(): void
    {
        $this->expectException(UnbalancedJournalEntryException::class);

        $service = new JournalPostingService();
        $entryData = new JournalEntryData(
            sourceType: 'order',
            sourceId: 1,
            eventType: 'sale_settled',
            currency: 'ETB',
            creatorId: 10,
            workspaceId: 2,
            description: 'Test sale',
        );

        $lines = [
            new JournalLineData(accountCode: AccountCodes::PLATFORM_CHAPA_CLEARING, debitCents: 10000, creditCents: 0, currency: 'ETB'),
            new JournalLineData(accountCode: AccountCodes::CREATOR_HELD, debitCents: 0, creditCents: 8000, currency: 'ETB'), // Missing 2000 commission!
        ];

        $service->validateBalanced($entryData, $lines);
    }

    public function testRejectsNegativeCentsOrSimultaneousDebitCredit(): void
    {
        $this->expectException(InvalidJournalLineException::class);

        $line = new JournalLineData(
            accountCode: AccountCodes::CREATOR_HELD,
            debitCents: 1000,
            creditCents: 1000,
            currency: 'ETB',
        );
        $line->validate();
    }

    public function testRejectsBothDebitAndCreditZero(): void
    {
        $this->expectException(InvalidJournalLineException::class);

        $line = new JournalLineData(
            accountCode: AccountCodes::CREATOR_HELD,
            debitCents: 0,
            creditCents: 0,
            currency: 'ETB',
        );
        $line->validate();
    }

    public function testRejectsCurrencyMismatchBetweenEntryAndLine(): void
    {
        $this->expectException(InvalidJournalLineException::class);

        $service = new JournalPostingService();
        $entryData = new JournalEntryData(
            sourceType: 'order',
            sourceId: 1,
            eventType: 'sale_settled',
            currency: 'ETB',
        );

        $lines = [
            new JournalLineData(accountCode: AccountCodes::PLATFORM_CHAPA_CLEARING, debitCents: 10000, creditCents: 0, currency: 'USD'),
            new JournalLineData(accountCode: AccountCodes::CREATOR_HELD, debitCents: 0, creditCents: 10000, currency: 'USD'),
        ];

        $service->validateBalanced($entryData, $lines);
    }

    public function testAcceptsValidBalancedJournalLines(): void
    {
        $service = new JournalPostingService();
        $entryData = new JournalEntryData(
            sourceType: 'order',
            sourceId: 1,
            eventType: 'sale_settled',
            currency: 'ETB',
        );

        $lines = [
            new JournalLineData(accountCode: AccountCodes::PLATFORM_CHAPA_CLEARING, debitCents: 10000, creditCents: 0, currency: 'ETB'),
            new JournalLineData(accountCode: AccountCodes::CREATOR_HELD, debitCents: 0, creditCents: 9000, currency: 'ETB'),
            new JournalLineData(accountCode: AccountCodes::PLATFORM_COMMISSION, debitCents: 0, creditCents: 1000, currency: 'ETB'),
        ];

        // Should not throw
        $service->validateBalanced($entryData, $lines);
        $this->assertTrue(true);
    }
}
