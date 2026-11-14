<?php

declare(strict_types=1);

namespace App\Payments\Chapa;

use Common\Settings\Settings;
use Nateyk\Chapa\ChapaClient;
use Nateyk\Chapa\Http\Transport;
use RuntimeException;

class LinketChapaManager
{
    private ?ChapaClient $mockClient = null;
    private ?Transport $customTransport = null;

    public function __construct(
        private readonly ?Settings $settings = null,
    ) {
    }

    public function isEnabled(): bool
    {
        $settings = $this->settings ?? app(Settings::class);
        $enabled = (bool) ($settings->get('billing.chapa.enable') ?? config('services.chapa.enabled', true));

        return $enabled && filled($this->platformSecret());
    }

    public function platformSecret(): string
    {
        $settings = $this->settings ?? app(Settings::class);
        $stored = $settings->get('billing.chapa.secret_key');

        return filled($stored) ? (string) $stored : (string) config('services.chapa.secret', '');
    }

    public function webhookSecret(): ?string
    {
        $settings = $this->settings ?? app(Settings::class);

        return $settings->get('billing.chapa.webhook_secret')
            ?: config('services.chapa.webhook_secret');
    }

    public function platformClient(): ChapaClient
    {
        if ($this->mockClient !== null) {
            return $this->mockClient;
        }

        $secret = $this->platformSecret();
        if (blank($secret)) {
            throw new RuntimeException('Linket platform Chapa merchant secret is not configured.');
        }

        return $this->clientForSecret($secret, $this->webhookSecret());
    }

    public function clientForSecret(string $privateKey, ?string $webhookSecret = null): ChapaClient
    {
        $baseUrl = (string) config('services.chapa.base_url', 'https://api.chapa.global');
        $timeout = (int) config('services.chapa.timeout', 15);

        return new ChapaClient(
            privateKey: $privateKey,
            publicKey: null,
            webhookSecret: $webhookSecret ?? $this->webhookSecret(),
            transport: $this->customTransport,
            baseUrl: $baseUrl,
            timeout: $timeout,
        );
    }

    public function swapClient(?ChapaClient $client): void
    {
        $this->mockClient = $client;
    }

    public function setTransport(?Transport $transport): void
    {
        $this->customTransport = $transport;
    }
}
