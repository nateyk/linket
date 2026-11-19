<?php

return [
    'log_failures' => false,
    'service' => 'maxmind_database',
    'cache_tags' => [],
    // The MaxMind database must be downloaded on each persistent deployment
    // with php artisan geoip:update and a configured MAXMIND_LICENSE_KEY.
    'services' => [
        'maxmind_database' => [
            'class' => \Torann\GeoIP\Services\MaxMindDatabase::class,
            'database_path' => storage_path('app/geoip.mmdb'),
            'update_url' => sprintf(
                'https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=%s&suffix=tar.gz',
                env('MAXMIND_LICENSE_KEY', '')
            ),
            'locales' => ['en'],
        ],
    ],
    // Comma-separated trusted ingress proxy IPs/CIDRs. CF-IPCountry is
    // ignored unless the direct TCP peer is in this allowlist.
    'country_header_proxies' => env('GEOIP_TRUSTED_COUNTRY_PROXIES', ''),
    'default_location' => [
        'iso_code' => null,
        'country' => null,
        'city' => null,
        'state' => null,
        'state_name' => null,
        'postal_code' => null,
        'lat' => null,
        'lon' => null,
        'timezone' => config('app.timezone'),
        'continent' => null,
    ],
];
