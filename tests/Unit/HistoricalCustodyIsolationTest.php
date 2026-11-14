<?php

namespace Tests\Unit;

use App\Storefront\DigitalProductFinance;
use App\Storefront\Ledger\CreatorLedgerService;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DigitalProductEarningsLedger;
use App\Storefront\Models\StorefrontOrder;
use Tests\TestCase;

class HistoricalCustodyIsolationTest extends TestCase
{
    public function testHistoricalOrdersWithoutPlatformCollectionDoNotPostPlatformLiabilities(): void
    {
        $creatorLedgerMock = $this->createMock(CreatorLedgerService::class);
        $creatorLedgerMock->expects($this->never())->method('recordPlatformSale');

        $finance = new DigitalProductFinance($creatorLedgerMock);

        $order = new StorefrontOrder([
            'id' => 999,
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_CREATOR_CHAPA,
            'payment_gateway' => 'chapa',
            'status' => 'paid',
            'currency' => 'ETB',
            'creator_earnings_cents' => 50000,
        ]);

        $result = $finance->creditOrder($order);
        $this->assertNull($result);
    }

    public function testHistoricalVerifyEtOrdersDoNotPostPlatformLiabilities(): void
    {
        $creatorLedgerMock = $this->createMock(CreatorLedgerService::class);
        $creatorLedgerMock->expects($this->never())->method('recordPlatformSale');

        $finance = new DigitalProductFinance($creatorLedgerMock);

        $order = new StorefrontOrder([
            'id' => 888,
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_VERIFY_ET_CREATOR,
            'payment_gateway' => 'verify_et',
            'status' => 'paid',
            'currency' => 'ETB',
            'creator_earnings_cents' => 30000,
        ]);

        $result = $finance->creditOrder($order);
        $this->assertNull($result);
    }

    public function testPlatformChapaOrderInvokesCreatorLedger(): void
    {
        $creatorLedgerMock = $this->createMock(CreatorLedgerService::class);
        $creatorLedgerMock->expects($this->once())
            ->method('recordPlatformSale')
            ->with($this->callback(function (StorefrontOrder $order) {
                return $order->id === 123 && $order->collection_owner === StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA;
            }));

        $finance = $this->getMockBuilder(DigitalProductFinance::class)
            ->setConstructorArgs([$creatorLedgerMock])
            ->onlyMethods(['record'])
            ->getMock();

        $finance->method('record')->willReturn(new DigitalProductEarningsLedger());

        $product = new DigitalProduct(['workspace_id' => 1]);
        $order = new StorefrontOrder([
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA,
            'payment_gateway' => 'chapa',
            'status' => 'paid',
            'currency' => 'ETB',
            'gross_amount_cents' => 10000,
            'creator_earnings_cents' => 9000,
            'platform_fee_cents' => 1000,
        ]);
        $order->id = 123;
        $order->creator_id = 42;
        $order->setRelation('product', $product);

        $result = $finance->creditOrder($order);
        $this->assertInstanceOf(DigitalProductEarningsLedger::class, $result);
    }
}
