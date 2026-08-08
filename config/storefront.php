<?php

return [
    'currency' => env('STOREFRONT_CURRENCY', 'etb'),
    'download_days' => 7,
    'download_limit' => 10,
    'payout_hold_days' => env('DIGITAL_PRODUCTS_PAYOUT_HOLD_DAYS', 7),
    'allowed_extensions' => [
        'pdf', 'zip', 'epub', 'mp3', 'wav', 'm4a', 'mp4', 'mov', 'png', 'jpg',
        'jpeg', 'webp', 'gif', 'svg', 'ttf', 'otf', 'woff', 'woff2', 'txt', 'csv',
    ],
    'default_benefits' => [
        'free' => ['max_products' => 5, 'commission_bps' => 500, 'max_upload_bytes' => 1073741824],
        'pro' => ['max_products' => null, 'commission_bps' => 0, 'max_upload_bytes' => 26843545600],
    ],
];
