<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Payments\Chapa\LinketChapaManager;
use Common\Settings\Settings;

/** Read the approval secret only on the server, scoped to the merchant mode. */
final class ChapaTransferApprovalSecret
{
    public static function settingKey(string $mode): string
    {
        return 'billing.chapa.transfer_approval_secret.'.$mode;
    }

    public function current(?string $mode = null): string
    {
        $profiles = app(\App\Payments\Chapa\ChapaMerchantProfiles::class);
        return $this->forMode($mode ?? $profiles->activeMode());
    }

    public function forMode(string $mode): string
    {
        if (!in_array($mode, ['test', 'live'], true)) {
            return '';
        }

        $stored = app(Settings::class)->get(self::settingKey($mode));
        if (is_string($stored) && $stored !== '') {
            return $stored;
        }

        // Legacy environment fallback applies only to its original merchant mode.
        $legacyKey = (string) (app(Settings::class)->get('billing.chapa.secret_key')
            ?: config('services.chapa.secret', ''));
        if (\App\Payments\Chapa\ChapaMerchantProfiles::modeForSecret($legacyKey) !== $mode) {
            return '';
        }
        $profileKey = app(Settings::class)->get(\App\Payments\Chapa\ChapaMerchantProfiles::key(\App\Payments\Chapa\ChapaProfileMode::from($mode), \App\Payments\Chapa\ChapaProfileField::SecretKey));
        if (is_string($profileKey) && $profileKey !== '' && !hash_equals($legacyKey, $profileKey)) {
            return '';
        }

        return (string) config('services.chapa.transfer_approval_secret', '');
    }
}
