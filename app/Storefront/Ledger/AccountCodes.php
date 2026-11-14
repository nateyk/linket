<?php

namespace App\Storefront\Ledger;

final class AccountCodes
{
    // Platform Clearing & Asset Accounts
    public const PLATFORM_CHAPA_CLEARING = '1010_PLATFORM_CHAPA_CLEARING';
    public const PLATFORM_BANK_DISBURSED = '1020_PLATFORM_BANK_DISBURSED';
    public const CREATOR_DEFICIT_RECEIVABLE = '1030_CREATOR_DEFICIT_RECEIVABLE';

    // Creator Liability Accounts
    public const CREATOR_HELD = '2010_CREATOR_HELD';
    public const CREATOR_AVAILABLE = '2020_CREATOR_AVAILABLE';
    public const CREATOR_RESERVED = '2030_CREATOR_RESERVED';

    // Platform Revenue Accounts
    public const PLATFORM_COMMISSION = '4010_PLATFORM_COMMISSION';

    // Platform Expense Accounts
    public const GATEWAY_PROCESSING_FEES = '5010_GATEWAY_PROCESSING_FEES';

    public static function all(): array
    {
        return [
            self::PLATFORM_CHAPA_CLEARING,
            self::PLATFORM_BANK_DISBURSED,
            self::CREATOR_DEFICIT_RECEIVABLE,
            self::CREATOR_HELD,
            self::CREATOR_AVAILABLE,
            self::CREATOR_RESERVED,
            self::PLATFORM_COMMISSION,
            self::GATEWAY_PROCESSING_FEES,
        ];
    }
}
