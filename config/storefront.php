<?php

return [
    'currency' => env('STOREFRONT_CURRENCY', 'etb'),
    'download_days' => 7,
    'download_limit' => 10,
    'allowed_extensions' => [
        'pdf', 'zip', 'epub', 'mp3', 'wav', 'm4a', 'mp4', 'mov', 'png', 'jpg',
        'jpeg', 'webp', 'gif', 'svg', 'ttf', 'otf', 'woff', 'woff2', 'txt', 'csv',
    ],
    'default_benefits' => [
        'free' => ['max_products' => 7, 'commission_bps' => 1000, 'max_upload_bytes' => 104857600],
        'pro' => ['max_products' => 50, 'commission_bps' => 500, 'max_upload_bytes' => 524288000],
        'business' => ['max_products' => null, 'commission_bps' => 200, 'max_upload_bytes' => 2147483648],
    ],
];
