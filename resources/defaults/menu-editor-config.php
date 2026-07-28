<?php

return [
    'positions' => [
        [
            'name' => 'dashboard-navbar',
            'label' => 'Dashboard navbar',
            'route' => '/dashboard/links',
        ],
        [
            'name' => 'dashboard-primary',
            'label' => 'Dashboard primary',
            'route' => '/dashboard/links',
        ],
        [
            'name' => 'dashboard-secondary',
            'label' => 'Dashboard secondary',
            'route' => '/dashboard/links',
        ],
        [
            'name' => 'dashboard-mobile',
            'label' => 'Dashboard mobile',
            'route' => '/dashboard/links',
        ],
        [
            'name' => 'footer',
            'label' => 'Footer',
            'route' => '/',
        ],
        [
            'name' => 'footer-secondary',
            'label' => 'Footer secondary',
            'route' => '/',
        ],
        [
            'name' => 'homepage-navbar',
            'label' => 'Homepage navbar',
            'route' => '/',
        ],
        [
            'name' => 'link-page-navbar',
            'label' => 'Link page navbar',
            'route' => '/',
        ],
    ],
    'available_routes' => [
        '/dashboard/links',
        '/dashboard/qr-codes',
        '/dashboard/insights',
        '/dashboard/folders',
        '/dashboard/custom-domains',
        '/dashboard/link-overlays',
        '/dashboard/link-pages',
        '/dashboard/pixels',
    ],
];
