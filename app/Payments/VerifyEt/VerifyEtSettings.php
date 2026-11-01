<?php

namespace App\Payments\VerifyEt;

use Common\Settings\Settings;

final class VerifyEtSettings
{
    public const KEY = 'billing.verify_et';

    public static function get(string $key, mixed $default = null): mixed
    {
        $saved = (new Settings())->get(self::KEY, []);

        return array_key_exists($key, $saved) ? $saved[$key] : config("services.verify_et.{$key}", $default);
    }
}
