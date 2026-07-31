<?php

namespace Tests\Unit;

use App\Storefront\Models\PayoutRequest;
use App\Storefront\PayoutRequestService;
use Tests\TestCase;

class DigitalProductFinanceTest extends TestCase
{
    public function testPayoutStateMachineOnlyAllowsSafeTransitions(): void
    {
        $this->assertTrue(PayoutRequestService::canTransition('requested', 'processing'));
        $this->assertTrue(PayoutRequestService::canTransition('requested', 'rejected'));
        $this->assertTrue(PayoutRequestService::canTransition('processing', 'paid'));
        $this->assertFalse(PayoutRequestService::canTransition('requested', 'paid'));
        $this->assertFalse(PayoutRequestService::canTransition('paid', 'processing'));
        $this->assertFalse(PayoutRequestService::canTransition('rejected', 'paid'));
    }

    public function testPayoutDestinationIsHiddenAndEncrypted(): void
    {
        $payout = new PayoutRequest(['payout_destination' => '0912345678']);

        $this->assertArrayNotHasKey('payout_destination', $payout->toArray());
        $this->assertSame('0912345678', $payout->payout_destination);
    }
}
