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
        if ($mode === null) {
            $key = app(LinketChapaManager::class)->platformSecret();
            $mode = str_starts_with($key, 'CHASECK_TEST-')
                ? 'test'
                : (str_starts_with($key, 'CHASECK-') ? 'live' : 'unconfigured');
        }
        if (!in_array($mode, ['test', 'live'], true)) {
            return '';
        }

        $stored = app(Settings::class)->get(self::settingKey($mode));
        if (is_string($stored) && $stored !== '') {
            return $stored;
        }

        // Preserve existing cPanel installations using an environment-only secret.
        return (string) config('services.chapa.transfer_approval_secret', '');
    }
}
