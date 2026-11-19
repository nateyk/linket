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
    public const TEST = 'test';
    public const LIVE = 'live';
    public const UNCONFIGURED = 'unconfigured';
    public const PUBLIC_KEY = 'public_key';
    public const SECRET_KEY = 'secret_key';
    public const WEBHOOK_SECRET = 'webhook_secret';
    public const MODES = [self::TEST, self::LIVE];
    private const FIELDS = [self::PUBLIC_KEY, self::SECRET_KEY, self::WEBHOOK_SECRET];

    public function __construct(private readonly ?Settings $settings = null) {}

    private function setting(string $key, mixed $default = null): mixed
    {
        return ($this->settings ?? app(Settings::class))->get($key, $default);
    }

    public static function modeForSecret(string $key): string
    {
        if (str_starts_with($key, 'CHASECK_TEST-')) {
            return self::TEST;
        }

        return str_starts_with($key, 'CHASECK-') ? self::LIVE : self::UNCONFIGURED;
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
        if (!in_array($mode, self::MODES, true)) {
            return '';
        }
        if (!in_array($field, self::FIELDS, true)) {
            return '';
        }

        $stored = $this->setting(self::key($mode, $field));
        if (is_string($stored) && $stored !== '') {
            return $stored;
        }

        return $this->legacyCredential($mode, $field);
    }

    private function legacyCredential(string $mode, string $field): string
    {
        if (self::modeForSecret($this->legacySecret()) !== $mode) {
            return '';
        }
        if ($this->rotatedMerchant($mode)) {
            return '';
        }

        return match ($field) {
            self::SECRET_KEY => $this->legacySecret(),
            self::PUBLIC_KEY => (string) $this->setting('billing.chapa.public_key', ''),
            self::WEBHOOK_SECRET => (string) ($this->setting('billing.chapa.webhook_secret')
                ?: config('services.chapa.webhook_secret', '')),
        };
    }

    private function rotatedMerchant(string $mode): bool
    {
        $saved = $this->setting(self::key($mode, self::SECRET_KEY));
        if (!is_string($saved) || $saved === '') {
            return false;
        }

        return !hash_equals($this->legacySecret(), $saved);
    }

    public function active(string $field): string
    {
        return $this->credential($this->activeMode(), $field);
    }

    /** @return array{mode: string, configured: bool, webhook_configured: bool, approval_configured: bool, public_key_masked: ?string} */
    public function summary(string $mode): array
    {
        $key = $this->credential($mode, self::SECRET_KEY);
        $publicKey = $this->credential($mode, self::PUBLIC_KEY);

        return [
            'mode' => $mode,
            'configured' => self::modeForSecret($key) === $mode && $publicKey !== '',
            'webhook_configured' => $this->credential($mode, self::WEBHOOK_SECRET) !== '',
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
