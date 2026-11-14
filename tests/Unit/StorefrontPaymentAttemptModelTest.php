<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use Tests\TestCase;

class StorefrontPaymentAttemptModelTest extends TestCase
{
    public function testStatusConstantsAreDefined(): void
    {
        $this->assertSame('created', StorefrontPaymentAttempt::STATUS_CREATED);
        $this->assertSame('initializing', StorefrontPaymentAttempt::STATUS_INITIALIZING);
        $this->assertSame('pending', StorefrontPaymentAttempt::STATUS_PENDING);
        $this->assertSame('successful', StorefrontPaymentAttempt::STATUS_SUCCESSFUL);
        $this->assertSame('failed', StorefrontPaymentAttempt::STATUS_FAILED);
        $this->assertSame('expired', StorefrontPaymentAttempt::STATUS_EXPIRED);
    }

    public function testCastsAndAccessors(): void
    {
        $attempt = new StorefrontPaymentAttempt([
            'amount_cents' => '15000',
            'verified_at' => '2026-11-14 20:00:00',
            'verification_data' => ['provider' => 'chapa', 'fee' => 0],
        ]);

        $this->assertSame(15000, $attempt->amount_cents);
        $this->assertInstanceOf(\Carbon\CarbonInterface::class, $attempt->verified_at);
        $this->assertSame(['provider' => 'chapa', 'fee' => 0], $attempt->verification_data);
    }

    public function testStatusHelperMethods(): void
    {
        $pending = new StorefrontPaymentAttempt(['status' => StorefrontPaymentAttempt::STATUS_PENDING]);
        $this->assertTrue($pending->isPending());
        $this->assertFalse($pending->isSuccessful());

        $initializing = new StorefrontPaymentAttempt(['status' => StorefrontPaymentAttempt::STATUS_INITIALIZING]);
        $this->assertTrue($initializing->isPending());

        $successful = new StorefrontPaymentAttempt(['status' => StorefrontPaymentAttempt::STATUS_SUCCESSFUL]);
        $this->assertTrue($successful->isSuccessful());
        $this->assertFalse($successful->isPending());

        $failed = new StorefrontPaymentAttempt(['status' => StorefrontPaymentAttempt::STATUS_FAILED]);
        $this->assertTrue($failed->isFailed());
        $this->assertFalse($failed->isSuccessful());

        $expired = new StorefrontPaymentAttempt(['status' => StorefrontPaymentAttempt::STATUS_EXPIRED]);
        $this->assertTrue($expired->isExpired());
    }

    public function testOrderRelationshipConfigured(): void
    {
        $attempt = new StorefrontPaymentAttempt();
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\BelongsTo::class, $attempt->order());

        $order = new StorefrontOrder();
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\HasMany::class, $order->paymentAttempts());
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\HasOne::class, $order->latestPaymentAttempt());
    }
}
