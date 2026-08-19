<?php

namespace Tests\Unit;

use App\Payments\ChapaWebhookDeliveryLogger;
use App\Payments\Jobs\SendAdminMailTest;
use App\Payments\Notifications\ChapaRenewalReminder;
use App\Storefront\Jobs\SendStorefrontReceipt;
use Common\Billing\Subscription;
use ReflectionMethod;
use Tests\TestCase;

class PaymentOperationsTest extends TestCase
{
    public function testReceiptAndAdminMailJobsUseTheMailQueueWithRetries(): void
    {
        $receipt = new SendStorefrontReceipt(1);
        $testEmail = new SendAdminMailTest('admin@example.test', 'Admin');

        $this->assertSame('mail', $receipt->queue);
        $this->assertSame('mail', $testEmail->queue);
        $this->assertSame(3, $receipt->tries);
        $this->assertSame([60, 300, 900], $testEmail->backoff);
    }

    public function testRenewalNotificationsRouteMailSeparatelyFromDatabaseNotifications(): void
    {
        $notification = new ChapaRenewalReminder(new Subscription(), 7);

        $this->assertSame([
            'mail' => 'mail',
            'database' => 'default',
        ], $notification->viaQueues());
        $this->assertSame(3, $notification->tries);
    }

    public function testWebhookTelemetryOnlyKeepsSafeReferencesAndReasons(): void
    {
        $logger = new ChapaWebhookDeliveryLogger();
        $reference = new ReflectionMethod($logger, 'sanitizeReference');
        $reason = new ReflectionMethod($logger, 'sanitizeReason');

        $this->assertSame('linket_abc-123', $reference->invoke($logger, 'linket_abc-123<>'));
        $this->assertNull($reference->invoke($logger, '<>'));
        $this->assertSame('amount_mismatch', $reason->invoke($logger, 'amount_mismatch'));
        $this->assertNull($reason->invoke($logger, 'customer@example.test'));
    }
}
