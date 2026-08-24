<?php

namespace Tests\Unit;

use Common\Billing\Subscription;
use Tests\TestCase;

class SubscriptionFactoryTest extends TestCase
{
    public function testFactoryBuildsStatesWithoutFaker(): void
    {
        $active = Subscription::factory()->active()->make();
        $this->assertSame('active', $active->gateway_status);
        $this->assertNotNull($active->renews_at);

        $trialing = Subscription::factory()->trialing()->make();
        $this->assertSame('trialing', $trialing->gateway_status);
        $this->assertNotNull($trialing->trial_ends_at);

        $incomplete = Subscription::factory()->incomplete()->make();
        $this->assertSame('incomplete', $incomplete->gateway_status);
        $this->assertNotNull($incomplete->ends_at);
    }
}
