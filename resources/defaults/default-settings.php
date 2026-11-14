<?php

return [
    // logos
    [
        'name' => 'branding.logo_dark',
        'value' => 'images/logo-dark.svg',
    ],
    [
        'name' => 'branding.logo_light',
        'value' => 'images/logo-light.svg',
    ],
    [
        'name' => 'branding.logo_dark_mobile',
        'value' => 'images/mobile-logo-dark.svg',
    ],
    [
        'name' => 'branding.logo_light_mobile',
        'value' => 'images/mobile-logo-light.svg',
    ],

    // LINKS
    ['name' => 'links.default_type', 'value' => 'direct'],
    ['name' => 'links.enable_type', 'value' => true],
    ['name' => 'links.redirect_time', 'value' => 10],
    ['name' => 'links.retargeting', 'value' => true],
    ['name' => 'links.pixels', 'value' => true],
    ['name' => 'links.homepage_stats', 'value' => true],
    ['name' => 'links.back_half_min', 'value' => 5],
    ['name' => 'links.back_half_max', 'value' => 10],
    ['name' => 'links.min_len', 'value' => 3],
    ['name' => 'links.max_len', 'value' => 1000],
    ['name' => 'links.back_half_content', 'value' => 'alpha_dash'],
    ['name' => 'biolink.show_branding', 'value' => true],
    ['name' => 'store.show_branding', 'value' => true],

    // HELP CENTER (BeDesk-native public HC)
    [
        'name' => 'hcLanding',
        'value' => json_encode([
            'header' => [
                'variant' => 'colorful',
                'title' => 'How can we help you?',
                'subtitle' => 'Ask Questions. Browse Articles. Find Answers.',
                'placeholder' => 'Enter your question or keyword here',
                'background' => 'images/hc-header-pattern.svg',
                'backgroundSize' => 'cover',
                'backgroundRepeat' => 'no-repeat',
                'backgroundPosition' => 'center top',
            ],
            'content' => [
                'variant' => 'articleGrid',
            ],
            'articles_per_category' => 5,
            'children_per_category' => 6,
            'hide_small_categories' => false,
            'show_footer' => false,
        ]),
    ],

    // HOMEPAGE APPEARANCE
    [
        'name' => 'homepage.type',
        'value' => 'landingPage',
    ],
    [
        'name' => 'landingPage',
        'value' => file_get_contents(resource_path('defaults/creator-homepage.json')),
    ],

    // menus
    [
        'name' => 'menus',
        'value' => json_encode([
            [
                'name' => 'Dashboard primary',
                'id' => 'a01',
                'positions' => ['dashboard-primary'],
                'items' => [
                    [
                        'type' => 'route',
                        'label' => 'Home',
                        'action' => '/dashboard',
                        'id' => 'dashboard-home',
                    ],
                    [
                        'type' => 'route',
                        'label' => 'My Store',
                        'action' => '/dashboard/stores',
                        'id' => 239,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'My Items',
                        'action' => '/dashboard/items',
                        'id' => 'digital-products-dashboard',
                    ],
                    [
                        'type' => 'route',
                        'label' => 'My Services',
                        'action' => '/dashboard/services',
                        'id' => 'creator-services-dashboard',
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Orders & Sales',
                        'action' => '/dashboard/orders',
                        'id' => 'sales-payouts-dashboard',
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Insights',
                        'action' => '/dashboard/insights',
                        'id' => 318,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Tracking pixels',
                        'action' => '/dashboard/pixels',
                        'id' => 303,
                    ],
                ],
            ],
            [
                'name' => 'Dashboard secondary',
                'id' => 'a02',
                'positions' => ['dashboard-secondary'],
                'items' => [],
            ],
            [
                'name' => 'Agent dashboard sidebar',
                'id' => 'agent-dashboard-sidebar',
                'positions' => ['dashboard-sidebar'],
                'items' => [
                    [
                        'type' => 'route',
                        'label' => 'Conversations',
                        'action' => '/agent/conversations?viewId=mine',
                        'id' => 'agent-nav-conversations',
                        'permissions' => ['conversations.update'],
                        'order' => 0,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Team',
                        'action' => '/agent/team',
                        'id' => 'agent-nav-team',
                        'permissions' => ['agents.update'],
                        'order' => 1,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Customers',
                        'action' => '/agent/customers',
                        'id' => 'agent-nav-customers',
                        'permissions' => ['users.update'],
                        'order' => 2,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Campaigns',
                        'action' => '/agent/campaigns',
                        'id' => 'agent-nav-campaigns',
                        'permissions' => ['campaigns.update'],
                        'order' => 3,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Help center',
                        'action' => '/agent/hc/arrange',
                        'id' => 'agent-nav-hc',
                        'permissions' => ['articles.update'],
                        'order' => 4,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'AI Agent',
                        'action' => '/agent/ai-agent/settings',
                        'id' => 'agent-nav-ai-agents',
                        'permissions' => ['conversations.update'],
                        'order' => 5,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Reports',
                        'action' => '/agent/reports',
                        'id' => 'agent-nav-reports',
                        'permissions' => ['reports.view'],
                        'order' => 6,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Saved replies',
                        'action' => '/agent/saved-replies',
                        'id' => 'agent-nav-saved-replies',
                        'permissions' => ['canned_replies.update'],
                        'order' => 7,
                    ],
                ],
            ],
            [
                'name' => 'Dashboard mobile',
                'id' => 'a03',
                'positions' => ['dashboard-mobile'],
                'items' => [
                    [
                        'type' => 'route',
                        'label' => 'Home',
                        'action' => '/dashboard',
                        'id' => 'dashboard-home-mobile',
                    ],
                    [
                        'type' => 'route',
                        'label' => 'My Items',
                        'action' => '/dashboard/items',
                        'id' => 'digital-products-mobile',
                    ],
                    [
                        'type' => 'route',
                        'label' => 'My Services',
                        'action' => '/dashboard/services',
                        'id' => 'creator-services-mobile',
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Orders & Sales',
                        'action' => '/dashboard/orders',
                        'id' => 'sales-payouts-mobile',
                    ],
                ],
            ],
            [
                'name' => 'Footer',
                'id' => 'a04',
                'positions' => ['footer'],
                'items' => [
                    [
                        'type' => 'url',
                        'id' => 'c1sf2g',
                        'position' => 1,
                        'label' => 'Developers',
                        'action' => env('APP_URL') . '/api-docs',
                        'condition' => 'auth',
                        'permissions' => ['api.access'],
                    ],
                    [
                        'type' => 'route',
                        'id' => 'rlz27v',
                        'position' => 2,
                        'label' => 'Privacy Policy',
                        'action' => '/pages/privacy-policy',
                    ],
                    [
                        'type' => 'route',
                        'id' => 'p80pvk',
                        'position' => 3,
                        'label' => 'Terms of Service',
                        'action' => '/pages/terms-of-service',
                    ],
                    [
                        'type' => 'route',
                        'id' => 'q8dtht',
                        'position' => 4,
                        'label' => 'Contact Us',
                        'action' => '/contact',
                    ],
                ],
            ],
            [
                'name' => 'Footer Social',
                'id' => 'a05',
                'positions' => ['footer-secondary'],
                'items' => [
                    [
                        'type' => 'link',
                        'id' => '6j747e',
                        'position' => 1,
                        'icon' => 'facebook',
                        'action' => 'https://facebook.com',
                    ],
                    [
                        'type' => 'link',
                        'id' => 'jo96zw',
                        'position' => 2,
                        'icon' => 'twitter',
                        'action' => 'https://twitter.com',
                    ],
                    [
                        'type' => 'link',
                        'id' => '57dsea',
                        'position' => 3,
                        'icon' => 'instagram',
                        'action' => 'https://instagram.com',
                        [
                            'type' => 'link',
                            'id' => 'lzntr2',
                            'position' => 4,
                            'icon' => 'youtube',
                            'action' => 'https://youtube.com',
                        ],
                    ],
                ],
            ],
            [
                'name' => 'Auth Dropdown',
                'id' => 'a06',
                'items' => [
                    [
                        'label' => 'Admin area',
                        'id' => 'upm1rv',
                        'action' => '/admin/insights',
                        'type' => 'route',
                        'permissions' => ['admin.access'],
                    ],
                    [
                        'label' => 'Dashboard',
                        'id' => 'ehj0uk',
                        'action' => '/dashboard',
                        'type' => 'route',
                    ],
                    [
                        'label' => 'Account settings',
                        'id' => '6a89z5',
                        'action' => '/account-settings',
                        'type' => 'route',
                    ],
                ],
                'positions' => ['auth-dropdown'],
            ],
            [
                'name' => 'Admin Sidebar',
                'id' => 'a07',
                'items' => [
                    [
                        'label' => 'Insights',
                        'id' => '886nz4',
                        'action' => '/admin/insights',
                        'type' => 'route',
                        'condition' => 'admin',
                        'role' => 1,
                        'permissions' => ['admin.access'],
                        'roles' => [],
                    ],
                    [
                        'label' => 'Settings',
                        'id' => 'x5k484',
                        'action' => '/admin/settings',
                        'type' => 'route',
                        'permissions' => ['settings.update'],
                    ],
                    [
                        'label' => 'Help center',
                        'id' => 'admin-help-center',
                        'action' => '/admin/help',
                        'type' => 'route',
                        'permissions' => ['articles.update'],
                    ],
                    [
                        'label' => 'Blog',
                        'id' => 'admin-blog',
                        'action' => '/admin/blog',
                        'type' => 'route',
                        'permissions' => ['settings.update'],
                    ],
                    [
                        'label' => 'Service categories',
                        'id' => 'admin-service-categories',
                        'action' => '/admin/service-categories',
                        'type' => 'route',
                        'permissions' => ['settings.update'],
                    ],
                    [
                        'label' => 'Plans',
                        'id' => '7o42rt',
                        'action' => '/admin/plans',
                        'type' => 'route',
                        'permissions' => ['plans.update'],
                    ],
                    [
                        'label' => 'Subscriptions',
                        'action' => '/admin/subscriptions',
                        'type' => 'route',
                        'id' => 'sdcb5a',
                        'condition' => 'admin',
                        'permissions' => ['subscriptions.update'],
                    ],
                    [
                        'label' => 'Users',
                        'action' => '/admin/users',
                        'type' => 'route',
                        'id' => 'fzfb45',
                        'permissions' => ['users.update'],
                    ],
                    [
                        'label' => 'Creators',
                        'action' => '/admin/creators',
                        'type' => 'route',
                        'id' => 'admin-creators',
                        'permissions' => ['users.update'],
                    ],
                    [
                        'label' => 'Roles',
                        'action' => '/admin/roles',
                        'type' => 'route',
                        'id' => 'mwdkf0',
                        'permissions' => ['roles.update'],
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Items',
                        'action' => '/admin/items',
                        'id' => 'digital-products-admin',
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Withdrawals',
                        'action' => '/admin/withdrawals',
                        'id' => 'admin-withdrawals',
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Payment Activity',
                        'action' => '/admin/payment-activity',
                        'id' => 'admin-payment-activity',
                    ],
                    [
                        'type' => 'route',
                        'label' => 'KYC Verifications',
                        'action' => '/admin/kyc-verifications',
                        'id' => 'admin-kyc-verifications',
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Payment Gateways',
                        'action' => '/admin/financial/payment-gateways',
                        'id' => 'admin-payment-gateways',
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Receiving accounts',
                        'action' => '/admin/financial/withdrawal-methods',
                        'id' => 'admin-withdrawal-methods',
                    ],
                    [
                        'label' => 'Custom pages',
                        'action' => '/admin/custom-pages',
                        'type' => 'route',
                        'id' => '63bwv9',
                        'permissions' => ['custom_pages.update'],
                    ],
                    [
                        'label' => 'Files',
                        'action' => '/admin/files',
                        'type' => 'route',
                        'id' => 'vguvti',
                        'permissions' => ['files.update'],
                    ],
                    [
                        'label' => 'Translations',
                        'action' => '/admin/localizations',
                        'type' => 'route',
                        'id' => 'w91yql',
                        'permissions' => ['localizations.update'],
                    ],
                    [
                        'label' => 'Logs',
                        'action' => '/admin/logs',
                        'type' => 'route',
                        'id' => '8j435f',
                    ],
                ],
                'positions' => ['admin-sidebar'],
            ],
            [
                'name' => 'Homepage navbar',
                'id' => 'a08',
                'positions' => ['homepage-navbar'],
                'items' => [
                    [
                        'type' => 'link',
                        'label' => 'Features',
                        'action' => '#features',
                        'id' => 19041,
                    ],
                    [
                        'type' => 'link',
                        'label' => 'Pricing',
                        'action' => '#pricing',
                        'id' => 190456,
                    ],
                ],
            ],
        ]),
    ],

    // custom domains
    ['name' => 'custom_domains.allow_select', 'value' => true],

    // KYC verification
    ['name' => 'kyc.enabled', 'value' => true],
    ['name' => 'kyc.selfie_verification', 'value' => true],

    // storefront
    ['name' => 'storefront.reviews_enabled', 'value' => true],

    // product policy (min/max default to unlimited, free products allowed)
    ['name' => 'product.allow_free_products', 'value' => true],

    // product review policy (fail closed: new and updated products need review)
    ['name' => 'product.adding_requires_review', 'value' => true],
    ['name' => 'product.updating_requires_review', 'value' => true],
    ['name' => 'product.convert_covers_to_webp', 'value' => true],
];
