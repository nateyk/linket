<?php

declare(strict_types=1);

namespace App\Payments\Chapa;

use Common\Settings\Settings;

/**
 * Separate, encrypted merchant credentials for the actual Chapa v1 adapter.
 * This is not the v2 API: v2 credentials must not be sent to v1 endpoints.
 */
final class ChapaMerchantProfiles
{
    public const MODES = ['test', 'live'];

    public function __construct(private readonly ?Settings $settings = null) {}

    private function setting(string $key, mixed $default = null): mixed
    {
        return ($this->settings ?? app(Settings::class))->get($key, $default);
    }

    public static function modeForSecret(string $key): string
    {
        if (str_starts_with($key, 'CHASECK_TEST-')) {
            return 'test';
        }

        return str_starts_with($key, 'CHASECK-') ? 'live' : 'unconfigured';
    }

    public static function key(string $mode, string $field): string
    {
        return 'billing.chapa.profile.'.$mode.'.'.$field;
    }

    public function activeMode(): string
    {
        $selected = (string) $this->setting('billing.chapa.active_mode', '');
        if (in_array($selected, self::MODES, true)) {
            return $selected;
        }

        return self::modeForSecret($this->legacySecret());
    }

    public function credential(string $mode, string $field): string
    {
        if (!in_array($mode, self::MODES, true) || !in_array($field, ['public_key', 'secret_key', 'webhook_secret'], true)) {
            return '';
        }

        $stored = $this->setting(self::key($mode, $field));
        if (is_string($stored) && $stored !== '') {
            return $stored;
        }

        // One-time backward compatibility for the former single-credential setup.
        if (self::modeForSecret($this->legacySecret()) !== $mode) {
            return '';
        }
        return match ($field) {
            'secret_key' => $this->legacySecret(),
            'public_key' => (string) $this->setting('billing.chapa.public_key', ''),
            'webhook_secret' => (string) ($this->setting('billing.chapa.webhook_secret')
                ?: config('services.chapa.webhook_secret', '')),
        };
    }

    public function active(string $field): string
    {
        return $this->credential($this->activeMode(), $field);
    }

    /** @return array{mode: string, configured: bool, webhook_configured: bool, approval_configured: bool, public_key_masked: ?string} */
    public function summary(string $mode): array
    {
        $key = $this->credential($mode, 'secret_key');
        $publicKey = $this->credential($mode, 'public_key');

        return [
            'mode' => $mode,
            'configured' => self::modeForSecret($key) === $mode && $publicKey !== '',
            'webhook_configured' => $this->credential($mode, 'webhook_secret') !== '',
            'approval_configured' => app(\App\Storefront\Services\ChapaTransferApprovalSecret::class)->forMode($mode) !== '',
            'public_key_masked' => $publicKey === '' ? null : '••••'.substr($publicKey, -4),
        ];
    }

    private function legacySecret(): string
    {
        $stored = $this->setting('billing.chapa.secret_key');

        return is_string($stored) && $stored !== ''
            ? $stored : (string) config('services.chapa.secret', '');
    }
}
