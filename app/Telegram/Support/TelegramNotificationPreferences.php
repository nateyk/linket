<?php

namespace App\Telegram\Support;

final class TelegramNotificationPreferences
{
    public const VERIFIED_SALES = 'verified_sales';
    public const SERVICE_INQUIRIES = 'service_inquiries';
    public const PRODUCT_MODERATION = 'product_moderation';
    public const PAYMENT_DISPUTES = 'payment_disputes';
    public const PRO_BILLING = 'pro_billing';
    public const RECEIVING_ACCOUNTS = 'receiving_accounts';
    public const FREE_SALES_QUOTA = 'free_sales_quota';
    public const PAYMENT_REVIEW = 'payment_review';

    /** @return list<string> */
    public static function keys(): array
    {
        return [
            self::VERIFIED_SALES,
            self::SERVICE_INQUIRIES,
            self::PRODUCT_MODERATION,
            self::PAYMENT_DISPUTES,
            self::PRO_BILLING,
            self::RECEIVING_ACCOUNTS,
            self::FREE_SALES_QUOTA,
            self::PAYMENT_REVIEW,
        ];
    }

    /** @return array<string, bool> */
    public static function defaults(): array
    {
        return array_fill_keys(self::keys(), true);
    }

    /**
     * @param  array<string, mixed>|null  $preferences
     * @return array<string, bool>
     */
    public static function normalize(?array $preferences): array
    {
        $normalized = self::defaults();

        foreach ($preferences ?? [] as $key => $enabled) {
            if (in_array($key, self::keys(), true) && is_bool($enabled)) {
                $normalized[$key] = $enabled;
            }
        }

        return $normalized;
    }

    /**
     * @param  array<string, mixed>|null  $preferences
     */
    public static function enabled(?array $preferences, string $key): bool
    {
        return self::normalize($preferences)[$key] ?? false;
    }
}
