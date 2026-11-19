<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Payments\Chapa\LinketChapaManager;
use RuntimeException;

/**
 * Chapa v1 payout gate. Test credentials may dispatch sandbox transfers without
 * ever unlocking the separate live-money switch.
 */
final class ChapaV1PayoutMode
{
    public function __construct(private readonly ?LinketChapaManager $manager = null) {}

    public function mode(): string
    {
        $secret = ($this->manager ?? app(LinketChapaManager::class))->platformSecret();
        if ($secret === '') {
            return 'unconfigured';
        }

        if (str_starts_with($secret, 'CHASECK_TEST-')) {
            return 'test';
        }

        return str_starts_with($secret, 'CHASECK-') ? 'live' : 'unconfigured';
    }

    public function enabled(): bool
    {
        return match ($this->mode()) {
            'test' => (bool) config('services.chapa.test_payouts_enabled', true),
            'live' => (bool) config('services.chapa.payouts_enabled', false),
            default => false,
        };
    }

    public function approvalConfigured(): bool
    {
        return app(ChapaTransferApprovalSecret::class)->current($this->mode()) !== '';
    }

    public function assertDispatchReady(): void
    {
        if (!$this->enabled()) {
            throw new RuntimeException('Chapa payout dispatch is disabled for the configured merchant mode.');
        }
        if (!$this->approvalConfigured()) {
            throw new RuntimeException('Configure the Chapa transfer approval secret before dispatch.');
        }
        // Validate any requested test outcome *before* creating/submitting an intent.
        $this->withTestStatus([]);
    }

    /** @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function withTestStatus(array $payload): array
    {
        if ($this->mode() !== 'test') {
            return $payload;
        }

        $status = strtolower(trim((string) config('services.chapa.test_transfer_status', '')));
        if ($status === '') {
            return $payload;
        }
        if (!in_array($status, ['success', 'failed', 'pending'], true)) {
            throw new RuntimeException('Invalid Chapa sandbox transfer status.');
        }

        return [...$payload, 'status' => $status];
    }

    /** @return array{mode: string, enabled: bool, approval_configured: bool, test_only: bool} */
    public function status(): array
    {
        $mode = $this->mode();

        return [
            'mode' => $mode,
            'enabled' => $this->enabled(),
            'approval_configured' => $this->approvalConfigured(),
            'test_only' => $mode === 'test',
        ];
    }
}
