<?php

namespace App\Admin;

class ProductSettingsValidator
{
    const KEYS = ['product.min_price_cents', 'product.max_price_cents', 'product.allow_free_products', 'product.max_file_bytes'];

    public function fails($settings)
    {
        $min = $this->nonNegativeIntValue($settings, 'product.min_price_cents');
        $max = $this->nonNegativeIntValue($settings, 'product.max_price_cents');

        if ($min === false) {
            return ['client.product.min_price_cents' => 'Minimum price must be a positive number of cents.'];
        }

        if ($max === false) {
            return ['client.product.max_price_cents' => 'Maximum price must be a positive number of cents.'];
        }

        if ($min !== null && $max !== null && $min > $max) {
            return ['client.product.min_price_cents' => 'Minimum price may not be greater than maximum price.'];
        }

        $bytes = $this->nonNegativeIntValue($settings, 'product.max_file_bytes');
        if ($bytes === false || $bytes === 0) {
            return ['client.product.max_file_bytes' => 'Maximum file size must be at least 1 byte, or empty for no limit.'];
        }
    }

    private function nonNegativeIntValue(array $settings, string $key): int|null|false
    {
        $value = array_key_exists($key, $settings)
            ? $settings[$key]
            : settings()->get($key);

        if ($value === null || $value === '') {
            return null;
        }

        if (is_bool($value)) {
            return $value ? 1 : 0;
        }

        if (!is_numeric($value) || (int) $value < 0) {
            return false;
        }

        return (int) $value;
    }
}
