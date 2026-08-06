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

    // HOMEPAGE APPEARANCE
    [
        'name' => 'homepage.type',
        'value' => 'landingPage',
    ],
    [
        'name' => 'landingPage',
        'value' => json_encode([
            'sections' => [
                [
                    'name' => 'hero-split-with-screenshot',
                    'badge' => 'Short links · Link in bio · QR codes',
                    'title' => 'Every link you share, built to convert',
                    'description' =>
                        'Shorten URLs, launch beautiful link-in-bio pages, and track every click — all from one dashboard. Branded domains, deep analytics, and tools your whole team can use.',
                    'showSearchBarSlot' => true,
                    'image' => [
                        'src' => 'images/landing/links.webp',
                        'width' => 2432,
                        'height' => 1442,
                    ],
                ],

                [
                    'name' => 'features-grid',
                    'badge' => 'Everything in one place',
                    'title' => 'Links that work harder for you',
                    'description' =>
                        "Whether you're sharing one campaign link or building a full link-in-bio, BeLink gives you the tools to create, brand, and measure every touchpoint.",
                    'maxColumns' => 3,
                    'iconsOnTop' => true,
                    'mutedBg' => true,
                    'features' => [
                        [
                            'icon' => 'links',
                            'title' => 'Branded short links',
                            'description' =>
                                'Create memorable short URLs with custom back-halves, folders, and your own domain — so every link looks like you.',
                        ],
                        [
                            'icon' => 'biolinks',
                            'title' => 'Link-in-bio pages',
                            'description' =>
                                'Build a mobile-first page that houses all your content, social profiles, and CTAs in one shareable link.',
                        ],
                        [
                            'icon' => 'insights',
                            'title' => 'Click analytics',
                            'description' =>
                                "See what's working with real-time click data, device and location breakdowns, and insights across all your links.",
                        ],
                    ],
                ],

                [
                    'name' => 'feature-with-screenshot',
                    'badge' => 'Short links',
                    'title' => 'Short URLs with serious control',
                    'description' =>
                        'Go beyond basic shortening. Customize every link, organize campaigns in folders, and route visitors with smart rules — without leaving your dashboard.',
                    'alignLeft' => false,
                    'wrapIconsInBg' => true,
                    'imageSize' => 'lg',
                    'image' => [
                        'src' => 'images/landing/new-link.webp',
                        'width' => 2432,
                        'height' => 1442,
                    ],
                    'features' => [
                        [
                            'icon' => 'back_half',
                            'title' => 'Custom back-halves',
                            'description' =>
                                'Choose short, readable slugs that match your brand and are easy to say out loud.',
                        ],
                        [
                            'icon' => 'settings',
                            'title' => 'Link types & splash pages',
                            'description' =>
                                'Send visitors straight through, show a branded splash page, or use a custom link page before they arrive.',
                        ],
                        [
                            'icon' => 'retargeting',
                            'title' => 'Retargeting rules',
                            'description' =>
                                'Route clicks by device, location, or platform so the right audience always lands in the right place.',
                        ],
                    ],
                ],

                [
                    'name' => 'feature-with-screenshot',
                    'badge' => 'Link in bio',
                    'title' => 'One link for everything you share',
                    'description' =>
                        'Replace a messy list of links with a polished page that reflects your brand. Add buttons, images, embeds, and more — then update it anytime.',
                    'alignLeft' => true,
                    'wrapIconsInBg' => true,
                    'imageSize' => 'lg',
                    'image' => [
                        'src' => 'images/landing/biolink.webp',
                        'width' => 2432,
                        'height' => 1442,
                    ],
                    'features' => [
                        [
                            'icon' => 'drag-handle',
                            'title' => 'Drag-and-drop editor',
                            'description' =>
                                'Arrange widgets, pin important links, and preview your page on mobile before you publish.',
                        ],
                        [
                            'icon' => 'brand',
                            'title' => 'Fully on-brand',
                            'description' =>
                                'Custom colors, fonts, and layouts — plus optional custom domains so your bio link matches your website.',
                        ],
                        [
                            'icon' => 'insights',
                            'title' => 'Track bio page views',
                            'description' =>
                                'Measure profile visits and link clicks to learn what your audience actually engages with.',
                        ],
                    ],
                ],

                [
                    'name' => 'feature-with-screenshot',
                    'badge' => 'QR codes',
                    'title' => 'Turn any link into a scannable code',
                    'description' =>
                        'Generate QR codes for short links and link-in-bio pages in one click. Download, print, and track scans alongside your other link analytics.',
                    'alignLeft' => false,
                    'wrapIconsInBg' => true,
                    'imageSize' => 'lg',
                    'image' => [
                        'src' => 'images/landing/qr-codes.webp',
                        'width' => 2432,
                        'height' => 1442,
                    ],
                    'features' => [
                        [
                            'icon' => 'fast',
                            'title' => 'Instant generation',
                            'description' =>
                                'Create a QR code for any short link or biolink the moment you need it — no extra tools or exports required.',
                        ],
                        [
                            'icon' => 'date',
                            'title' => 'Always up to date',
                            'description' =>
                                'Point a printed code at a link you control. Update the destination anytime without reprinting the QR code.',
                        ],
                        [
                            'icon' => 'insights',
                            'title' => 'Track every scan',
                            'description' =>
                                'See how often your codes get scanned, alongside clicks and visits from the rest of your BeLink dashboard.',
                        ],
                    ],
                ],

                [
                    'name' => 'features-grid',
                    'badge' => 'Built for growth',
                    'title' => 'The toolkit serious marketers expect',
                    'description' =>
                        'From solo creators to growing teams, BeLink scales with the features you need to manage links at volume.',
                    'maxColumns' => 3,
                    'iconsOnTop' => true,
                    'features' => [
                        [
                            'icon' => 'custom-domains',
                            'title' => 'Custom domains',
                            'description' =>
                                'Connect your own domain and serve short links from your brand — not ours.',
                        ],
                        [
                            'icon' => 'folders',
                            'title' => 'Folders & workspaces',
                            'description' =>
                                'Organize links by client or campaign, and collaborate with teammates under shared workspaces.',
                        ],
                        [
                            'icon' => 'pixels',
                            'title' => 'Tracking pixels',
                            'description' =>
                                'Fire Facebook, Google, and other pixels on link clicks to keep ad attribution accurate.',
                        ],
                        [
                            'icon' => 'link-overlays',
                            'title' => 'CTA overlays',
                            'description' =>
                                'Add promotional banners and calls-to-action on top of any destination page.',
                        ],
                        [
                            'icon' => 'link-pages',
                            'title' => 'Link pages',
                            'description' =>
                                'Build lightweight landing pages for campaigns without sending traffic off-platform first.',
                        ],
                        [
                            'icon' => 'api',
                            'title' => 'API & webhooks',
                            'description' =>
                                'Automate link creation and get notified when links are clicked — integrate BeLink into your stack.',
                        ],
                    ],
                ],

                [
                    'name' => 'stats',
                ],

                [
                    'name' => 'pricing',
                    'title' => 'Plans that grow with your links',
                    'description' =>
                        'Start free and upgrade when you need more links, clicks, custom domains, or team seats. Switch between monthly and yearly billing anytime.',
                ],

                [
                    'name' => 'cta-simple-centered',
                    'title' => 'Start sharing smarter links today',
                    'description' =>
                        'Create your first short link or link-in-bio page in minutes. No credit card required to get started.',
                    'buttons' => [
                        [
                            'label' => 'Create free account',
                            'action' => '/register',
                            'type' => 'route',
                            'variant' => 'default',
                            'color' => 'primary',
                        ],
                    ],
                ],

                [
                    'name' => 'footer',
                ],
            ],
        ]),
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
                        'label' => 'Short links',
                        'action' => '/dashboard/links',
                        'id' => 723,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'QR codes',
                        'action' => '/dashboard/qr-codes',
                        'id' => 891,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Link in bio',
                        'action' => '/dashboard/biolinks',
                        'id' => 239,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Digital Products',
                        'action' => '/dashboard/my-products',
                        'id' => 'digital-products-dashboard',
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Insights',
                        'action' => '/dashboard/insights',
                        'id' => 318,
                    ],
                ],
            ],
            [
                'name' => 'Dashboard secondary',
                'id' => 'a02',
                'positions' => ['dashboard-secondary'],
                'items' => [
                    [
                        'type' => 'route',
                        'label' => 'Folders',
                        'action' => '/dashboard/folders',
                        'id' => 586,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Custom domains',
                        'action' => '/dashboard/custom-domains',
                        'id' => 444,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'CTA overlays',
                        'action' => '/dashboard/link-overlays',
                        'id' => 184,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Tracking pixels',
                        'action' => '/dashboard/pixels',
                        'id' => 303,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Link pages',
                        'action' => '/dashboard/link-pages',
                        'id' => 637,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Sales & Payouts',
                        'action' => '/dashboard/sales-payouts',
                        'id' => 'sales-payouts-dashboard',
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
                        'label' => 'Links',
                        'action' => '/dashboard/links',
                        'id' => 723,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Link in bio',
                        'action' => '/dashboard/biolinks',
                        'id' => 239,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'QR codes',
                        'action' => '/dashboard/qr-codes',
                        'id' => 721,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Insights',
                        'action' => '/dashboard/insights',
                        'id' => 318,
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
                        'label' => 'Roles',
                        'action' => '/admin/roles',
                        'type' => 'route',
                        'id' => 'mwdkf0',
                        'permissions' => ['roles.update'],
                    ],

                    [
                        'type' => 'route',
                        'label' => 'Links',
                        'action' => '/admin/links',
                        'id' => 7234,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Biolinks',
                        'action' => '/admin/biolinks',
                        'id' => 2394,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Folders',
                        'action' => '/admin/folders',
                        'id' => 5864,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Branded domains',
                        'action' => '/admin/custom-domains',
                        'id' => 4441,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'CTA overlays',
                        'action' => '/admin/link-overlays',
                        'id' => 18411,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Link pages',
                        'action' => '/admin/link-pages',
                        'id' => 312113,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Tracking pixels',
                        'action' => '/admin/pixels',
                        'id' => 303113,
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
                    [
                        'label' => 'Digital Products',
                        'action' => '/admin/digital-products',
                        'type' => 'route',
                        'id' => 'digital-products-admin',
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
];
