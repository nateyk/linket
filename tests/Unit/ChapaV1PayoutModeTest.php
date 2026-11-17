<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Payments\Chapa\LinketChapaManager;
use App\Storefront\Services\ChapaV1PayoutMode;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class ChapaV1PayoutModeTest extends TestCase
{
    private function gate(string $secret): ChapaV1PayoutMode
    {
        $manager = Mockery::mock(LinketChapaManager::class);
        $manager->shouldReceive('platformSecret')->andReturn($secret);

        return new ChapaV1PayoutMode($manager);
    }

    public function testTestKeyActivatesSandboxWithoutLiveSwitch(): void
    {
        config()->set('services.chapa.test_payouts_enabled', true);
        config()->set('services.chapa.payouts_enabled', false);
        config()->set('services.chapa.transfer_approval_secret', 'fake-test-approval-secret');

        $mode = $this->gate('CHASECK_TEST-local-fixture');
        $this->assertSame('test', $mode->mode());
        $this->assertTrue($mode->enabled());
        $this->assertSame([
            'mode' => 'test',
            'enabled' => true,
            'approval_configured' => true,
            'test_only' => true,
        ], $mode->status());
        $mode->assertDispatchReady();
    }

    public function testLiveKeyCannotUseSandboxSwitch(): void
    {
        config()->set('services.chapa.test_payouts_enabled', true);
        config()->set('services.chapa.payouts_enabled', false);
        config()->set('services.chapa.transfer_approval_secret', 'fake-approval-secret');

        $mode = $this->gate('CHASECK-live-fixture');
        $this->assertSame('live', $mode->mode());
        $this->assertFalse($mode->enabled());
        $this->expectException(RuntimeException::class);
        $mode->assertDispatchReady();
    }

    public function testTestKeyCanBeDisabledWithoutChangingLiveSetting(): void
    {
        config()->set('services.chapa.test_payouts_enabled', false);
        config()->set('services.chapa.payouts_enabled', true);
        config()->set('services.chapa.transfer_approval_secret', 'fake-approval-secret');
        $mode = $this->gate('CHASECK_TEST-local-fixture');

        $this->assertFalse($mode->enabled());
        $this->expectException(RuntimeException::class);
        $mode->assertDispatchReady();
    }

    public function testMissingApprovalSecretBlocksSandboxTransfer(): void
    {
        config()->set('services.chapa.test_payouts_enabled', true);
        config()->set('services.chapa.payouts_enabled', false);
        config()->set('services.chapa.transfer_approval_secret', '');
        $mode = $this->gate('CHASECK_TEST-local-fixture');

        $this->assertTrue($mode->enabled());
        $this->assertFalse($mode->approvalConfigured());
        $this->expectException(RuntimeException::class);
        $mode->assertDispatchReady();
    }

    public function testSandboxStatusSimulationIsOnlyAddedForTestKeys(): void
    {
        config()->set('services.chapa.test_transfer_status', 'failed');
        $payload = ['reference' => 'test-reference', 'amount' => '1.00'];

        $this->assertSame('failed', $this->gate('CHASECK_TEST-fixture')->withTestStatus($payload)['status']);
        $this->assertSame($payload, $this->gate('CHASECK-live-fixture')->withTestStatus($payload));
        $this->assertSame($payload, $this->gate('')->withTestStatus($payload));
    }

    public function testUnsupportedSandboxStatusIsRejected(): void
    {
        config()->set('services.chapa.test_transfer_status', 'paid');
        $this->expectException(RuntimeException::class);
        $this->gate('CHASECK_TEST-fixture')->withTestStatus(['reference' => 'test']);
    }

    public function testMissingKeyCannotDispatchWithTestSwitch(): void
    {
        config()->set('services.chapa.test_payouts_enabled', true);
        config()->set('services.chapa.payouts_enabled', true);
        $mode = $this->gate('');

        $this->assertSame('unconfigured', $mode->mode());
        $this->assertFalse($mode->enabled());
    }
}
